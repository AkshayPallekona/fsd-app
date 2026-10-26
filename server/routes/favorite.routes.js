const express = require('express');
const { param } = require('express-validator');
const mongoose = require('mongoose');
const Favorite = require('../models/Favorite');
const Property = require('../models/Property');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const ApiResponse = require('../utils/apiResponse');

const router = express.Router({ mergeParams: true });

const objectIdParam = (paramName) =>
  param(paramName)
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage(`Invalid ${paramName} identifier.`);

// POST /api/v1/properties/:id/favorite
router.post(
  '/:id/favorite',
  authenticate,
  [objectIdParam('id')],
  validate,
  async (req, res, next) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property || property.status === 'archived') {
        return ApiResponse.error(res, 'PROPERTY_NOT_FOUND', 'Property not found.', 404);
      }

      const existing = await Favorite.findOne({
        user: req.user._id,
        property: property._id
      });

      if (existing) {
        return ApiResponse.error(
          res,
          'DUPLICATE_FAVORITE',
          'Property is already in your favorites.',
          409
        );
      }

      const favorite = await Favorite.create({
        user: req.user._id,
        property: property._id
      });

      return ApiResponse.success(res, { favorite }, 'Property added to favorites.', 201);
    } catch (error) {
      if (error.code === 11000) {
        return ApiResponse.error(
          res,
          'DUPLICATE_FAVORITE',
          'Property is already in your favorites.',
          409
        );
      }
      next(error);
    }
  }
);

// DELETE /api/v1/properties/:id/favorite
router.delete(
  '/:id/favorite',
  authenticate,
  [objectIdParam('id')],
  validate,
  async (req, res, next) => {
    try {
      const result = await Favorite.findOneAndDelete({
        user: req.user._id,
        property: req.params.id
      });

      if (!result) {
        return ApiResponse.error(
          res,
          'FAVORITE_NOT_FOUND',
          'Property was not in your favorites.',
          404
        );
      }

      return ApiResponse.success(res, null, 'Property removed from favorites.', 200);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
