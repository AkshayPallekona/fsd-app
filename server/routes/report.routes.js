const express = require('express');
const { body, param } = require('express-validator');
const mongoose = require('mongoose');
const Report = require('../models/Report');
const Property = require('../models/Property');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roles');
const { validate } = require('../middleware/validator');
const ApiResponse = require('../utils/apiResponse');
const { logAdminAction } = require('../services/audit.service');
const { ROLES } = require('../constants/roles');

const router = express.Router({ mergeParams: true });

const objectIdParam = (paramName) =>
  param(paramName)
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage(`Invalid ${paramName} identifier.`);

// POST /api/v1/properties/:id/reports - Seeker reports a property
router.post(
  '/:id/reports',
  authenticate,
  [
    objectIdParam('id'),
    body('reason').isIn([
      'misleading_info',
      'fraud_or_scam',
      'prohibited_listing',
      'unavailable_property',
      'inappropriate_content',
      'other'
    ]).withMessage('Invalid report reason.'),
    body('details').trim().isLength({ min: 10, max: 1500 }).withMessage('Details must be between 10 and 1500 characters.')
  ],
  validate,
  async (req, res, next) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return ApiResponse.error(res, 'PROPERTY_NOT_FOUND', 'Property not found.', 404);
      }

      // Check for an existing open report from this user on this property
      const existingOpenReport = await Report.findOne({
        property: property._id,
        reporter: req.user._id,
        status: { $in: ['pending', 'reviewed'] }
      });

      if (existingOpenReport) {
        return ApiResponse.error(
          res,
          'DUPLICATE_REPORT',
          'You already have an open report pending review for this property.',
          409
        );
      }

      const report = await Report.create({
        property: property._id,
        reporter: req.user._id,
        owner: property.owner,
        reason: req.body.reason,
        details: req.body.details,
        status: 'pending'
      });

      return ApiResponse.success(res, { report }, 'Report submitted successfully.', 201);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/owner/reports - Owner views reports on their listings
router.get(
  '/owner/reports',
  authenticate,
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const filter = req.user.role === ROLES.ADMIN ? {} : { owner: req.user._id };
      const reports = await Report.find(filter)
        .sort({ createdAt: -1 })
        .populate('property', 'title publicId price address city status')
        .populate('reporter', 'name createdAt');

      return ApiResponse.success(res, { items: reports }, 'Reports retrieved.', 200);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/owner/reports/:id/response - Owner adds response to a report
router.patch(
  '/owner/reports/:id/response',
  authenticate,
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  [
    objectIdParam('id'),
    body('response').trim().isLength({ min: 5, max: 1500 }).withMessage('Response must be 5-1500 characters.')
  ],
  validate,
  async (req, res, next) => {
    try {
      const report = await Report.findById(req.params.id);
      if (!report) {
        return ApiResponse.error(res, 'REPORT_NOT_FOUND', 'Report not found.', 404);
      }

      if (
        req.user.role !== ROLES.ADMIN &&
        report.owner.toString() !== req.user._id.toString()
      ) {
        return ApiResponse.error(res, 'FORBIDDEN', 'You do not own this property report.', 403);
      }

      report.ownerResponse = req.body.response;
      report.ownerRespondedAt = new Date();
      if (report.status === 'pending') {
        report.status = 'reviewed';
      }
      await report.save();

      return ApiResponse.success(res, { report }, 'Response added to report.', 200);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/admin/reports - Admin views all reports
router.get(
  '/admin/reports',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const reports = await Report.find()
        .sort({ createdAt: -1 })
        .populate('property', 'title publicId price address city status')
        .populate('reporter', 'name email')
        .populate('owner', 'name email');

      return ApiResponse.success(res, { items: reports }, 'Admin reports retrieved.', 200);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/admin/reports/:id - Admin resolves or dismisses report
router.patch(
  '/admin/reports/:id',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  [
    objectIdParam('id'),
    body('status').isIn(['resolved', 'dismissed']).withMessage('Status must be resolved or dismissed.'),
    body('adminNotes').optional().trim()
  ],
  validate,
  async (req, res, next) => {
    try {
      const report = await Report.findById(req.params.id);
      if (!report) {
        return ApiResponse.error(res, 'REPORT_NOT_FOUND', 'Report not found.', 404);
      }

      report.status = req.body.status;
      report.adminNotes = req.body.adminNotes || '';
      report.resolvedBy = req.user._id;
      report.resolvedAt = new Date();
      await report.save();

      await logAdminAction({
        adminId: req.user._id,
        action: `REPORT_${req.body.status.toUpperCase()}`,
        targetType: 'Report',
        targetId: report._id,
        details: { status: req.body.status, adminNotes: req.body.adminNotes },
        ip: req.ip
      });

      return ApiResponse.success(res, { report }, `Report ${req.body.status} successfully.`, 200);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
