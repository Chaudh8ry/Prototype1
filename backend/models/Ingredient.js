const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  ingredient_name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  analysis_json: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    // V2 Structure: {
    //   summary: String, // Brief 1-2 sentence neutral description
    //   type: String, // General category (e.g., "Preservative", "Sweetener", "Natural", "Thickener")
    //   concerns_for_conditions: [{ 
    //     condition: String, // e.g., "Hypertension", "Diabetes", "Celiac Disease"
    //     warning: String // Brief explanation of the risk
    //   }]
    // }
  },
  last_analyzed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster lookups
// ingredientSchema.index({ ingredient_name: 1 });

module.exports = mongoose.model('Ingredient', ingredientSchema);

