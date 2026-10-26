const express = require('express');
const { body, param } = require('express-validator');
const mongoose = require('mongoose');
const Inquiry = require('../models/Inquiry');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roles');
const { validate } = require('../middleware/validator');
const ApiResponse = require('../utils/apiResponse');
const { createInquiry, updateOwnerInquiryStatus } = require('../services/inquiry.service');
const { ROLES } = require('../constants/roles');
const { INQUIRY_TYPES } = require('../constants/inquiry');

const router = express.Router({ mergeParams: true });

const objectIdParam = (paramName) =>
  param(paramName)
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage(`Invalid ${paramName} identifier.`);

// POST /api/v1/properties/:id/inquiries - Submit an inquiry or viewing request
router.post(
  '/:id/inquiries',
  authenticate,
  [
    objectIdParam('id'),
    body('type').optional().isIn(INQUIRY_TYPES).withMessage(`Type must be one of: ${INQUIRY_TYPES.join(', ')}`),
    body('message').trim().isLength({ min: 5, max: 1000 }).withMessage('Message must be 5-1000 characters.'),
    body('viewingDate').optional().isISO8601().withMessage('Viewing date must be a valid ISO8601 date string.')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { type = 'inquiry', message, viewingDate } = req.body;
      const inquiry = await createInquiry({
        propertyId: req.params.id,
        seekerId: req.user._id,
        type,
        message,
        viewingDate
      });

      return ApiResponse.success(res, { inquiry }, 'Inquiry submitted successfully.', 201);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/owner/inquiries - List inquiries received by the owner
router.get(
  '/owner/inquiries',
  authenticate,
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const filter = req.user.role === ROLES.ADMIN ? {} : { owner: req.user._id };
      const inquiries = await Inquiry.find(filter)
        .sort({ createdAt: -1 })
        .populate({
          path: 'property',
          select: 'title publicId price purpose propertyType city locality images'
        })
        .populate('seeker', 'name createdAt');

      return ApiResponse.success(res, { items: inquiries }, 'Owner inquiries retrieved.', 200);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/owner/inquiries/:id - Detail of an inquiry
router.get(
  '/owner/inquiries/:id',
  authenticate,
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  [objectIdParam('id')],
  validate,
  async (req, res, next) => {
    try {
      const inquiry = await Inquiry.findById(req.params.id)
        .populate({
          path: 'property',
          select: 'title publicId price purpose propertyType city locality images status'
        })
        .populate('seeker', 'name createdAt');

      if (!inquiry) {
        return ApiResponse.error(res, 'INQUIRY_NOT_FOUND', 'Inquiry not found.', 404);
      }

      if (
        req.user.role !== ROLES.ADMIN &&
        inquiry.owner.toString() !== req.user._id.toString()
      ) {
        return ApiResponse.error(res, 'FORBIDDEN', 'You do not have access to this inquiry.', 403);
      }

      return ApiResponse.success(res, { inquiry }, 'Inquiry detail retrieved.', 200);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/owner/inquiries/:id/status - Update inquiry status (accept/reject/complete)
router.patch(
  '/owner/inquiries/:id/status',
  authenticate,
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  [
    objectIdParam('id'),
    body('status').isIn(['accepted', 'rejected', 'completed']).withMessage('Invalid target status.'),
    body('responseMessage').optional().trim().isLength({ max: 1000 }).withMessage('Response message cannot exceed 1000 characters.')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { status, responseMessage } = req.body;
      const inquiry = await updateOwnerInquiryStatus(
        req.params.id,
        req.user,
        status,
        responseMessage
      );

      return ApiResponse.success(res, { inquiry }, `Inquiry status updated to ${status}.`, 200);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
