// const mongoose = require('mongoose');

// const emailSchema = new mongoose.Schema({
//   emailId: String,
//   subject: String,
//   status: String // 'sent' or 'seen'
// });

// module.exports = mongoose.model('Email', emailSchema);

const mongoose = require('mongoose');

// Schema for tracking pixel views
const TrackingPixelViewSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  recipientEmail: { type: String, required: true },
  userAgent: { type: String, default: 'unknown' },
  ipAddress: { type: String, default: 'unknown' }
}, { _id: false });

// Main Email Schema
const EmailSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  messageId: { type: String, required: true, index: true },
  threadId: { type: String, index: true },
  gmailMessageId: { type: String },

  to: [{ type: String, required: true }],
  cc: [{ type: String }],
  bcc: [{ type: String }],
  subject: { type: String, required: true, maxlength: 500 },

  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'bounced', 'failed'],
    default: 'sent',
    index: true
  },

  sentAt: { type: Date, default: Date.now, index: true },
  deliveredAt: { type: Date },
  lastReadAt: { type: Date, index: true },
  readCount: { type: Number, default: 0, min: 0 },

  trackingPixelViews: [TrackingPixelViewSchema],

  metadata: {
    originalMessageSize: Number,
    attachmentCount: { type: Number, default: 0 },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    category: { type: String, default: 'general' },
    tags: [String]
  },

  trackingEnabled: { type: Boolean, default: true },
  pixelTrackingEnabled: { type: Boolean, default: true },

  metrics: {
    timeToFirstRead: Number,
    avgTimeBetweenReads: Number,
    deviceTypes: [String],
    locations: [String]
  }

}, {
  timestamps: true,
  collection: 'tracked_emails'
});

// Compound indexes
EmailSchema.index({ userId: 1, messageId: 1 }, { unique: true });
EmailSchema.index({ userId: 1, status: 1 });
EmailSchema.index({ userId: 1, sentAt: -1 });
EmailSchema.index({ userId: 1, lastReadAt: -1 });
EmailSchema.index({ userId: 1, 'to': 1 });

// Virtual fields
EmailSchema.virtual('readRate').get(function () {
  return this.readCount > 0 ? 100 : 0;
});

EmailSchema.virtual('timeToFirstRead').get(function () {
  if (this.lastReadAt && this.sentAt) {
    return this.lastReadAt.getTime() - this.sentAt.getTime();
  }
  return null;
});

EmailSchema.virtual('isRead').get(function () {
  return this.status === 'read' || this.readCount > 0;
});

// Pre-save middleware
EmailSchema.pre('save', function (next) {
  if (!this.metrics) this.metrics = {};

  // Compute time to first read
  if (
    this.isModified('lastReadAt') &&
    this.lastReadAt &&
    this.sentAt &&
    !this.metrics.timeToFirstRead
  ) {
    this.metrics.timeToFirstRead = this.lastReadAt.getTime() - this.sentAt.getTime();
  }

  // Auto-update status
  if (this.readCount > 0 && this.status === 'sent') {
    this.status = 'read';
  }

  next();
});

// Static: Get user stats over X days
EmailSchema.statics.getUserStats = async function (userId, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  const stats = await this.aggregate([
    { $match: { userId, sentAt: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        totalEmails: { $sum: 1 },
        readEmails: { $sum: { $cond: [{ $gt: ['$readCount', 0] }, 1, 0] } },
        totalReads: { $sum: '$readCount' },
        avgTimeToRead: {
          $avg: {
            $cond: [
              { $gt: ['$metrics.timeToFirstRead', 0] },
              '$metrics.timeToFirstRead',
              null
            ]
          }
        }
      }
    }
  ]);

  return stats[0] || {
    totalEmails: 0,
    readEmails: 0,
    totalReads: 0,
    avgTimeToRead: 0
  };
};

// Static: Get daily stats
EmailSchema.statics.getDailyActivity = async function (userId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.aggregate([
    { $match: { userId, sentAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$sentAt' }
        },
        sent: { $sum: 1 },
        read: { $sum: { $cond: [{ $gt: ['$readCount', 0] }, 1, 0] } }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
};

// Instance: Add pixel view
EmailSchema.methods.addPixelView = function (recipientEmail, userAgent, ipAddress) {
  this.trackingPixelViews.push({
    timestamp: new Date(),
    recipientEmail: recipientEmail || 'unknown',
    userAgent: userAgent || 'unknown',
    ipAddress: ipAddress || 'unknown'
  });

  this.readCount += 1;
  this.lastReadAt = new Date();
  this.status = 'read';

  if (!this.metrics) this.metrics = {};
  return this.save();
};

// Instance: Mark as read
EmailSchema.methods.markAsRead = function (readAt = new Date()) {
  this.readCount += 1;
  this.lastReadAt = readAt;
  this.status = 'read';

  if (!this.metrics) this.metrics = {};
  return this.save();
};

module.exports = mongoose.model('Email', EmailSchema);
