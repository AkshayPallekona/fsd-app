const { MODERATION_REQUIRED } = require('../config/env');
const { ROLES } = require('../constants/roles');

/**
 * Validate that a property has all required elements to be published
 */
function validatePublishable(property) {
  const errors = [];
  if (!property.images || property.images.length === 0) {
    errors.push('Listing must have at least one uploaded image to be published.');
  }
  if (!property.price || property.price <= 0) {
    errors.push('Listing must have a valid price greater than 0.');
  }
  if (
    !property.address ||
    !property.locality ||
    !property.city ||
    !property.state ||
    !property.postalCode
  ) {
    errors.push('Listing must have a complete address (address, locality, city, state, postal code).');
  }

  if (errors.length > 0) {
    const error = new Error(`Cannot publish property: ${errors.join(' ')}`);
    error.statusCode = 400;
    error.code = 'NOT_PUBLISHABLE';
    throw error;
  }
}

/**
 * Enforce allowed status transitions in a single service function
 *
 * Transitions:
 * draft -> pending_review (if MODERATION_REQUIRED) or published (if not)
 * pending_review -> published | rejected (admin only)
 * rejected -> draft (owner edits)
 * published -> unpublished | rented (rent only) | sold (sale only) | archived
 * unpublished -> published (or pending_review if MODERATION_REQUIRED) | archived
 * rented/sold -> published (or pending_review if MODERATION_REQUIRED) | archived
 * archived is terminal, except an admin can restore it (e.g. to draft or unpublished)
 */
async function transitionPropertyStatus(property, targetStatus, user, options = {}) {
  const currentStatus = property.status;
  const isAdmin = user.role === ROLES.ADMIN;
  const isOwner = property.owner.toString() === user._id.toString();

  if (!isAdmin && !isOwner) {
    const error = new Error('You do not have permission to change this property status.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // Handle publishing transition logic
  if (targetStatus === 'published') {
    // If moderation is required and not admin approving, target becomes pending_review
    if (MODERATION_REQUIRED && !isAdmin) {
      targetStatus = 'pending_review';
    } else {
      validatePublishable(property);
    }
  }

  // Check valid transitions
  if (currentStatus === 'draft') {
    if (targetStatus === 'pending_review' || targetStatus === 'published') {
      validatePublishable(property);
    } else if (targetStatus === 'archived') {
      // Allowed soft delete
    } else {
      throwInvalidTransition(currentStatus, targetStatus);
    }
  } else if (currentStatus === 'pending_review') {
    if (!isAdmin) {
      const error = new Error('Only administrators can review pending listings.');
      error.statusCode = 403;
      error.code = 'ADMIN_ONLY';
      throw error;
    }
    if (targetStatus === 'published') {
      validatePublishable(property);
      property.moderation = {
        status: 'approved',
        note: options.note || 'Approved by admin',
        reviewedBy: user._id,
        reviewedAt: new Date()
      };
    } else if (targetStatus === 'rejected') {
      property.moderation = {
        status: 'rejected',
        note: options.note || 'Rejected by admin',
        reviewedBy: user._id,
        reviewedAt: new Date()
      };
    } else {
      throwInvalidTransition(currentStatus, targetStatus);
    }
  } else if (currentStatus === 'rejected') {
    if (targetStatus === 'draft' || targetStatus === 'archived') {
      // Owner edits rejected listing back to draft
    } else {
      throwInvalidTransition(currentStatus, targetStatus);
    }
  } else if (currentStatus === 'published') {
    if (targetStatus === 'unpublished') {
      // Allowed
    } else if (targetStatus === 'rented') {
      if (property.purpose !== 'rent') {
        const err = new Error('Only rental listings can be marked as rented.');
        err.statusCode = 400;
        err.code = 'INVALID_TRANSITION';
        throw err;
      }
    } else if (targetStatus === 'sold') {
      if (property.purpose !== 'sale') {
        const err = new Error('Only sale listings can be marked as sold.');
        err.statusCode = 400;
        err.code = 'INVALID_TRANSITION';
        throw err;
      }
    } else if (targetStatus === 'archived') {
      // Soft archive
    } else {
      throwInvalidTransition(currentStatus, targetStatus);
    }
  } else if (currentStatus === 'unpublished') {
    if (targetStatus === 'published' || targetStatus === 'pending_review') {
      validatePublishable(property);
    } else if (targetStatus === 'archived') {
      // Soft archive
    } else {
      throwInvalidTransition(currentStatus, targetStatus);
    }
  } else if (currentStatus === 'rented' || currentStatus === 'sold') {
    if (targetStatus === 'published' || targetStatus === 'pending_review') {
      validatePublishable(property);
      property.availability.isAvailable = true;
    } else if (targetStatus === 'archived') {
      // Soft archive
    } else {
      throwInvalidTransition(currentStatus, targetStatus);
    }
  } else if (currentStatus === 'archived') {
    if (!isAdmin) {
      const error = new Error('Archived listings cannot be altered except by an administrator.');
      error.statusCode = 403;
      error.code = 'ARCHIVED_IMMUTABLE';
      throw error;
    }
    // Admin restore
    if (!['draft', 'unpublished', 'published'].includes(targetStatus)) {
      throwInvalidTransition(currentStatus, targetStatus);
    }
  }

  property.status = targetStatus;
  await property.save();
  return property;
}

function throwInvalidTransition(from, to) {
  const error = new Error(`Invalid status transition from "${from}" to "${to}".`);
  error.statusCode = 400;
  error.code = 'INVALID_STATUS_TRANSITION';
  throw error;
}

/**
 * Format property for public view:
 * Exposes only owner's name and member-since date (createdAt).
 * Never exposes owner's email, phone, or moderation notes.
 */
function sanitizePublicProperty(propertyDoc) {
  const obj = propertyDoc.toObject ? propertyDoc.toObject() : { ...propertyDoc };
  if (obj.owner && typeof obj.owner === 'object') {
    obj.owner = {
      _id: obj.owner._id,
      name: obj.owner.name,
      createdAt: obj.owner.createdAt
    };
  }
  delete obj.moderation;
  return obj;
}

module.exports = {
  validatePublishable,
  transitionPropertyStatus,
  sanitizePublicProperty
};
