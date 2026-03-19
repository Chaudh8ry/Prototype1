const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const axios = require('axios');

class GeminiAPI {
  constructor(apiKey) {
    const model = "gemini-2.5-flash-lite";
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    // URL for the multimodal model (image + text)
    this.visionApiUrl =`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
    // URL for the text-only model
    this.textApiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
  }

  async extractIngredientsFromImage(imageBase64, mimeType = "image/jpeg") {
    return this.extractIngredientsFromImages([
      { data: imageBase64, mimeType },
    ]);
  }

  async extractIngredientsFromImages(images = []) {
    try {
      if (!this.apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      if (!Array.isArray(images) || images.length === 0) {
        throw new Error('At least one image is required');
      }

      const prompt = `Role: You are a food label data extractor.

Task: Scan the provided food label images and extract two key pieces of information: the ingredients list and the nutritional facts table.
The images may show different parts of the same package, such as one image for ingredients and another image for the nutrition facts. Combine all visible information across the images into one final result.

Output: Return a single JSON object with two keys: "ingredients_list" and "nutrition_table".

Example Output:
{
  "ingredients_list": [
    {"ingredient": "Flaked Rice", "percent": "46%"}
  ],
  "nutrition_table": {
    "Energy": "120 kcal",
    "Protein": "2g",
    "Total Fat": "1g",
    "Sodium": "150mg"
  }
}

For ingredients_list: Extract each ingredient. If an ingredient has a percentage next to it (e.g., 'Flaked Rice (46%)'), extract that percentage. If not, use null for percent.

For nutrition_table: Extract all key-value pairs from the nutritional facts table. Common keys include: Energy, Protein, Total Fat, Saturated Fat, Trans Fat, Carbohydrates, Dietary Fiber, Sugars, Sodium, etc. Use the exact text format shown on the label (e.g., "120 kcal", "2g", "150mg").

Return ONLY valid JSON, no additional text or markdown formatting.`;

      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            ...images.map((image) => ({
              inline_data: {
                mime_type: image.mimeType || 'image/jpeg',
                data: image.data,
              },
            })),
          ]
        }]
      };

      const response = await axios.post(`${this.visionApiUrl}?key=${this.apiKey}`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('No response from Gemini API');
      }

      // Extract JSON from response
      let jsonText = text.trim();
      // Try to match JSON object first (for new format with nutrition_table)
      const objectMatch = jsonText.match(/\{[\s\S]*\}/);
      const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
      
      if (objectMatch) {
        jsonText = objectMatch[0];
      } else if (arrayMatch) {
        // Backward compatibility: if we get an array, wrap it in the new format
        jsonText = arrayMatch[0];
      }

      const parsedData = JSON.parse(jsonText);
      
      // Handle both new format (object with ingredients_list and nutrition_table) and old format (array)
      if (Array.isArray(parsedData)) {
        // Old format: return as ingredients_list only, nutrition_table empty
        return {
          ingredients_list: parsedData,
          nutrition_table: {}
        };
      } else if (parsedData.ingredients_list && parsedData.nutrition_table !== undefined) {
        // New format: return as is
        return parsedData;
      } else {
        throw new Error('Invalid data format from OCR');
      }

    } catch (error) {
      const geminiMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.error ||
        error.message;

      console.error('Gemini OCR error:', geminiMessage);

      if (String(geminiMessage).includes('GEMINI_API_KEY is not configured')) {
        throw new Error('Gemini API key is missing on the backend.');
      }

      if (String(geminiMessage).toLowerCase().includes('quota')) {
        throw new Error('Gemini quota limit reached. Try again later or check your API quota.');
      }

      throw new Error(`Failed to extract ingredients from image. ${geminiMessage}`);
    }
  }

  async analyzeIngredient(ingredientName) {
    try {
      if (!this.apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      const prompt = `Provide a structured JSON data profile for the ingredient: "${ingredientName}". 
      The JSON should have exactly these keys:
      - "type": a brief category (e.g., "preservative", "sweetener", "protein", "carbohydrate", "fat", "vitamin", "mineral", "additive", "natural", "artificial")
      - "tags": an array of relevant tags (e.g., ["gluten_free", "vegan", "contains_dairy", "artificial", "processed", "natural", "high_sodium", "high_sugar", "allergen"])
      - "potential_concerns": an array of objects, each with "condition" and "level" keys, where level is "LOW", "MEDIUM", or "HIGH"
      
      Example format:
      {
        "type": "preservative",
        "tags": ["artificial", "processed"],
        "potential_concerns": [
          {"condition": "Hypertension", "level": "MEDIUM"},
          {"condition": "Heart Disease", "level": "LOW"}
        ]
      }
      
      Return only valid JSON, no additional text or markdown formatting.`;

      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }]
      };

      const response = await axios.post(`${this.textApiUrl}?key=${this.apiKey}`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('No response from Gemini API');
      }

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Gemini Response did not contain JSON:", text);
        throw new Error('No JSON found in response');
      }

      const analysisData = JSON.parse(jsonMatch[0]);
      
      if (!analysisData.type || !Array.isArray(analysisData.tags) || !Array.isArray(analysisData.potential_concerns)) {
        throw new Error('Invalid analysis data structure from AI');
      }

      return analysisData;

    } catch (error) {
      console.error('Gemini analysis error:', error.response?.data?.error || error.message);
      
      return {
        type: "unknown",
        tags: ["unanalyzed"],
        potential_concerns: []
      };
    }
  }

  createBatchAnalysisPrompt(ingredientsList) {
    return `Role: You are a food scientist.
Task: Analyze the following list of food ingredients and return a structured JSON.

Input List: ${JSON.stringify(ingredientsList)}

Output Requirements:

1.  Return a JSON array, one object per ingredient.

2.  Each object must have these keys:

    * "ingredient_name": (string) The exact ingredient name.

    * "summary": (string) A 10-word-max neutral description (e.g., "Artificial sweetener," "Vegetable oil," "Preservative").

    * "type": (string) A single-word category (e.g., "Preservative", "Sweetener", "Fat", "Thickener").

    * "concerns_for_conditions": (array)

        * Each object in this array must have "condition" (e.g., "Hypertension") and a "warning" (e.g., "High Sodium").

        * **IMPORTANT: The "warning" must be 5 words or less.**

Response Format: JSON only.

Example for input ["Maltodextrin", "Aspartame"]:

[
  {
    "ingredient_name": "Maltodextrin",
    "summary": "Processed carbohydrate thickener.",
    "type": "Thickener",
    "concerns_for_conditions": [
      { "condition": "Diabetes", "warning": "High Glycemic Index" },
      { "condition": "Celiac Disease", "warning": "May contain gluten" }
    ]
  },
  {
    "ingredient_name": "Aspartame",
    "summary": "Artificial sweetener.",
    "type": "Sweetener",
    "concerns_for_conditions": [
      { "condition": "PKU", "warning": "Contains phenylalanine" }
    ]
  }
]`;
  }

  async batchAnalyzeIngredients(ingredientsList) {
    try {
      if (!this.apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      if (!ingredientsList || ingredientsList.length === 0) {
        throw new Error('Ingredient list is empty');
      }

      const prompt = this.createBatchAnalysisPrompt(ingredientsList);

      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }]
      };

      const response = await axios.post(`${this.textApiUrl}?key=${this.apiKey}`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('No response from Gemini API');
      }

      // Extract JSON from response (handles markdown code blocks and arrays)
      let jsonText = text.trim();
      // Try to match JSON array first, then object
      const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
      const objectMatch = jsonText.match(/\{[\s\S]*\}/);
      
      if (arrayMatch) {
        jsonText = arrayMatch[0];
      } else if (objectMatch) {
        jsonText = objectMatch[0];
      }

      const result = JSON.parse(jsonText);
      
      // V3: Expect direct array, not wrapped in object
      let analyses = [];
      if (Array.isArray(result)) {
        analyses = result;
      } else if (result.ingredient_analyses && Array.isArray(result.ingredient_analyses)) {
        // Backward compatibility with V2 format
        analyses = result.ingredient_analyses;
      } else {
        throw new Error('Invalid batch analysis response structure');
      }

      return analyses.map(item => ({
        ingredient_name: item.ingredient_name,
        analysis_json: {
          summary: item.summary || '',
          type: item.type || 'Other',
          concerns_for_conditions: item.concerns_for_conditions || []
        }
      }));

    } catch (error) {
      console.error('Gemini batch analysis error:', error.response?.data?.error || error.message);
      throw new Error(`Failed to batch analyze ingredients: ${error.message}`);
    }
  }

  async guessProductType(ingredientList) {
    try {
      if (!this.apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      const prompt = `Based on these ingredients: ${ingredientList.slice(0, 10).join(', ')}
Guess the product type in one word (e.g., "Bread", "Snack", "Soda", "Cereal", "Sauce"). Return only the product type word, nothing else.`;

      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }]
      };

      const response = await axios.post(`${this.textApiUrl}?key=${this.apiKey}`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return text || 'packaged food';
    } catch (error) {
      console.error('Product type guess error:', error);
      return 'packaged food';
    }
  }

  createPersonalizedSummaryPrompt(healthProfile, criticalWarnings, productType) {
    return `Role: You are an expert nutritionist. Be direct, concise, and factual. No filler or conversational fluff.

Task: Provide a verdict, moderation advice, and an alternative suggestion for a user.

User Profile:
${JSON.stringify(healthProfile)}

Critical Warnings Found:
${criticalWarnings.length > 0 ? criticalWarnings.join('\n') : 'No critical conflicts found.'}

Product Type Guess:
${productType}

Output Requirements:

Return a single JSON object. No other text.

{
  "verdict": "A 1-sentence expert opinion. (e.g., 'Not recommended for your profile.' or 'A good choice.')",
  "summary": "A 2-sentence explanation for the verdict, citing the user's conditions. (e.g., 'This product is very high in sodium, which conflicts with your Hypertension. It also contains 3 sweeteners.')",
  "moderation_advice": "A direct, scannable instruction. (e.g., 'If you must, limit to one serving (30g) to control sodium.' or 'Safe to eat as desired.')",
  "alternative_suggestion": "If 'verdict' is negative, provide one actionable alternative. (e.g., 'Look for a similar product with less than 140mg of sodium per serving.' or 'A better alternative is plain, air-popped popcorn.')"
}`;
  }

  async createPersonalizedSummary(healthProfile, criticalWarnings, ingredientList, ingredientProfileData) {
    try {
      if (!this.apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      // Guess product type for better alternatives
      const productType = await this.guessProductType(ingredientList);
      
      const prompt = this.createPersonalizedSummaryPrompt(healthProfile, criticalWarnings, productType);

      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }]
      };

      const response = await axios.post(`${this.textApiUrl}?key=${this.apiKey}`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('No response from Gemini API');
      }

      // Extract JSON from response
      let jsonText = text.trim();
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const result = JSON.parse(jsonText);
      
      // Validate required fields
      if (!result.verdict || !result.summary || !result.moderation_advice) {
        throw new Error('Invalid summary response structure');
      }

      return result;

    } catch (error) {
      console.error('Gemini personalized summary error:', error.response?.data?.error || error.message);
      // Return a fallback summary if AI fails
      return {
        verdict: criticalWarnings.length > 0 
          ? 'Not recommended for your profile.' 
          : 'A good choice.',
        summary: criticalWarnings.length > 0
          ? `This product contains ingredients that may conflict with your health profile. Please review the warnings below.`
          : `No major concerns were found for your health profile.`,
        moderation_advice: criticalWarnings.length > 0
          ? 'If you must consume, limit to one serving.'
          : 'Safe to eat as desired.',
        alternative_suggestion: criticalWarnings.length > 0
          ? 'Look for a similar product with fewer concerning ingredients for your conditions.'
          : ''
      };
    }
  }

  createMainAnalysisPrompt(userProfile, scannedIngredientsList, nutritionTable) {
    return `Role: You are an expert nutritionist. Be direct, factual, and speak in simple, natural language. **Your user does not want to see your calculations.**

Task: Analyze a food product for a user. You will be given the user's health profile, the product's ingredients, AND its nutritional facts table.

User Profile:
${JSON.stringify(userProfile)} // (Includes conditions, age, height, weight, activity_level)

Ingredients List (Confirmed):
${JSON.stringify(scannedIngredientsList)}

Nutritional Facts (Confirmed):
${JSON.stringify(nutritionTable)}

Output: Return a single JSON object.

{
  "overall_profile": {
    "overall_rating": "Healthy" | "Moderately Healthy" | "Unhealthy",
    "summary_paragraph": "[Your concise, 1-2 sentence summary...]",
    "allergens_found": ["Wheat", "Nuts"],
    "moderation_advice": "IMPORTANT: Do all calculations (calories, sodium limits) in your head. **DO NOT show the user any math, BMR, or percentages.** Give a simple, scannable instruction as a human would.
      - Good Example: 'If you eat this, I'd stick to a small 30g serving to keep your sodium for the day in check.'
      - Good Example: 'This is very high in sugar. Try to eat no more than two of these cookies.'
      - Good Example: 'A 50g portion (about 3 tablespoons) fits well within your daily calorie goal for a snack.'
      - Bad Example: 'Your BMR is 1700kcal, so a 30g serving is 7%...' (DO NOT DO THIS)",
    "alternative_suggestion": "[Your concise alternative suggestion...]"
  },
  "itemized_analysis": [
    {
      "ingredient_name": "Chana",
      "percentage": "14%",
      "health_rating": "Healthy" | "Moderately Healthy" | "Unhealthy",
      "food_type": "Natural" | "Preservative" | "Sweetener" | "Thickener" | "Emulsifier" | "Flavoring" | "Color" | "Acid" | "Antioxidant" | "Stabilizer" | "Protein" | "Fat" | "Carbohydrate" | "Vitamin" | "Mineral" | "Other",
      "food_traits": ["Legume", "Protein source"],
      "ingredient_details": "Provides protein and fiber. Good source of protein and fiber, which can help with both protein-energy malnutrition and managing weight. Beneficial for hypertension as it contributes to overall heart health.",
      "nutrients": [
        {"name": "Fiber", "description": "Moderate - digestive health"},
        {"name": "Protein", "description": "Moderate - muscle building and satiety"}
      ]
    }
  ]
}

Return ONLY valid JSON, no markdown, no additional text. The ingredient_details for each ingredient MUST be personalized to the user's health profile.`;
  }

  async performMainAnalysis(userProfile, scannedIngredientsList, nutritionTable = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      const prompt = this.createMainAnalysisPrompt(userProfile, scannedIngredientsList, nutritionTable);

      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }]
      };

      const response = await axios.post(`${this.textApiUrl}?key=${this.apiKey}`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('No response from Gemini API');
      }

      // Extract JSON from response
      let jsonText = text.trim();
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const result = JSON.parse(jsonText);
      
      // Validate structure
      if (!result.overall_profile || !result.itemized_analysis || !Array.isArray(result.itemized_analysis)) {
        throw new Error('Invalid analysis response structure');
      }

      return result;

    } catch (error) {
      console.error('Gemini main analysis error:', error.response?.data?.error || error.message);
      throw new Error(`Failed to analyze ingredients: ${error.message}`);
    }
  }
}

module.exports = GeminiAPI;
