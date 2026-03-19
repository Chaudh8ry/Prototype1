class RulesEngine {
  constructor() {
    // Define rules for health conditions and ingredient conflicts
    this.conflictRules = {
      // Allergy-based rules
      'Milk/Dairy': {
        tags: ['contains_dairy', 'milk', 'lactose'],
        message: 'Contains dairy products - conflicts with your milk/dairy allergy'
      },
      'Eggs': {
        tags: ['contains_eggs', 'egg'],
        message: 'Contains eggs - conflicts with your egg allergy'
      },
      'Peanuts': {
        tags: ['contains_peanuts', 'peanut'],
        message: 'Contains peanuts - conflicts with your peanut allergy'
      },
      'Tree Nuts': {
        tags: ['contains_nuts', 'tree_nuts', 'almond', 'walnut', 'cashew'],
        message: 'Contains tree nuts - conflicts with your tree nut allergy'
      },
      'Fish': {
        tags: ['contains_fish', 'fish'],
        message: 'Contains fish - conflicts with your fish allergy'
      },
      'Shellfish': {
        tags: ['contains_shellfish', 'shellfish'],
        message: 'Contains shellfish - conflicts with your shellfish allergy'
      },
      'Wheat/Gluten': {
        tags: ['contains_gluten', 'wheat', 'gluten'],
        message: 'Contains gluten/wheat - conflicts with your gluten allergy'
      },
      'Soy': {
        tags: ['contains_soy', 'soy'],
        message: 'Contains soy - conflicts with your soy allergy'
      },
      'Sesame': {
        tags: ['contains_sesame', 'sesame'],
        message: 'Contains sesame - conflicts with your sesame allergy'
      },
      'Sulfites': {
        tags: ['contains_sulfites', 'sulfites'],
        message: 'Contains sulfites - conflicts with your sulfite sensitivity'
      },

      // Health condition-based rules
      'Type 2 Diabetes': {
        tags: ['high_sugar', 'artificial_sweetener', 'high_carb'],
        potential_concerns: ['Diabetes'],
        message: 'May affect blood sugar levels - consider your diabetes management'
      },
      'Hypertension': {
        tags: ['high_sodium', 'salt'],
        potential_concerns: ['Hypertension', 'High Blood Pressure'],
        message: 'High sodium content - may affect your blood pressure'
      },
      'Cardiovascular Disease': {
        tags: ['high_saturated_fat', 'trans_fat', 'high_cholesterol'],
        potential_concerns: ['Heart Disease', 'Cardiovascular Disease'],
        message: 'May contain ingredients that affect heart health'
      },
      'Celiac Disease': {
        tags: ['contains_gluten', 'wheat', 'gluten'],
        potential_concerns: ['Celiac Disease'],
        message: 'Contains gluten - strictly avoid with celiac disease'
      },
      'High Cholesterol': {
        tags: ['high_cholesterol', 'saturated_fat'],
        potential_concerns: ['High Cholesterol'],
        message: 'May affect cholesterol levels'
      },
      'Chronic Kidney Disease': {
        tags: ['high_sodium', 'high_protein', 'phosphorus'],
        potential_concerns: ['Kidney Disease'],
        message: 'May contain ingredients to limit with kidney disease'
      },
      'GERD/Acid Reflux': {
        tags: ['acidic', 'spicy', 'citric_acid'],
        potential_concerns: ['GERD', 'Acid Reflux'],
        message: 'May trigger acid reflux symptoms'
      },
      'Fatty Liver Disease': {
        tags: ['high_sugar', 'high_fructose', 'refined_carbs'],
        potential_concerns: ['Fatty Liver'],
        message: 'High sugar content may worsen fatty liver condition'
      },
      'Osteoporosis': {
        tags: ['high_sodium', 'phosphoric_acid'],
        potential_concerns: ['Bone Health'],
        message: 'May affect calcium absorption and bone health'
      },

      // Dietary preference rules
      'Vegetarian': {
        tags: ['contains_meat', 'animal_derived'],
        message: 'Contains animal-derived ingredients - not suitable for vegetarian diet'
      },
      'Vegan': {
        tags: ['contains_meat', 'contains_dairy', 'contains_eggs', 'animal_derived', 'honey'],
        message: 'Contains animal-derived ingredients - not suitable for vegan diet'
      },
      'Keto Diet': {
        tags: ['high_carb', 'high_sugar', 'starch'],
        message: 'High in carbohydrates - may not fit ketogenic diet'
      },
      'Low Carb Diet': {
        tags: ['high_carb', 'high_sugar'],
        message: 'High in carbohydrates - may not fit low-carb diet'
      },
      'Low Sodium Diet': {
        tags: ['high_sodium', 'salt'],
        message: 'High sodium content - may not fit low-sodium diet requirements'
      }
    };
  }

  analyzeIngredientConflicts(userProfile, ingredientDataList) {
    const warnings = [];
    const criticalWarnings = [];

    // Collect all user conditions for matching
    const userAllergies = userProfile.allergies || [];
    const userHealthConditions = (userProfile.health_conditions || []).map(hc => hc.condition);
    const userDietaryPreferences = userProfile.dietary_preferences || [];

    // Create a combined list of all conditions for matching
    const allUserConditions = [
      ...userAllergies,
      ...userHealthConditions,
      ...userDietaryPreferences
    ];

    // V2: Check each ingredient's concerns_for_conditions array
    ingredientDataList.forEach(ingredient => {
      const { ingredient_name, analysis_json } = ingredient;
      
      if (!analysis_json) return;

      // V2: Check concerns_for_conditions first (primary method)
      if (analysis_json.concerns_for_conditions && Array.isArray(analysis_json.concerns_for_conditions)) {
        analysis_json.concerns_for_conditions.forEach(concern => {
          const concernCondition = concern.condition;
          const concernWarning = concern.warning;

          // Match against user's conditions (case-insensitive partial match)
          const matchedCondition = allUserConditions.find(userCondition => 
            userCondition.toLowerCase().includes(concernCondition.toLowerCase()) ||
            concernCondition.toLowerCase().includes(userCondition.toLowerCase())
          );

          if (matchedCondition) {
            // Determine warning level - allergies are HIGH, others are MEDIUM
            const isAllergy = userAllergies.some(allergy => 
              allergy.toLowerCase().includes(concernCondition.toLowerCase()) ||
              concernCondition.toLowerCase().includes(allergy.toLowerCase())
            );
            
            const warningLevel = isAllergy ? 'HIGH' : 'MEDIUM';
            
            // Format warning message
            const warningMessage = `**${ingredient_name}:** ${concernWarning}`;
            
            warnings.push({
              ingredient: ingredient_name,
              condition: matchedCondition,
              level: warningLevel,
              message: warningMessage,
              type: this.getWarningType(matchedCondition, userProfile)
            });

            // Also add to critical warnings list (formatted string for AI summary)
            criticalWarnings.push(warningMessage);
          }
        });
      }

      // Fallback: Also check old tag-based system for backward compatibility
      if (analysis_json.tags && Array.isArray(analysis_json.tags)) {
        allUserConditions.forEach(condition => {
          const rule = this.conflictRules[condition];
          if (!rule || !rule.tags) return;

          const tagConflict = rule.tags.some(ruleTag => 
            analysis_json.tags.some(ingredientTag => 
              ingredientTag.toLowerCase().includes(ruleTag.toLowerCase()) ||
              ruleTag.toLowerCase().includes(ingredientTag.toLowerCase())
            )
          );

          if (tagConflict) {
            // Check if we already have this warning from concerns_for_conditions
            const existingWarning = warnings.find(w => 
              w.ingredient === ingredient_name && w.condition === condition
            );

            if (!existingWarning) {
              const isAllergy = userAllergies.includes(condition);
              const warningLevel = isAllergy ? 'HIGH' : 'MEDIUM';
              
              warnings.push({
                ingredient: ingredient_name,
                condition: condition,
                level: warningLevel,
                message: `${ingredient_name}: ${rule.message}`,
                type: this.getWarningType(condition, userProfile)
              });
            }
          }
        });
      }
    });

    // Sort warnings by priority (HIGH > MEDIUM > LOW)
    warnings.sort((a, b) => {
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return priorityOrder[b.level] - priorityOrder[a.level];
    });

    return { warnings, criticalWarnings };
  }

  getWarningType(condition, userProfile) {
    if (userProfile.allergies && userProfile.allergies.includes(condition)) {
      return 'allergy';
    } else if (userProfile.health_conditions && 
               userProfile.health_conditions.some(hc => hc.condition === condition)) {
      return 'health_condition';
    } else if (userProfile.dietary_preferences && 
               userProfile.dietary_preferences.includes(condition)) {
      return 'dietary_preference';
    }
    return 'general';
  }

  generateOverallSummary(warnings) {
    if (warnings.length === 0) {
      return {
        status: 'good',
        message: 'This product appears suitable for your health profile.',
        color: 'green'
      };
    }

    const highPriorityWarnings = warnings.filter(w => w.level === 'HIGH');
    const mediumPriorityWarnings = warnings.filter(w => w.level === 'MEDIUM');

    if (highPriorityWarnings.length > 0) {
      return {
        status: 'not_recommended',
        message: `Not recommended - contains ${highPriorityWarnings.length} serious concern${highPriorityWarnings.length > 1 ? 's' : ''} for your health profile.`,
        color: 'red'
      };
    } else if (mediumPriorityWarnings.length > 2) {
      return {
        status: 'caution',
        message: `Use caution - contains ${warnings.length} ingredient${warnings.length > 1 ? 's' : ''} that may conflict with your health profile.`,
        color: 'orange'
      };
    } else {
      return {
        status: 'minor_concerns',
        message: `Generally okay - minor concerns with ${warnings.length} ingredient${warnings.length > 1 ? 's' : ''}.`,
        color: 'yellow'
      };
    }
  }
}

module.exports = RulesEngine;

