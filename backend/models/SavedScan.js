const mongoose = require('mongoose');

const savedScanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HealthProfile',
    index: true,
  },
  profile_name: {
    type: String,
    trim: true,
  },
  product_name: {
    type: String,
    required: true,
    trim: true
  },
  scan_date: {
    type: Date,
    default: Date.now
  },
  analysis_result: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  overall_rating: {
    type: String,
    required: true,
    enum: ['Healthy', 'Moderately Healthy', 'Unhealthy']
  },
  nutrition_table_data: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for faster queries
savedScanSchema.index({ user: 1, scan_date: -1 });

module.exports = mongoose.model('SavedScan', savedScanSchema);

