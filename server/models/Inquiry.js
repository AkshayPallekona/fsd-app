const mongoose = require('mongoose');
const { INQUIRY_TYPES, INQUIRY_STATUSES } = require('../constants/inquiry');

const inquirySchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true
    },
    seeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: INQUIRY_TYPES,
      default: 'inquiry',
      required: true
    },
    message: {
      type: String,
      required: [true, 'Inquiry message is required'],
      trim: true,
      minlength: [5, 'Message must be at least 5 characters long'],
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    viewingDate: {
      type: Date,
      // Required for viewings
      validate: {
        validator: function (val) {
          if (this.type === 'viewing') {
            return val instanceof Date && !isNaN(val) && val > new Date();
          }
          return true;
        },
        message: 'Viewing requires a valid future date and time.'
      }
    },
    status: {
      type: String,
      enum: INQUIRY_STATUSES,
      default: 'pending',
      index: true
    },
    responseMessage: {
      type: String,
      trim: true,
      maxlength: [1000, 'Response message cannot exceed 1000 characters']
    }
  },
  {
    timestamps: true
  }
);

// Compound index to help query conflict checks
inquirySchema.index({ property: 1, status: 1, viewingDate: 1 });

const Inquiry = mongoose.model('Inquiry', inquirySchema);

module.exports = Inquiry;
