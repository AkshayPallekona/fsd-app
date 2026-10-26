const express = require('express');
const { body, param } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
const Favorite = require('../models/Favorite');
const Inquiry = require('../models/Inquiry');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const ApiResponse = require('../utils/apiResponse');
const { cancelSeekerInquiry } = require('../services/inquiry.service');

const router = express.Router();

const objectIdParam = (paramName) =>
  param(paramName)
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage(`Invalid ${paramName} identifier.`);

// GET /api/v1/users/me - Get current user profile
router.get('/me', authenticate, (req, res) => {
  return ApiResponse.success(res, { user: req.user.toJSON() }, 'User profile retrieved.', 200);
});

// PATCH /api/v1/users/me - Update user profile (Name, phone only)
router.patch(
  '/me',
  authenticate,
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters.'),
    body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone cannot exceed 20 characters.')
  ],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return ApiResponse.error(res, 'USER_NOT_FOUND', 'User not found.', 404);
      }

      // Security: Strictly allowlist editable fields. Role, status, email cannot be changed here.
      if (req.body.name !== undefined) {
        user.name = req.body.name;
      }
      if (req.body.phone !== undefined) {
        user.phone = req.body.phone;
      }

      await user.save();

      return ApiResponse.success(res, { user: user.toJSON() }, 'Profile updated successfully.', 200);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/users/me/favorites - List user favorites
router.get('/me/favorites', authenticate, async (req, res, next) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'property',
        select: 'title publicId price purpose propertyType city locality images status availability owner',
        populate: {
          path: 'owner',
          select: 'name createdAt'
        }
      });

    const items = favorites.map((fav) => {
      const prop = fav.property;
      const isUnavailable =
        !prop || prop.status !== 'published' || prop.availability?.isAvailable === false;

      return {
        _id: fav._id,
        createdAt: fav.createdAt,
        isUnavailable,
        property: prop || null
      };
    });

    return ApiResponse.success(res, { items }, 'Favorites retrieved.', 200);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/users/me/inquiries - List seeker's inquiries
router.get('/me/inquiries', authenticate, async (req, res, next) => {
  try {
    const inquiries = await Inquiry.find({ seeker: req.user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'property',
        select: 'title publicId price purpose propertyType city locality images status'
      })
      .populate('owner', 'name');

    return ApiResponse.success(res, { items: inquiries }, 'Inquiries retrieved.', 200);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/users/me/inquiries/:id/cancel - Seeker cancel inquiry
router.patch(
  '/me/inquiries/:id/cancel',
  authenticate,
  [objectIdParam('id')],
  validate,
  async (req, res, next) => {
    try {
      const inquiry = await cancelSeekerInquiry(req.params.id, req.user._id);
      return ApiResponse.success(res, { inquiry }, 'Inquiry cancelled successfully.', 200);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/users/me/properties - List owner's properties
router.get('/me/properties', authenticate, async (req, res, next) => {
  try {
    const properties = await Property.find({
      owner: req.user._id,
      status: { $ne: 'archived' }
    }).sort({ createdAt: -1 });

    return ApiResponse.success(res, { items: properties }, 'User properties retrieved.', 200);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
