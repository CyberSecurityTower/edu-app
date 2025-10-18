// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load environment variables from .env file for local development
require('dotenv').config();

admin.initializeApp();
const db = admin.firestore(); // Get a reference to Firestore

// Read the API key from our local .env file
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  console.error("FATAL ERROR: GEMINI_API_KEY is not set in .env file.");
}

exports.askEduAI = functions.https.onCall(async (data, context) => {
  // 1. Authentication Check
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }

  // 2. Input Validation
  const userMessage = data.message;
  if (!userMessage || typeof userMessage !== "string" || userMessage.trim().length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Please provide a valid message.");
  }

  const uid = context.auth.uid;

  try {
    // --- NEW: STEP 2 - GIVE THE AI MEMORY ---
    // Fetch the user's progress data from Firestore
    const userProgressRef = db.collection('userProgress').doc(uid);
    const progressDoc = await userProgressRef.get();

    let userStats = {
      displayName: "Student",
      points: 0,
    };

    if (progressDoc.exists) {
      userStats = {
        displayName: progressDoc.data().stats?.displayName || "Student",
        points: progressDoc.data().stats?.points || 0,
      };
    }
    
    // --- NEW: STEP 1 - GIVE THE AI A PERSONALITY ---
    // This is the "constitution" or "system prompt" for our AI
    const systemPrompt = `
      You are EduAI, a friendly, encouraging, and slightly playful AI study companion for Algerian university students.
      Your goal is to motivate, help, and guide students, not just answer questions.
      
      CONTEXT:
      - You are speaking with: ${userStats.displayName}.
      - They currently have: ${userStats.points} points.
      
      YOUR BEHAVIOR:
      - Always be positive and encouraging.
      - Use emojis to make the conversation more engaging. 😊👍🧠
      - Keep your answers concise and easy to understand.
      - Address the user by their name when it feels natural.
      - If you don't know an answer, say so honestly. Do not make up facts.
      - Your purpose is to be a tutor, not a tool for cheating.
    `;

    // Initialize the AI client
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      // --- NEW: We pass the personality as a system instruction ---
      systemInstruction: systemPrompt,
    });

    // Start a chat session to maintain context within a single call
    const chat = model.startChat();

    // --- NEW: STEP 3 - COMBINE EVERYTHING ---
    // Send the user's actual message to the AI
    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    const botResponse = response.text();

    console.log(`User: ${userStats.displayName}, Points: ${userStats.points}, Message: "${userMessage}"`);
    console.log(`EduAI Reply: "${botResponse}"`);

    // Return the AI's intelligent reply to the app
    return { reply: botResponse };

  } catch (error) {
    console.error("Error processing AI request:", error);
    throw new functions.https.HttpsError("internal", "I'm having a little trouble thinking right now, please try again in a moment.");
  }
});