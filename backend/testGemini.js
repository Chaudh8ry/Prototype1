const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
console.log("Gemini API Key loaded:", process.env.GEMINI_API_KEY ? "✅" : "❌");

const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testGemini() {
  try {
    const prompt = "List three healthy breakfast ideas in JSON array format.";

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    };

    // CORRECT MODEL NAME
    const model = "gemini-2.5-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await axios.post(url, requestBody, {
      headers: { "Content-Type": "application/json" }
    });

    console.log("Gemini API raw response:");
    console.log(JSON.stringify(response.data, null, 2));

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("\nExtracted text output:");
    console.log(text);

  } catch (err) {
    console.error("Gemini API test failed:", err.response?.data || err.message);
  }
}

testGemini();
