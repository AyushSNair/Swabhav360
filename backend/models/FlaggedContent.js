import mongoose from 'mongoose';

const flaggedContentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    enum: ['mood_entry', 'daily_activity', 'journal_entry', 'comment', 'other'],
    required: true
  },
  originalContent: {
    type: String,
    required: true
  },
  flaggedReason: {
    type: String,
    enum: ['self_harm', 'violence', 'inappropriate_language', 'bullying', 'mental_health_crisis', 'other'],
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'false_positive'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: String,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
flaggedContentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient querying
flaggedContentSchema.index({ status: 1, createdAt: -1 });
flaggedContentSchema.index({ severity: 1, status: 1 });

const FlaggedContent = mongoose.model('FlaggedContent', flaggedContentSchema);

export default FlaggedContent; 