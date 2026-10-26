const mongoose = require('mongoose');
const { REPORT_STATUSES } = require('../constants/inquiry');

const reportSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true
    },
    reporter: {
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
    reason: {
      type: String,
      required: [true, 'Report reason is required'],
      enum: [
        'misleading_info',
        'fraud_or_scam',
        'prohibited_listing',
        'unavailable_property',
        'inappropriate_content',
        'other'
      ]
    },
    details: {
      type: String,
      required: [true, 'Report details are required'],
      trim: true,
      minlength: [10, 'Details must be at least 10 characters long'],
      maxlength: [1500, 'Details cannot exceed 1500 characters']
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: 'pending',
      index: true
    },
    ownerResponse: {
      type: String,
      trim: true,
      maxlength: [1500, 'Owner response cannot exceed 1500 characters']
    },
    ownerRespondedAt: {
      type: Date
    },
    adminNotes: {
      type: String,
      trim: true
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Index to help quickly find open reports
reportSchema.index({ property: 1, reporter: 1, status: 1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
