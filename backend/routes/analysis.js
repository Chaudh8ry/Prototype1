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

const startOfLocalDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatLocalDateKey = (value) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const computeGoalStreaks = (scans = []) => {
  const scoredScans = scans
    .map((scan) => {
      const goalAlignment =
        scan.analysis_result?.overall_profile?.goal_alignment ||
        scan.analysis_result?.goal_alignment ||
        null;
      const score = Number(goalAlignment?.score);
      return {
        scan_date: scan.scan_date,
        product_name: scan.product_name,
        goal: goalAlignment?.goal || null,
        matched: Number.isFinite(score) && score >= 70,
        score: Number.isFinite(score) ? score : null,
      };
    })
    .filter((scan) => scan.goal && scan.score !== null)
    .sort((a, b) => new Date(a.scan_date) - new Date(b.scan_date));

  if (!scoredScans.length) {
    return {
      current: 0,
      best: 0,
      this_week: 0,
      last_match_at: null,
      active_goal: null,
    };
  }

  let best = 0;
  let running = 0;

  scoredScans.forEach((scan) => {
    if (scan.matched) {
      running += 1;
      if (running > best) best = running;
    } else {
      running = 0;
    }
  });

  let current = 0;
  let lastMatchAt = null;
  for (let index = scoredScans.length - 1; index >= 0; index -= 1) {
    if (!scoredScans[index].matched) break;
    current += 1;
    lastMatchAt = lastMatchAt || scoredScans[index].scan_date;
  }

  const now = new Date();
  const weekStart = startOfLocalDay(now);
  weekStart.setDate(weekStart.getDate() - 6);

  const thisWeek = scoredScans.filter(
    (scan) => scan.matched && startOfLocalDay(scan.scan_date) >= weekStart,
  ).length;

  return {
    current,
    best,
    this_week: thisWeek,
    last_match_at: lastMatchAt,
    active_goal: scoredScans[scoredScans.length - 1]?.goal || null,
  };
};

const buildGoalCalendar = (scans = [], days = 35) => {
  const today = startOfLocalDay(new Date());
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  const dayMap = new Map();

  scans.forEach((scan) => {
    const day = startOfLocalDay(scan.scan_date);
    if (day < start || day > today) return;

    const key = formatLocalDateKey(day);
    const goalAlignment =
      scan.analysis_result?.overall_profile?.goal_alignment ||
      scan.analysis_result?.goal_alignment ||
      null;
    const score = Number(goalAlignment?.score);
    const matched = Number.isFinite(score) && score >= 70;

    const existing = dayMap.get(key) || {
      date: key,
      scans: 0,
      matches: 0,
      misses: 0,
      goal: goalAlignment?.goal || null,
      score_sum: 0,
      score_count: 0,
    };

    existing.scans += 1;
    if (Number.isFinite(score)) {
      existing.score_sum += score;
      existing.score_count += 1;
      if (matched) existing.matches += 1;
      else existing.misses += 1;
    }
    if (!existing.goal && goalAlignment?.goal) {
      existing.goal = goalAlignment.goal;
    }

    dayMap.set(key, existing);
  });

  const entries = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const key = formatLocalDateKey(date);
    const existing = dayMap.get(key);

    const intensity = existing
      ? existing.matches >= 3
        ? 3
        : existing.matches >= 2
          ? 2
          : existing.matches >= 1
            ? 1
            : existing.scans > 0
              ? -1
              : 0
      : 0;

    entries.push({
      date: key,
      scans: existing?.scans || 0,
      matches: existing?.matches || 0,
      misses: existing?.misses || 0,
      avg_score:
        existing?.score_count
          ? Math.round(existing.score_sum / existing.score_count)
          : null,
      intensity,
      goal: existing?.goal || null,
    });
  }

  return entries;
};

const getConditionNames = (healthProfile) =>
  (healthProfile.health_conditions || [])
    .map((item) => item?.condition)
    .filter(Boolean)
    .map((item) => item.toLowerCase());

const buildGoalAlignment = (healthProfile, normalizedNutrition) => {
  const goal = String(healthProfile.primary_goal || '').trim();
  if (!goal) return null;

  const normalizedGoal = goal.toLowerCase();
  const sugar = normalizedNutrition.sugar_g || 0;
  const sodium = normalizedNutrition.sodium_mg || 0;
  const protein = normalizedNutrition.protein_g || 0;
  const fiber = normalizedNutrition.fiber_g || 0;
  const fat = normalizedNutrition.fat_g || 0;

  const buildResult = (score, summary, recommendation) => ({
    goal,
    score: Math.max(15, Math.min(98, Math.round(score))),
    label: score >= 75 ? 'Strong match' : score >= 50 ? 'Partial match' : 'Weak match',
    summary,
    recommendation,
  });

  if (normalizedGoal === 'weight loss') {
    return buildResult(
      70 + (fiber >= 3 ? 8 : -6) + (sugar <= 8 ? 8 : sugar >= 15 ? -12 : -4) + (fat <= 12 ? 5 : fat >= 18 ? -8 : -2),
      sugar <= 8 && fiber >= 3
        ? 'This product supports your weight loss goal with a lighter sugar profile and some fiber for fullness.'
        : 'This product is only a partial fit for weight loss because the nutrition balance is not especially light.',
      sugar >= 15 || fat >= 18
        ? `Watch out for${sugar >= 15 ? ` sugar (${sugar}g)` : ''}${sugar >= 15 && fat >= 18 ? ' and' : ''}${fat >= 18 ? ` fat (${fat}g)` : ''}.`
        : 'Look for products with low sugar and better fiber to keep building a stronger pattern.',
    );
  }

  if (normalizedGoal === 'muscle gain') {
    return buildResult(
      64 + (protein >= 10 ? 18 : protein >= 6 ? 8 : -12) + (sugar <= 12 ? 4 : -6),
      protein >= 10
        ? 'This product supports your muscle gain goal with a stronger protein contribution.'
        : 'This product is only a moderate fit for muscle gain because the protein signal is limited.',
      protein >= 10
        ? 'Pair it with balanced meals across the day to keep protein intake consistent.'
        : 'Look for options with at least 10g protein per serving for a better match.',
    );
  }

  if (normalizedGoal === 'low sugar') {
    return buildResult(
      86 - (sugar >= 20 ? 36 : sugar >= 12 ? 22 : sugar >= 6 ? 8 : 0) + (fiber >= 3 ? 4 : 0),
      sugar <= 5
        ? 'This product fits a low sugar goal well based on the captured label values.'
        : `This product pushes against your low sugar goal because it contains about ${sugar}g sugar.`,
      sugar <= 5
        ? 'This is the kind of sugar range you would want to repeat more often.'
        : 'Try products under 5g sugar per serving for a cleaner goal match.',
    );
  }

  if (normalizedGoal === 'low sodium') {
    return buildResult(
      86 - (sodium >= 700 ? 42 : sodium >= 400 ? 28 : sodium >= 200 ? 12 : 0),
      sodium <= 140
        ? 'This product is a strong fit for a low sodium goal.'
        : `This product may work against your low sodium goal because it contains about ${sodium}mg sodium.`,
      sodium <= 140
        ? 'A low-sodium pattern like this can help maintain better long-term choices.'
        : 'Try to stay closer to 140mg sodium or lower per serving when possible.',
    );
  }

  if (normalizedGoal === 'high protein') {
    return buildResult(
      62 + (protein >= 12 ? 20 : protein >= 8 ? 10 : -10) + (sugar <= 10 ? 4 : -4),
      protein >= 8
        ? `This product contributes reasonably well to a high protein goal with about ${protein}g protein.`
        : 'This product is not a strong high-protein option based on the captured label.',
      protein >= 12
        ? 'This is a good profile to compare against similar products in the same category.'
        : 'Look for products with 10-12g protein or more for a clearer advantage.',
    );
  }

  if (normalizedGoal === 'clean eating') {
    return buildResult(
      70 + (sugar <= 8 ? 6 : -8) + (sodium <= 200 ? 6 : -8) + (fiber >= 3 ? 4 : 0),
      'This goal match is estimated from the product nutrition balance and your saved profile.',
      'For clean eating, prefer simpler labels, lower sugar and sodium, and better fiber when possible.',
    );
  }

  return buildResult(
    60,
    `This scan was checked against your goal: ${goal}.`,
    'Add more specific goal notes in your profile for sharper guidance.',
  );
};

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
  const primaryGoal = String(healthProfile.primary_goal || '').toLowerCase();

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
    additionalInfo.includes('muscle') ||
    /muscle gain|high protein/.test(primaryGoal)
  ) {
    if (protein >= 10) personalFitScore += 6;
    if (protein < 5) personalFitScore -= 4;
  }

  if (
    dietaryPreferences.some((item) => /weight loss|low sugar|low sodium/.test(item)) ||
    additionalInfo.includes('weight loss') ||
    /weight loss|low sugar|low sodium/.test(primaryGoal)
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
    const goalAlignment = buildGoalAlignment(healthProfile, normalized_nutrition);

    analysisResult.overall_profile = {
      ...analysisResult.overall_profile,
      ...computedScores,
      goal_alignment: goalAlignment,
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
        primary_goal: healthProfile.primary_goal || '',
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
    const goalStreak = computeGoalStreaks(scans);
    const goalCalendar = buildGoalCalendar(scans);

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
      goal_streak: goalStreak,
      goal_calendar: goalCalendar,
      latest_scan: scans[scans.length - 1] || null,
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ message: 'Failed to compute insights' });
  }
});

module.exports = router;
