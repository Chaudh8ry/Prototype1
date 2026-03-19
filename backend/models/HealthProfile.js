const mongoose = require('mongoose');

const healthProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  profile_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80
  },
  relationship: {
    type: String,
    trim: true,
    default: 'Self'
  },
  is_primary: {
    type: Boolean,
    default: false
  },
  age_group: {
    type: String,
    required: true,
    enum: ['0-11months', '1-4years', '5-9years', '10-19years', '20-39years', '40-59years', '60+years']
  },
  allergies: [{
    type: String,
    enum: ['Milk/Dairy', 'Eggs', 'Peanuts', 'Tree Nuts', 'Fish', 'Shellfish', 
           'Wheat/Gluten', 'Soy', 'Sesame', 'Sulfites', 'Other']
  }],
  custom_allergy: {
    type: String,
    trim: true,
    maxlength: 120,
    default: ''
  },
  health_conditions: [{
    category: {
      type: String,
      enum: ['undernutrition', 'micronutrientDeficiency', 'overnutrition', 'chronicDiseases', 'lifestyle', 'specialNeeds']
    },
    condition: {
      type: String,
      required: true
    }
  }],
  dietary_preferences: [{
    type: String
  }],
  additional_info: {
    type: String,
    maxlength: 2000
  },
  body_metrics: {
    height: {
      type: Number
    },
    weight: {
      type: Number
    },
    unit: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric'
    },
    bmi: {
      type: Number
    }
  },
  activity_level: {
    type: String,
    enum: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'],
    required: true
  }
}, {
  timestamps: true
});

healthProfileSchema.index({ user: 1, profile_name: 1 }, { unique: true });

module.exports = mongoose.model('HealthProfile', healthProfileSchema);

