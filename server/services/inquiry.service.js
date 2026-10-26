const Inquiry = require('../models/Inquiry');
const Property = require('../models/Property');
const { ROLES } = require('../constants/roles');

/**
 * Create a new inquiry or viewing
 */
async function createInquiry({ propertyId, seekerId, type, message, viewingDate }) {
  const property = await Property.findById(propertyId);
  if (!property) {
    const error = new Error('Property not found.');
    error.statusCode = 404;
    error.code = 'PROPERTY_NOT_FOUND';
    throw error;
  }

  // The property must be published
  if (property.status !== 'published') {
    const error = new Error('Inquiries can only be submitted for published listings.');
    error.statusCode = 400;
    error.code = 'PROPERTY_NOT_PUBLISHED';
    throw error;
  }

  // The seeker cannot be the owner
  if (property.owner.toString() === seekerId.toString()) {
    const error = new Error('Property owners cannot submit inquiries on their own listings.');
    error.statusCode = 400;
    error.code = 'CANNOT_INQUIRE_OWN_LISTING';
    throw error;
  }

  // Prevent duplicate pending inquiry from the same seeker on the same property
  const existingPending = await Inquiry.findOne({
    property: property._id,
    seeker: seekerId,
    status: 'pending'
  });

  if (existingPending) {
    const error = new Error('You already have a pending inquiry on this property.');
    error.statusCode = 409;
    error.code = 'DUPLICATE_PENDING_INQUIRY';
    throw error;
  }

  // Viewing requires a future date and time
  let parsedDate;
  if (type === 'viewing') {
    if (!viewingDate) {
      const error = new Error('Viewing date and time are required for viewings.');
      error.statusCode = 400;
      error.code = 'VIEWING_DATE_REQUIRED';
      throw error;
    }
    parsedDate = new Date(viewingDate);
    if (isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
      const error = new Error('Viewing date must be in the future.');
      error.statusCode = 400;
      error.code = 'INVALID_VIEWING_DATE';
      throw error;
    }
  }

  const inquiry = new Inquiry({
    property: property._id,
    seeker: seekerId,
    owner: property.owner,
    type,
    message,
    viewingDate: parsedDate,
    status: 'pending'
  });

  await inquiry.save();
  return inquiry;
}

/**
 * Handle Owner status transitions:
 * pending -> accepted / rejected
 * accepted -> completed
 *
 * Conflict rule: reject accepting a viewing if another accepted viewing for the same property has the same slot (±60 minutes), returning 409.
 */
async function updateOwnerInquiryStatus(inquiryId, ownerUser, newStatus, responseMessage = '') {
  const inquiry = await Inquiry.findById(inquiryId);
  if (!inquiry) {
    const error = new Error('Inquiry not found.');
    error.statusCode = 404;
    error.code = 'INQUIRY_NOT_FOUND';
    throw error;
  }

  const isOwner = inquiry.owner.toString() === ownerUser._id.toString();
  const isAdmin = ownerUser.role === ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    const error = new Error('You do not have permission to manage this inquiry.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // Check valid owner transitions
  if (inquiry.status === 'pending') {
    if (!['accepted', 'rejected'].includes(newStatus)) {
      const error = new Error('From pending, inquiries can only be accepted or rejected.');
      error.statusCode = 400;
      error.code = 'INVALID_INQUIRY_TRANSITION';
      throw error;
    }
  } else if (inquiry.status === 'accepted') {
    if (newStatus !== 'completed') {
      const error = new Error('Accepted inquiries can only be transitioned to completed.');
      error.statusCode = 400;
      error.code = 'INVALID_INQUIRY_TRANSITION';
      throw error;
    }
  } else {
    const error = new Error(`Cannot transition inquiry from ${inquiry.status} to ${newStatus}.`);
    error.statusCode = 400;
    error.code = 'INVALID_INQUIRY_TRANSITION';
    throw error;
  }

  // Slot conflict check when accepting a viewing
  if (newStatus === 'accepted' && inquiry.type === 'viewing') {
    const viewingTime = inquiry.viewingDate.getTime();
    const windowStart = new Date(viewingTime - 60 * 60 * 1000);
    const windowEnd = new Date(viewingTime + 60 * 60 * 1000);

    const conflicting = await Inquiry.findOne({
      _id: { $ne: inquiry._id },
      property: inquiry.property,
      type: 'viewing',
      status: 'accepted',
      viewingDate: {
        $gte: windowStart,
        $lte: windowEnd
      }
    });

    if (conflicting) {
      const error = new Error('Another viewing is already scheduled within ±60 minutes of this time slot.');
      error.statusCode = 409;
      error.code = 'VIEWING_SLOT_CONFLICT';
      throw error;
    }
  }

  inquiry.status = newStatus;
  if (responseMessage) {
    inquiry.responseMessage = responseMessage;
  }
  await inquiry.save();
  return inquiry;
}

/**
 * Handle Seeker status transitions:
 * Seeker: pending -> cancelled only.
 */
async function cancelSeekerInquiry(inquiryId, seekerId) {
  const inquiry = await Inquiry.findById(inquiryId);
  if (!inquiry) {
    const error = new Error('Inquiry not found.');
    error.statusCode = 404;
    error.code = 'INQUIRY_NOT_FOUND';
    throw error;
  }

  if (inquiry.seeker.toString() !== seekerId.toString()) {
    const error = new Error('You do not have permission to cancel this inquiry.');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  if (inquiry.status !== 'pending') {
    const error = new Error('Only pending inquiries can be cancelled.');
    error.statusCode = 400;
    error.code = 'INVALID_INQUIRY_TRANSITION';
    throw error;
  }

  inquiry.status = 'cancelled';
  await inquiry.save();
  return inquiry;
}

module.exports = {
  createInquiry,
  updateOwnerInquiryStatus,
  cancelSeekerInquiry
};
