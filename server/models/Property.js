const mongoose = require('mongoose');
const crypto = require('crypto');
const {
  PROPERTY_TYPES,
  PROPERTY_PURPOSES,
  PROPERTY_STATUSES,
  FURNISHING_TYPES,
  AREA_UNITS,
  ALLOWED_AMENITIES
} = require('../constants/property');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    order: { type: Number, default: 0 }
  },
  { _id: true }
);

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters long'],
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    publicId: {
      type: String,
      unique: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters long'],
      maxlength: [3000, 'Description cannot exceed 3000 characters']
    },
    propertyType: {
      type: String,
      enum: PROPERTY_TYPES,
      required: [true, 'Property type is required']
    },
    purpose: {
      type: String,
      enum: PROPERTY_PURPOSES,
      required: [true, 'Purpose is required (rent or sale)']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    deposit: {
      type: Number,
      min: [0, 'Deposit cannot be negative'],
      default: 0
    },
    bedrooms: {
      type: Number,
      min: [0, 'Bedrooms cannot be negative'],
      default: 0
    },
    bathrooms: {
      type: Number,
      min: [0, 'Bathrooms cannot be negative'],
      default: 0
    },
    area: {
      type: Number,
      required: [true, 'Area is required'],
      min: [1, 'Area must be at least 1']
    },
    areaUnit: {
      type: String,
      enum: AREA_UNITS,
      default: 'sqft'
    },
    furnishing: {
      type: String,
      enum: FURNISHING_TYPES,
      default: 'unfurnished'
    },
    amenities: [
      {
        type: String,
        enum: ALLOWED_AMENITIES
      }
    ],
    images: [imageSchema],
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    locality: {
      type: String,
      required: [true, 'Locality is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      lowercase: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code is required'],
      trim: true
    },
    coordinates: {
      lat: {
        type: Number,
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        min: -180,
        max: 180
      }
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: PROPERTY_STATUSES,
      default: 'draft',
      index: true
    },
    availability: {
      isAvailable: { type: Boolean, default: true },
      availableFrom: { type: Date, default: Date.now }
    },
    moderation: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved'
      },
      note: { type: String, default: '', trim: true },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: { type: Date }
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to generate publicId if not set
propertySchema.pre('save', function (next) {
  if (!this.publicId) {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    this.publicId = `PROP-${randomHex}`;
  }
  next();
});

// Compound indexes for searching and filtering
propertySchema.index({ status: 1, city: 1, propertyType: 1, price: 1 });
propertySchema.index({ status: 1, purpose: 1, price: 1 });
propertySchema.index({ owner: 1, status: 1 });
propertySchema.index({ createdAt: -1 });

// Text index for full-text search
propertySchema.index(
  {
    title: 'text',
    description: 'text',
    locality: 'text',
    city: 'text'
  },
  {
    weights: {
      title: 10,
      locality: 5,
      city: 3,
      description: 1
    },
    name: 'PropertyTextSearchIndex'
  }
);

const Property = mongoose.model('Property', propertySchema);

module.exports = Property;
