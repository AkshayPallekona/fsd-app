const express = require('express');
const { query, body, param } = require('express-validator');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const Inquiry = require('../models/Inquiry');
const Favorite = require('../models/Favorite');
const upload = require('../middleware/upload');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roles');
const { validate } = require('../middleware/validator');
const ApiResponse = require('../utils/apiResponse');
const { escapeRegex } = require('../utils/regexEscape');
const {
  transitionPropertyStatus,
  sanitizePublicProperty
} = require('../services/property.service');
const { uploadImage, deleteImage, cleanupImages } = require('../services/image.service');
const { ROLES } = require('../constants/roles');
const {
  PROPERTY_TYPES,
  PROPERTY_PURPOSES,
  FURNISHING_TYPES,
  AREA_UNITS,
  ALLOWED_AMENITIES
} = require('../constants/property');
const { MODERATION_REQUIRED } = require('../config/env');

const router = express.Router();

const KEY_MODERATION_FIELDS = [
  'title',
  'description',
  'price',
  'propertyType',
  'purpose',
  'address',
  'locality',
  'city',
  'state',
  'postalCode'
];

// Reusable validator for ObjectId params
const objectIdParam = (paramName) =>
  param(paramName)
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage(`Invalid ${paramName} identifier.`);

// ==========================================
// 1. PUBLIC ROUTES
// ==========================================

// GET /api/v1/properties - Search and list published properties
router.get(
  '/',
  [
    query('q').optional().trim(),
    query('city').optional().trim(),
    query('locality').optional().trim(),
    query('propertyType').optional().isIn(PROPERTY_TYPES),
    query('purpose').optional().isIn(PROPERTY_PURPOSES),
    query('furnishing').optional().isIn(FURNISHING_TYPES),
    query('minPrice').optional().isInt({ min: 0 }).withMessage('minPrice must be non-negative.'),
    query('maxPrice').optional().isInt({ min: 0 }).withMessage('maxPrice must be non-negative.'),
    query('bedrooms').optional().isInt({ min: 0 }).withMessage('bedrooms must be non-negative.'),
    query('bathrooms').optional().isInt({ min: 0 }).withMessage('bathrooms must be non-negative.'),
    query('minArea').optional().isInt({ min: 0 }).withMessage('minArea must be non-negative.'),
    query('maxArea').optional().isInt({ min: 0 }).withMessage('maxArea must be non-negative.'),
    query('sort').optional().isIn(['newest', 'price_asc', 'price_desc']),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.')
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        q,
        city,
        locality,
        propertyType,
        purpose,
        furnishing,
        minPrice,
        maxPrice,
        bedrooms,
        bathrooms,
        minArea,
        maxArea,
        amenities,
        sort = 'newest',
        page = 1,
        limit = 12
      } = req.query;

      // Price range validation
      if (minPrice !== undefined && maxPrice !== undefined && Number(minPrice) > Number(maxPrice)) {
        return ApiResponse.error(res, 'INVALID_FILTER', 'minPrice cannot be greater than maxPrice.', 400);
      }

      // Area range validation
      if (minArea !== undefined && maxArea !== undefined && Number(minArea) > Number(maxArea)) {
        return ApiResponse.error(res, 'INVALID_FILTER', 'minArea cannot be greater than maxArea.', 400);
      }

      const filter = { status: 'published' };

      if (city) {
        filter.city = { $regex: new RegExp(`^${escapeRegex(city)}$`, 'i') };
      }

      if (locality) {
        filter.locality = { $regex: new RegExp(escapeRegex(locality), 'i') };
      }

      if (propertyType) {
        filter.propertyType = propertyType;
      }

      if (purpose) {
        filter.purpose = purpose;
      }

      if (furnishing) {
        filter.furnishing = furnishing;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        filter.price = {};
        if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
        if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
      }

      if (bedrooms !== undefined) {
        filter.bedrooms = { $gte: Number(bedrooms) };
      }

      if (bathrooms !== undefined) {
        filter.bathrooms = { $gte: Number(bathrooms) };
      }

      if (minArea !== undefined || maxArea !== undefined) {
        filter.area = {};
        if (minArea !== undefined) filter.area.$gte = Number(minArea);
        if (maxArea !== undefined) filter.area.$lte = Number(maxArea);
      }

      if (amenities) {
        const amenitiesList = Array.isArray(amenities)
          ? amenities
          : amenities.split(',').map((a) => a.trim());
        const validAmenities = amenitiesList.filter((a) => ALLOWED_AMENITIES.includes(a));
        if (validAmenities.length > 0) {
          filter.amenities = { $all: validAmenities };
        }
      }

      // Search query using text index or escaped regex
      if (q && q.trim()) {
        const escaped = escapeRegex(q.trim());
        filter.$or = [
          { title: { $regex: new RegExp(escaped, 'i') } },
          { description: { $regex: new RegExp(escaped, 'i') } },
          { locality: { $regex: new RegExp(escaped, 'i') } },
          { city: { $regex: new RegExp(escaped, 'i') } }
        ];
      }

      // Sorting
      let sortOptions = { createdAt: -1 };
      if (sort === 'price_asc') {
        sortOptions = { price: 1 };
      } else if (sort === 'price_desc') {
        sortOptions = { price: -1 };
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const [items, total] = await Promise.all([
        Property.find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .populate('owner', 'name createdAt'),
        Property.countDocuments(filter)
      ]);

      const sanitizedItems = items.map(sanitizePublicProperty);

      return ApiResponse.success(
        res,
        {
          items: sanitizedItems,
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1
        },
        'Properties fetched successfully.'
      );
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/properties/featured - Top featured published properties
router.get('/featured', async (req, res, next) => {
  try {
    const featured = await Property.find({ status: 'published' })
      .sort({ price: -1, createdAt: -1 })
      .limit(6)
      .populate('owner', 'name createdAt');

    return ApiResponse.success(
      res,
      { items: featured.map(sanitizePublicProperty) },
      'Featured properties retrieved.'
    );
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/properties/recent - Recently published properties
router.get('/recent', async (req, res, next) => {
  try {
    const recent = await Property.find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('owner', 'name createdAt');

    return ApiResponse.success(
      res,
      { items: recent.map(sanitizePublicProperty) },
      'Recent properties retrieved.'
    );
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/properties/:id - Detailed view
router.get(
  '/:id',
  [objectIdParam('id')],
  validate,
  optionalAuth,
  async (req, res, next) => {
    try {
      const property = await Property.findById(req.params.id).populate('owner', 'name createdAt email phone');
      if (!property) {
        return ApiResponse.error(res, 'PROPERTY_NOT_FOUND', 'Property not found.', 404);
      }

      const isOwner = req.user && property.owner._id.toString() === req.user._id.toString();
      const isAdmin = req.user && req.user.role === ROLES.ADMIN;

      // If not published, only owner or admin can view
      if (property.status !== 'published' && !isOwner && !isAdmin) {
        return ApiResponse.error(res, 'PROPERTY_NOT_FOUND', 'Property not found.', 404);
      }

      if (isOwner || isAdmin) {
        return ApiResponse.success(res, { property }, 'Property retrieved.');
      }

      // Public view: sanitized
      return ApiResponse.success(
        res,
        { property: sanitizePublicProperty(property) },
        'Property retrieved.'
      );
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/properties/:id/similar - Similar published properties in the same city or type
router.get(
  '/:id/similar',
  [objectIdParam('id')],
  validate,
  async (req, res, next) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return ApiResponse.error(res, 'PROPERTY_NOT_FOUND', 'Property not found.', 404);
      }

      const similar = await Property.find({
        _id: { $ne: property._id },
        status: 'published',
        $or: [
          { city: property.city },
          { propertyType: property.propertyType, purpose: property.purpose }
        ]
      })
        .limit(4)
        .populate('owner', 'name createdAt');

      return ApiResponse.success(
        res,
        { items: similar.map(sanitizePublicProperty) },
        'Similar properties retrieved.'
      );
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// 2. OWNER / AGENT PROTECTED ROUTES
// ==========================================

const propertyCreateUpdateValidators = [
  body('title').trim().isLength({ min: 5, max: 120 }).withMessage('Title must be 5-120 characters.'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 3000 })
    .withMessage('Description must be 20-3000 characters.'),
  body('propertyType').isIn(PROPERTY_TYPES).withMessage(`Invalid propertyType. Must be one of: ${PROPERTY_TYPES.join(', ')}`),
  body('purpose').isIn(PROPERTY_PURPOSES).withMessage('Purpose must be rent or sale.'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be greater than or equal to 0.'),
  body('deposit').optional().isFloat({ min: 0 }).withMessage('Deposit must be greater than or equal to 0.'),
  body('bedrooms').optional().isInt({ min: 0 }).withMessage('Bedrooms cannot be negative.'),
  body('bathrooms').optional().isInt({ min: 0 }).withMessage('Bathrooms cannot be negative.'),
  body('area').isFloat({ min: 1 }).withMessage('Area must be at least 1.'),
  body('areaUnit').optional().isIn(AREA_UNITS).withMessage(`areaUnit must be ${AREA_UNITS.join(' or ')}.`),
  body('furnishing').optional().isIn(FURNISHING_TYPES).withMessage(`furnishing must be one of: ${FURNISHING_TYPES.join(', ')}.`),
  body('amenities').optional().isArray().withMessage('Amenities must be an array.'),
  body('amenities.*').optional().isIn(ALLOWED_AMENITIES).withMessage('Invalid amenity in list.'),
  body('address').trim().notEmpty().withMessage('Address is required.'),
  body('locality').trim().notEmpty().withMessage('Locality is required.'),
  body('city').trim().notEmpty().withMessage('City is required.'),
  body('state').trim().notEmpty().withMessage('State is required.'),
  body('postalCode').trim().notEmpty().withMessage('Postal code is required.'),
  body('coordinates.lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90.'),
  body('coordinates.lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180.')
];

// POST /api/v1/properties - Create listing (Owner/Admin)
router.post(
  '/',
  authenticate,
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  propertyCreateUpdateValidators,
  validate,
  async (req, res, next) => {
    try {
      const allowedFields = [
        'title',
        'description',
        'propertyType',
        'purpose',
        'price',
        'deposit',
        'bedrooms',
        'bathrooms',
        'area',
        'areaUnit',
        'furnishing',
        'amenities',
        'address',
        'locality',
        'city',
        'state',
        'postalCode',
        'coordinates'
      ];

      const propertyData = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          propertyData[field] = req.body[field];
        }
      }

      // Security: Owner is always req.user._id, status starts as draft
      propertyData.owner = req.user._id;
      propertyData.status = 'draft';
      propertyData.images = [];

      const property = new Property(propertyData);
      await property.save();

      return ApiResponse.success(res, { property }, 'Property created successfully.', 201);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/properties/:id - Edit listing
router.patch(
  '/:id',
  authenticate,
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  [objectIdParam('id')],
  propertyCreateUpdateValidators.map((v) => v.optional()),
  validate,
  async (req, res, next) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return ApiResponse.error(res, 'PROPERTY_NOT_FOUND', 'Property not found.', 404);
      }

      const isOwner = property.owner.toString() === req.user._id.toString();
      const isAdmin = req.user.role === ROLES.ADMIN;

      if (!isOwner && !isAdmin) {
        return ApiResponse.error(res, 'FORBIDDEN', 'You do not own this listing.', 403);
      }

      if (property.status === 'archived' && !isAdmin) {
        return ApiResponse.error(res, 'FORBIDDEN', 'Archived listings cannot be edited.', 403);
      }

      const allowedFields = [
        'title',
        'description',
        'propertyType',
        'purpose',
        'price',
        'deposit',
        'bedrooms',
        'bathrooms',
        'area',
        'areaUnit',
        'furnishing',
        'amenities',
        'address',
        'locality',
        'city',
        'state',
        'postalCode',
        'coordinates'
      ];

      let changedKeyField = false;
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          if (KEY_MODERATION_FIELDS.includes(field) && property[field] !== req.body[field]) {
            changedKeyField = true;
          }
          property[field] = req.body[field];
        }
      }

      // If rejected, editing allows transition back to draft
      if (property.status === 'rejected') {
        property.status = 'draft';
      } else if (property.status === 'published' && changedKeyField && MODERATION_REQUIRED && !isAdmin) {
        // Editing a published listing's key fields re-triggers moderation
        property.status = 'pending_review';
        property.moderation = {
          status: 'pending',
          note: 'Key fields updated by owner; pending re-moderation'
        };
      }

      await property.save();

      return ApiResponse.success(res, { property }, 'Property updated successfully.', 200);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/properties/:id - Soft archive listing
router.delete(
  '/:id',
  authenticate,
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  [objectIdParam('id')],
  validate,
  async (req, res, next) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return ApiResponse.error(res, 'PROPERTY_NOT_FOUND', 'Property not found.', 404);
      }

      const isOwner = property.owner.toString() === req.user._id.toString();
      const isAdmin = req.user.role === ROLES.ADMIN;

      if (!isOwner && !isAdmin) {
        return ApiResponse.error(res, 'FORBIDDEN', 'You do not own this listing.', 403);
      }

      await transitionPropertyStatus(property, 'archived', req.user);

      return ApiResponse.success(res, null, 'Property archived successfully.', 200);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/properties/:id/publish - Request publish
router.post(
  '/:id/publish',
  authenticate,
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  [objectIdParam('id')],
  validate,
  async (req, res, next) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return ApiResponse.error(res, 'PROPERTY_NOT_FOUND', 'Property not found.', 404);
      }

      await transitionPropertyStatus(property, 'published', req.user);

      const message = property.status === 'pending_review'
        ? 'Listing submitted for admin moderation review.'
        : 'Listing published successfully.';

      return ApiResponse.success(res, { property }, message, 200);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/properties/:id/unpublish - Unpublish listing
router.post(
  '/:id/unpublish',
  authenticate,
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  [objectIdParam('id')],
  validate,
  async (req, res, next) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return ApiResponse.error(res, 'PROPERTY_NOT_FOUND', 'Property not found.', 404);
      }

      await transitionPropertyStatus(property, 'unpublished', req.user);

      return ApiResponse.success(res, { property }, 'Listing unpublished successfully.', 200);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/properties/:id/availability - Update availability or mark rented/sold
router.patch(
  '/:id/availability',
  authenticate,
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  [
    objectIdParam('id'),
    body('isAvailable').optional().isBoolean().withMessage('isAvailable must be boolean.'),
    body('availableFrom').optional().isISO8601().withMessage('availableFrom must be a valid date.'),
    body('status').optional().isIn(['published', 'rented', 'sold']).withMessage('Invalid status transition.')
  ],
  validate,
  async (req, res, next) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return ApiResponse.error(res, 'PROPERTY_NOT_FOUND', 'Property not found.', 404);
      }

      const isOwner = property.owner.toString() === req.user._id.toString();
      const isAdmin = req.user.role === ROLES.ADMIN;
      if (!isOwner && !isAdmin) {
        return ApiResponse.error(res, 'FORBIDDEN', 'You do not own this listing.', 403);
      }

      if (req.body.status) {
        await transitionPropertyStatus(property, req.body.status, req.user);
      }

      if (req.body.isAvailable !== undefined) {
        property.availability.isAvailable = req.body.isAvailable;
      }
      if (req.body.availableFrom) {
        property.availability.availableFrom = new Date(req.body.availableFrom);
      }

      await property.save();

      return ApiResponse.success(res, { property }, 'Availability updated successfully.', 200);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/properties/:id/stats - Owner statistics for a listing
router.get(
  '/:id/stats',
  authenticate,
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  [objectIdParam('id')],
  validate,
  async (req, res, next) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return ApiResponse.error(res, 'PROPERTY_NOT_FOUND', 'Property not found.', 404);
      }

      const isOwner = property.owner.toString() === req.user._id.toString();
      const isAdmin = req.user.role === ROLES.ADMIN;
      if (!isOwner && !isAdmin) {
        return ApiResponse.error(res, 'FORBIDDEN', 'You do not own this listing.', 403);
      }

      const [inquiriesCount, viewingsCount, favoritesCount] = await Promise.all([
        Inquiry.countDocuments({ property: property._id, type: 'inquiry' }),
        Inquiry.countDocuments({ property: property._id, type: 'viewing' }),
        Favorite.countDocuments({ property: property._id })
      ]);

      return ApiResponse.success(
        res,
        {
          stats: {
            inquiriesCount,
            viewingsCount,
            favoritesCount,
            status: property.status
          }
        },
        'Property statistics retrieved.'
      );
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/properties/:id/images - Upload images for listing
router.post(
  '/:id/images',
  authenticate,
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  [objectIdParam('id')],
  validate,
  upload.array('images', 10),
  async (req, res, next) => {
    const uploadedImages = [];
    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return ApiResponse.error(res, 'PROPERTY_NOT_FOUND', 'Property not found.', 404);
      }

      const isOwner = property.owner.toString() === req.user._id.toString();
      const isAdmin = req.user.role === ROLES.ADMIN;
      if (!isOwner && !isAdmin) {
        return ApiResponse.error(res, 'FORBIDDEN', 'You do not own this listing.', 403);
      }

      if (!req.files || req.files.length === 0) {
        return ApiResponse.error(res, 'NO_FILES', 'No image files provided.', 400);
      }

      if (property.images.length + req.files.length > 10) {
        return ApiResponse.error(
          res,
          'MAX_IMAGES_EXCEEDED',
          `Cannot upload ${req.files.length} images. Maximum allowed total is 10 images.`,
          400
        );
      }

      for (const file of req.files) {
        const uploaded = await uploadImage(file.buffer);
        uploadedImages.push(uploaded);
      }

      const startOrder = property.images.length;
      uploadedImages.forEach((img, idx) => {
        property.images.push({
          url: img.url,
          publicId: img.publicId,
          order: startOrder + idx
        });
      });

      await property.save();

      return ApiResponse.success(res, { images: property.images }, 'Images uploaded successfully.', 201);
    } catch (error) {
      // Cleanup any uploaded images if DB write or processing failed
      if (uploadedImages.length > 0) {
        await cleanupImages(uploadedImages);
      }
      next(error);
    }
  }
);

// DELETE /api/v1/properties/:id/images/:imageId - Delete image from listing
router.delete(
  '/:id/images/:imageId',
  authenticate,
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  [objectIdParam('id'), objectIdParam('imageId')],
  validate,
  async (req, res, next) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) {
        return ApiResponse.error(res, 'PROPERTY_NOT_FOUND', 'Property not found.', 404);
      }

      const isOwner = property.owner.toString() === req.user._id.toString();
      const isAdmin = req.user.role === ROLES.ADMIN;
      if (!isOwner && !isAdmin) {
        return ApiResponse.error(res, 'FORBIDDEN', 'You do not own this listing.', 403);
      }

      const image = property.images.id(req.params.imageId);
      if (!image) {
        return ApiResponse.error(res, 'IMAGE_NOT_FOUND', 'Image not found on this listing.', 404);
      }

      const publicId = image.publicId;
      image.deleteOne();

      // If listing was published and this was the last image, it cannot remain published
      if (property.status === 'published' && property.images.length === 0) {
        property.status = 'draft';
      }

      await property.save();
      await deleteImage(publicId);

      return ApiResponse.success(res, { images: property.images }, 'Image deleted successfully.', 200);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
