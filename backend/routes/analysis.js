const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Ingredient = require('../models/Ingredient');
const HealthProfile = require('../models/HealthProfile');
const SavedScan = require('../models/SavedScan');
const User = require('../models/User');
const GeminiAPI = require('../utils/geminiApi');
const RulesEngine = require('../utils/rulesEngine');
const auth = require('../middleware/auth');

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      require('fs').mkdirSync(uploadsDir, { recursive: true });
    } catch (mkdirError) {
      return cb(mkdirError);
    }

    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'food-label-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize APIs
const geminiApi = new GeminiAPI();
const rulesEngine = new RulesEngine();

const parseNumericValue = (value) => {
  if (value === null || value === undefined) return null;
  const match = String(value).match(/([\d.]+)/);
  return match ? Number(match[1]) : null;
};

const getNumericNutritionFromTable = (nutritionTable = {}) => {
  const entries = Object.entries(nutritionTable || {});
  const findValue = (needle) => {
    const entry = entries.find(([name]) => name.toLowerCase().includes(needle));
    return entry ? parseNumericValue(entry[1]) : null;
  };

  return {
    sugar_g: findValue('sugar') ?? findValue('sugars'),
    sodium_mg: findValue('sodium') ?? findValue('salt'),
    fat_g: findValue('fat'),
    protein_g: findValue('protein'),
    fiber_g: findValue('fibre') ?? findValue('fiber'),
    energy_kcal: findValue('energy') ?? findValue('calorie'),
  };
};

const getConditionNames = (healthProfile) =>
  (healthProfile.health_conditions || [])
    .map((item) => item?.condition)
    .filter(Boolean)
    .map((item) => item.toLowerCase());

const computeScores = (healthProfile, analysisResult, normalizedNutrition) => {
  const aiOverallRating = analysisResult?.overall_profile?.overall_rating || 'Unknown';
  const allergensFound = analysisResult?.overall_profile?.allergens_found || [];
  const itemizedAnalysis = analysisResult?.itemized_analysis || [];
  const conditionNames = getConditionNames(healthProfile);

  let overallHealthScore = 72;
  if (aiOverallRating === 'Healthy') overallHealthScore = 84;
  if (aiOverallRating === 'Moderately Healthy') overallHealthScore = 62;
  if (aiOverallRating === 'Unhealthy') overallHealthScore = 34;

  const unhealthyIngredients = itemizedAnalysis.filter(
    (item) => item.health_rating === 'Unhealthy',
  ).length;
  const moderateIngredients = itemizedAnalysis.filter(
    (item) => item.health_rating === 'Moderately Healthy',
  ).length;
  const processedIngredients = itemizedAnalysis.filter((item) =>
    ['Preservative', 'Sweetener', 'Color', 'Flavoring', 'Stabilizer', 'Emulsifier'].includes(
      item.food_type,
    ),
  ).length;

  overallHealthScore -= unhealthyIngredients * 6;
  overallHealthScore -= moderateIngredients * 2;
  overallHealthScore -= processedIngredients * 2;

  if ((normalizedNutrition.sugar_g || 0) >= 15) overallHealthScore -= 8;
  if ((normalizedNutrition.sugar_g || 0) >= 25) overallHealthScore -= 6;
  if ((normalizedNutrition.sodium_mg || 0) >= 300) overallHealthScore -= 8;
  if ((normalizedNutrition.sodium_mg || 0) >= 600) overallHealthScore -= 8;
  if ((normalizedNutrition.fat_g || 0) >= 17) overallHealthScore -= 4;
  if ((normalizedNutrition.protein_g || 0) >= 8) overallHealthScore += 4;
  if ((normalizedNutrition.fiber_g || 0) >= 3) overallHealthScore += 4;

  let personalFitScore = overallHealthScore;

  if (allergensFound.length) {
    personalFitScore -= Math.min(30, allergensFound.length * 15);
  }

  const additionalInfo = `${healthProfile.additional_info || ''}`.toLowerCase();
  const dietaryPreferences = (healthProfile.dietary_preferences || []).map((item) =>
    String(item).toLowerCase(),
  );

  const sugar = normalizedNutrition.sugar_g || 0;
  const sodium = normalizedNutrition.sodium_mg || 0;
  const fat = normalizedNutrition.fat_g || 0;
  const protein = normalizedNutrition.protein_g || 0;
  const fiber = normalizedNutrition.fiber_g || 0;

  if (conditionNames.some((name) => /(diabet|blood sugar|insulin)/.test(name))) {
    if (sugar >= 10) personalFitScore -= 12;
    if (sugar >= 20) personalFitScore -= 10;
    if (fiber >= 3) personalFitScore += 3;
  }

  if (conditionNames.some((name) => /(hypertension|blood pressure|heart)/.test(name))) {
    if (sodium >= 200) personalFitScore -= 10;
    if (sodium >= 400) personalFitScore -= 10;
    if (sodium >= 700) personalFitScore -= 8;
  }

  if (conditionNames.some((name) => /(kidney|renal)/.test(name))) {
    if (sodium >= 200) personalFitScore -= 10;
    if (protein >= 20) personalFitScore -= 4;
  }

  if (conditionNames.some((name) => /(weight|obes|cholesterol)/.test(name))) {
    if (sugar >= 15) personalFitScore -= 8;
    if (fat >= 15) personalFitScore -= 6;
    if (fiber >= 3) personalFitScore += 3;
  }

  if (
    dietaryPreferences.some((item) => /high protein|muscle|fitness/.test(item)) ||
    additionalInfo.includes('muscle')
  ) {
    if (protein >= 10) personalFitScore += 6;
    if (protein < 5) personalFitScore -= 4;
  }

  if (
    dietaryPreferences.some((item) => /weight loss|low sugar|low sodium/.test(item)) ||
    additionalInfo.includes('weight loss')
  ) {
    if (sugar >= 12) personalFitScore -= 6;
    if (sodium >= 300) personalFitScore -= 5;
  }

  overallHealthScore = Math.max(8, Math.min(95, Math.round(overallHealthScore)));
  personalFitScore = Math.max(4, Math.min(98, Math.round(personalFitScore)));

  let derivedOverallRating = 'Moderately Healthy';
  if (personalFitScore >= 75) derivedOverallRating = 'Healthy';
  else if (personalFitScore < 45) derivedOverallRating = 'Unhealthy';

  return {
    ai_overall_rating: aiOverallRating,
    overall_rating: derivedOverallRating,
    overall_health_score: overallHealthScore,
    personal_fit_score: personalFitScore,
  };
};

const resolveProfileContext = async (userId, requestedProfileId = null) => {
  const user = await User.findById(userId).select('active_profile health_profile');

  const profileId =
    requestedProfileId ||
    user?.active_profile ||
    user?.health_profile ||
    null;

  if (!profileId) {
    return null;
  }

  return HealthProfile.findOne({
    _id: profileId,
    user: userId,
  });
};

const buildProfileScanQuery = (userId, profile) => {
  const query = { user: userId };

  if (!profile) {
    return query;
  }

  if (profile.is_primary) {
    query.$or = [
      { profile: profile._id },
      { profile: { $exists: false } },
      { profile: null },
    ];
  } else {
    query.profile = profile._id;
  }

  return query;
};

// @route   POST /api/analysis/extract-ingredients
// @desc    Extract ingredients from uploaded food label image
// @access  Private
router.post('/extract-ingredients', auth, upload.array('images', 2), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files uploaded' });
    }

    const images = await Promise.all(
      req.files.map(async (file) => {
        const imageBuffer = await fs.readFile(file.path);
        return {
          data: imageBuffer.toString('base64'),
          mimeType: file.mimetype,
        };
      }),
    );

    const scannedData = await geminiApi.extractIngredientsFromImages(images);

    await Promise.all(req.files.map((file) => fs.unlink(file.path)));

    // Format ingredients for frontend display
    const extractedText = scannedData.ingredients_list.map(item => 
      item.percent ? `${item.ingredient} (${item.percent})` : item.ingredient
    ).join(', ');

    res.json({
      message: 'Data extracted successfully',
      scanned_ingredients_list: scannedData.ingredients_list,
      scanned_nutrition_table: scannedData.nutrition_table,
      extracted_text: extractedText,
      ingredients_list: scannedData.ingredients_list.map(item => item.ingredient),
      image_processed: true,
      images_processed: req.files.length,
    });

  } catch (error) {
    if (req.files?.length) {
      await Promise.all(
        req.files.map(async (file) => {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error('Error cleaning up file:', unlinkError);
          }
        }),
      );
    }

    console.error('Ingredient extraction error:', error);
    res.status(500).json({ 
      message: 'Failed to extract ingredients from image',
      error: error.message 
    });
  }
});

// @route   POST /api/analysis/analyze-ingredients
// @desc    Analyze confirmed ingredients list and nutrition table, generate personalized report with DRI
// @access  Private
router.post('/analyze-ingredients', auth, async (req, res) => {
  try {
    const { scanned_ingredients_list, scanned_nutrition_table, product_name, profile_id } = req.body;

    // Expect scanned_ingredients_list to be an array of {ingredient, percent} objects
    if (!scanned_ingredients_list || !Array.isArray(scanned_ingredients_list) || scanned_ingredients_list.length === 0) {
      return res.status(400).json({ message: 'Valid scanned ingredients list is required' });
    }

    // Get user's health profile
    const healthProfile = await resolveProfileContext(req.user._id, profile_id);
    if (!healthProfile) {
      return res.status(400).json({ message: 'Health profile not found. Please complete your profile first.' });
    }

    // Step 3: The "Main Analysis" AI Call with nutrition data and activity_level for DRI calculations
    let analysisResult;
    try {
      analysisResult = await geminiApi.performMainAnalysis(healthProfile, scanned_ingredients_list, scanned_nutrition_table || {});
    } catch (analysisError) {
      console.error('Main analysis error:', analysisError);
      return res.status(500).json({ 
        message: 'Failed to analyze ingredients',
        error: analysisError.message 
      });
    }

    // V5 Step 4: Process AI Response & Generate Chart Data
    const ingredient_profile_data = {};
    analysisResult.itemized_analysis.forEach(ingredient => {
      const foodType = ingredient.food_type || 'Other';
      ingredient_profile_data[foodType] = (ingredient_profile_data[foodType] || 0) + 1;
    });

    // Derive simple normalized nutrition data for downstream visuals (radar, trends)
    const normalized_nutrition = {};
    const tableEntries = Object.entries(scanned_nutrition_table || {});

    const setIfFound = (keySubstring, targetKey) => {
      const entry = tableEntries.find(([name]) =>
        name.toLowerCase().includes(keySubstring),
      );
      if (entry) {
        const numeric = parseNumericValue(entry[1]);
        if (numeric !== null) normalized_nutrition[targetKey] = numeric;
      }
    };

    setIfFound('energy', 'energy_kcal');
    setIfFound('calorie', 'energy_kcal');
    setIfFound('protein', 'protein_g');
    setIfFound('sugar', 'sugar_g');
    setIfFound('sugars', 'sugar_g');
    setIfFound('sodium', 'sodium_mg');
    setIfFound('salt', 'sodium_mg');
    setIfFound('fat', 'fat_g');
    setIfFound('saturated', 'sat_fat_g');
    setIfFound('fibre', 'fiber_g');
    setIfFound('fiber', 'fiber_g');

    const computedScores = computeScores(
      healthProfile,
      analysisResult,
      normalized_nutrition,
    );

    analysisResult.overall_profile = {
      ...analysisResult.overall_profile,
      ...computedScores,
    };

    // Step 5: Prepare Final Report
    const analysisReport = {
      product_name: product_name || 'Unknown Product',
      // Overall profile from AI
      overall_profile: analysisResult.overall_profile,
      // Itemized analysis from AI
      itemized_analysis: analysisResult.itemized_analysis,
      // Chart data
      ingredient_profile_data: ingredient_profile_data,
      // Nutrition table data (user-confirmed)
      nutrition_table_data: scanned_nutrition_table || {},
      // Lightly-normalized numeric nutrients for charts and trends
      normalized_nutrition,
      scores: computedScores,
      // Full AI JSON for saving
      analysis_result: analysisResult,
      // Metadata
      total_ingredients: analysisResult.itemized_analysis.length,
      analysis_timestamp: new Date().toISOString(),
      user_profile_summary: {
        profile_id: healthProfile._id,
        profile_name: healthProfile.profile_name,
        relationship: healthProfile.relationship,
        age_group: healthProfile.age_group,
        allergies_count: healthProfile.allergies?.length || 0,
        conditions_count: healthProfile.health_conditions?.length || 0,
        preferences_count: healthProfile.dietary_preferences?.length || 0
      }
    };

    res.json({
      message: 'Analysis completed successfully',
      report: analysisReport
    });

  } catch (error) {
    console.error('Ingredient analysis error:', error);
    res.status(500).json({ 
      message: 'Failed to analyze ingredients',
      error: error.message 
    });
  }
});

// @route   GET /api/analysis/ingredient/:name
// @desc    Get cached analysis for a specific ingredient
// @access  Private
router.get('/ingredient/:name', auth, async (req, res) => {
  try {
    const ingredientName = req.params.name.toLowerCase().trim();
    
    const ingredient = await Ingredient.findOne({ 
      ingredient_name: ingredientName 
    });

    if (!ingredient) {
      return res.status(404).json({ message: 'Ingredient not found in cache' });
    }

    res.json({
      ingredient: {
        name: ingredient.ingredient_name,
        analysis: ingredient.analysis_json,
        last_analyzed: ingredient.last_analyzed
      }
    });

  } catch (error) {
    console.error('Get ingredient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/analysis/insights
// @desc    Get aggregate insights for the current user from saved scans
// @access  Private
router.get('/insights', auth, async (req, res) => {
  try {
    const healthProfile = await resolveProfileContext(req.user._id, req.query.profile_id);
    const scanQuery = buildProfileScanQuery(req.user._id, healthProfile);

    const scans = await SavedScan.find(scanQuery).sort({
      scan_date: 1,
    });

    if (!scans.length) {
      return res.json({
        total_scans: 0,
        rating_mix: {},
        score_over_time: [],
        nutrient_trends: {},
        top_concerns: [],
      });
    }

    const ratingMix = { Healthy: 0, 'Moderately Healthy': 0, Unhealthy: 0 };
    const scoreOverTime = [];
    const nutrientTotals = {
      sugar_g: [],
      sodium_mg: [],
      protein_g: [],
      fiber_g: [],
    };
    const concernCounts = new Map();

    scans.forEach((scan) => {
      const rating = scan.overall_rating || 'Unknown';
      if (ratingMix[rating] !== undefined) {
        ratingMix[rating] += 1;
      }

      const analysis = scan.analysis_result || {};
      const overall = analysis.overall_profile || {};
      const normalized = {
        ...getNumericNutritionFromTable(scan.nutrition_table_data || {}),
        ...(analysis.normalized_nutrition || {}),
      };
      const fitScore =
        overall.personal_fit_score ??
        overall.overall_health_score ??
        (rating === 'Healthy' ? 85 : rating === 'Moderately Healthy' ? 60 : rating === 'Unhealthy' ? 35 : null);

      scoreOverTime.push({
        date: scan.scan_date,
        rating,
        score: fitScore,
        product_name: scan.product_name,
      });

      // Collect sugar / sodium where available
      if (typeof normalized.sugar_g === 'number') {
        nutrientTotals.sugar_g.push({
          date: scan.scan_date,
          value: normalized.sugar_g,
        });
      }
      if (typeof normalized.sodium_mg === 'number') {
        nutrientTotals.sodium_mg.push({
          date: scan.scan_date,
          value: normalized.sodium_mg,
        });
      }
      if (typeof normalized.protein_g === 'number') {
        nutrientTotals.protein_g.push({
          date: scan.scan_date,
          value: normalized.protein_g,
        });
      }
      if (typeof normalized.fiber_g === 'number') {
        nutrientTotals.fiber_g.push({
          date: scan.scan_date,
          value: normalized.fiber_g,
        });
      }

      // Lightweight concern extraction from saved guidance and nutrient values
      const text =
        (overall.moderation_advice || '') +
        ' ' +
        (overall.summary_paragraph || '');
      const lower = text.toLowerCase();

      if (lower.includes('sugar')) {
        concernCounts.set(
          'Sugar-heavy choices',
          (concernCounts.get('Sugar-heavy choices') || 0) + 1,
        );
      }
      if (lower.includes('sodium') || lower.includes('salt')) {
        concernCounts.set(
          'High sodium items',
          (concernCounts.get('High sodium items') || 0) + 1,
        );
      }
      if (lower.includes('fat') || lower.includes('saturated')) {
        concernCounts.set(
          'Rich / fatty picks',
          (concernCounts.get('Rich / fatty picks') || 0) + 1,
        );
      }
      if (lower.includes('fiber') || lower.includes('fibre')) {
        concernCounts.set(
          'Fiber-conscious choices',
          (concernCounts.get('Fiber-conscious choices') || 0) + 1,
        );
      }
      if ((normalized.protein_g || 0) >= 10) {
        concernCounts.set(
          'Protein-forward choices',
          (concernCounts.get('Protein-forward choices') || 0) + 1,
        );
      }
      if ((overall.allergens_found || []).length) {
        concernCounts.set(
          'Allergen warnings flagged',
          (concernCounts.get('Allergen warnings flagged') || 0) + 1,
        );
      }
    });

    const avg = (list) => {
      if (!list.length) return null;
      const sum = list.reduce((acc, item) => acc + item.value, 0);
      return sum / list.length;
    };

    const nutrientTrends = {
      sugar_g: {
        average: avg(nutrientTotals.sugar_g),
        samples: nutrientTotals.sugar_g,
      },
      sodium_mg: {
        average: avg(nutrientTotals.sodium_mg),
        samples: nutrientTotals.sodium_mg,
      },
      protein_g: {
        average: avg(nutrientTotals.protein_g),
        samples: nutrientTotals.protein_g,
      },
      fiber_g: {
        average: avg(nutrientTotals.fiber_g),
        samples: nutrientTotals.fiber_g,
      },
    };

    const topConcerns = Array.from(concernCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

    res.json({
      total_scans: scans.length,
      active_profile: healthProfile
        ? {
            id: healthProfile._id,
            profile_name: healthProfile.profile_name,
            relationship: healthProfile.relationship,
          }
        : null,
      rating_mix: ratingMix,
      score_over_time: scoreOverTime,
      nutrient_trends: nutrientTrends,
      top_concerns: topConcerns,
      latest_scan: scans[scans.length - 1] || null,
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ message: 'Failed to compute insights' });
  }
});

module.exports = router;
