
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- UPDATED: Load environment variables more robustly ---
const dotenv = require('dotenv');
dotenv.config();
// --- END OF UPDATE ---

admin.initializeApp();
const db = admin.firestore();

// --- UPDATED: More explicit API Key check ---
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  console.error("FATAL ERROR: The GEMINI_API_KEY environment variable is not set.");
  console.error("Please ensure you have a .env file in the /functions directory with GEMINI_API_KEY=...YourKey...");
}
// --- END OF UPDATE ---

exports.askEduAI = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }

  const userMessage = data.message;
  if (!userMessage || typeof userMessage !== "string" || userMessage.trim().length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Please provide a valid message.");
  }

  // --- ADDED SAFETY CHECK ---
  if (!geminiApiKey) {
      console.error("Function called but API key is missing. Aborting.");
      throw new functions.https.HttpsError("internal", "AI service is not configured correctly.");
  }
  // --- END OF SAFETY CHECK ---

  const uid = context.auth.uid;

  try {
    const userProgressRef = db.collection('userProgress').doc(uid);
    const progressDoc = await userProgressRef.get();

    let userStats = { displayName: "Student", points: 0 };
    if (progressDoc.exists) {
      userStats = {
        displayName: progressDoc.data().stats?.displayName || "Student",
        points: progressDoc.data().stats?.points || 0,
      };
    }
    
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

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat();
    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    const botResponse = response.text();

    return { reply: botResponse };

  } catch (error) {
    // --- UPDATED: Log the actual error from Gemini ---
    console.error("Detailed error from Gemini API or Firestore:", error);
    // --- END OF UPDATE ---
    throw new functions.https.HttpsError("internal", "I'm having a little trouble thinking right now, please try again in a moment.");
  }
});