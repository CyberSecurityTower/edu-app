 // functions/index.js

    const functions = require("firebase-functions");
    const admin = require("firebase-admin");
    const { GoogleGenerativeAI } = require("@google/generative-ai");

    // --- THIS IS THE LOCAL DEVELOPMENT SETUP ---
    // Load environment variables from .env file
    require('dotenv').config();
    // --- END OF LOCAL SETUP ---

    admin.initializeApp();

    // For local testing, we read directly from the .env file.
    // The deployed version will use secrets (which we will configure later).
    const geminiApiKey = process.env.GEMINI_API_KEY;

    exports.askEduAI = functions.https.onCall(async (data, context) => {
      if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
      }

      const userMessage = data.message;
      if (!userMessage || typeof userMessage !== "string" || userMessage.trim().length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "Please provide a valid message.");
      }

      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const result = await model.generateContent(userMessage);
        const response = await result.response;
        const botResponse = response.text();

        return { reply: botResponse };

      } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new functions.https.HttpsError("internal", "Failed to get a response from the AI model.");
      }
    });