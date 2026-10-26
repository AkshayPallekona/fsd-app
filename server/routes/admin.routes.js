const express = require('express');
const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
const Inquiry = require('../models/Inquiry');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roles');
const { validate } = require('../middleware/validator');
const ApiResponse = require('../utils/apiResponse');
const { logAdminAction } = require('../services/audit.service');
const { transitionPropertyStatus } = require('../services/property.service');
const { ROLES } = require('../constants/roles');

const router = express.Router();

const objectIdParam = (paramName) =>
  param(paramName)
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage(`Invalid ${paramName} identifier.`);

// Protect all admin routes
router.use(authenticate, authorizeRoles(ROLES.ADMIN));

// GET /api/v1/admin/dashboard - Portal overview statistics
router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalSeekers,
      totalOwners,
      suspendedUsers,
      totalProperties,
      pendingReviewProperties,
      publishedProperties,
      rentedProperties,
      soldProperties,
      totalInquiries,
      pendingReports
    ] = await Promise.all([
      User.countDocuments({ status: { $ne: 'deleted' } }),
      User.countDocuments({ role: ROLES.SEEKER }),
      User.countDocuments({ role: ROLES.OWNER }),
      User.countDocuments({ status: 'suspended' }),
      Property.countDocuments({ status: { $ne: 'archived' } }),
      Property.countDocuments({ status: 'pending_review' }),
      Property.countDocuments({ status: 'published' }),
      Property.countDocuments({ status: 'rented' }),
      Property.countDocuments({ status: 'sold' }),
      Inquiry.countDocuments(),
      Report.countDocuments({ status: { $in: ['pending', 'reviewed'] } })
    ]);

    return ApiResponse.success(
      res,
      {
        stats: {
          users: {
            total: totalUsers,
            seekers: totalSeekers,
            owners: totalOwners,
            suspended: suspendedUsers
          },
          properties: {
            total: totalProperties,
            pendingReview: pendingReviewProperties,
            published: publishedProperties,
            rented: rentedProperties,
            sold: soldProperties
          },
          inquiries: {
            total: totalInquiries
          },
          reports: {
            pending: pendingReports
          }
        }
      },
      'Dashboard stats retrieved.',
      200
    );
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/users - List users
router.get(
  '/users',
  [
    query('role').optional().isIn([ROLES.SEEKER, ROLES.OWNER, ROLES.ADMIN]),
    query('status').optional().isIn(['active', 'suspended', 'deleted']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  async (req, res, next) => {
    try {
      const { role, status, page = 1, limit = 20 } = req.query;
      const filter = {};
      if (role) filter.role = role;
      if (status) filter.status = status;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        User.countDocuments(filter)
      ]);

      return ApiResponse.success(
        res,
        {
          items: users.map((u) => u.toJSON()),
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1
        },
        'Users retrieved.',
        200
      );
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/admin/users/:id/status - Suspend or reactivate user
router.patch(
  '/users/:id/status',
  [
    objectIdParam('id'),
    body('status').isIn(['active', 'suspended']).withMessage('Status must be active or suspended.')
  ],
  validate,
  async (req, res, next) => {
    try {
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) {
        return ApiResponse.error(res, 'USER_NOT_FOUND', 'User not found.', 404);
      }

      // Rule: Admins cannot suspend themselves or other admins
      if (req.body.status === 'suspended') {
        if (targetUser._id.toString() === req.user._id.toString()) {
          return ApiResponse.error(
            res,
            'CANNOT_SUSPEND_SELF',
            'Administrators cannot suspend their own account.',
            403
          );
        }
        if (targetUser.role === ROLES.ADMIN) {
          return ApiResponse.error(
            res,
            'CANNOT_SUSPEND_ADMIN',
            'Administrators cannot suspend other administrators.',
            403
          );
        }
      }

      const previousStatus = targetUser.status;
      targetUser.status = req.body.status;
      if (req.body.status === 'suspended') {
        targetUser.tokenVersion += 1; // Invalidate current sessions immediately
      }
      await targetUser.save();

      await logAdminAction({
        adminId: req.user._id,
        action: req.body.status === 'suspended' ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
        targetType: 'User',
        targetId: targetUser._id,
        details: { previousStatus, newStatus: req.body.status, userEmail: targetUser.email },
        ip: req.ip
      });

      return ApiResponse.success(
        res,
        { user: targetUser.toJSON() },
        `User status updated to ${req.body.status}.`,
        200
      );
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/admin/properties - List all properties with admin moderation data
router.get(
  '/properties',
  [
    query('status').optional().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  async (req, res, next) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const filter = {};
      if (status) filter.status = status;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const [properties, total] = await Promise.all([
        Property.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate('owner', 'name email createdAt status'),
        Property.countDocuments(filter)
      ]);

      return ApiResponse.success(
        res,
        {
          items: properties,
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1
        },
        'Properties retrieved.',
        200
      );
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/admin/properties/:id/moderation - Review listing (approve/reject)
router.patch(
  '/properties/:id/moderation',
  [
    objectIdParam('id'),
    body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected.'),
    body('note').optional().trim()
  ],
  validate,
  async (req, res, next) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return ApiResponse.error(res, 'PROPERTY_NOT_FOUND', 'Property not found.', 404);
      }

      const targetStatus = req.body.status === 'approved' ? 'published' : 'rejected';
      await transitionPropertyStatus(property, targetStatus, req.user, {
        note: req.body.note
      });

      await logAdminAction({
        adminId: req.user._id,
        action: `LISTING_${req.body.status.toUpperCase()}`,
        targetType: 'Property',
        targetId: property._id,
        details: { status: targetStatus, note: req.body.note, title: property.title },
        ip: req.ip
      });

      return ApiResponse.success(
        res,
        { property },
        `Listing ${req.body.status} successfully.`,
        200
      );
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/admin/properties/:id - Admin remove prohibited listing
router.delete(
  '/properties/:id',
  [objectIdParam('id')],
  validate,
  async (req, res, next) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return ApiResponse.error(res, 'PROPERTY_NOT_FOUND', 'Property not found.', 404);
      }

      await transitionPropertyStatus(property, 'archived', req.user);

      await logAdminAction({
        adminId: req.user._id,
        action: 'LISTING_REMOVED_PROHIBITED',
        targetType: 'Property',
        targetId: property._id,
        details: { title: property.title },
        ip: req.ip
      });

      return ApiResponse.success(res, null, 'Listing removed and archived by admin.', 200);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/admin/audit-logs - Audit log viewer
router.get(
  '/audit-logs',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  async (req, res, next) => {
    try {
      const pageNum = parseInt(req.query.page || 1, 10);
      const limitNum = parseInt(req.query.limit || 25, 10);
      const skip = (pageNum - 1) * limitNum;

      const [logs, total] = await Promise.all([
        AuditLog.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate('admin', 'name email role'),
        AuditLog.countDocuments()
      ]);

      return ApiResponse.success(
        res,
        {
          items: logs,
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1
        },
        'Audit logs retrieved.',
        200
      );
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
