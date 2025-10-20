/**
 * @file api.js
 * @description Centralized API service for all interactions with the EduAI backend.
 * This file abstracts away the complexity of fetch calls, headers, and error handling.
 */

// --- Configuration ---
// The base URL for your backend server.
// It's defined here so it can be easily changed for development or production.
const BASE_URL = 'https://eduserver-1.onrender.com';

/**
 * A generic wrapper around the fetch API to handle common logic.
 * It automatically stringifies the body, sets JSON headers, and provides
 * robust error handling for failed requests.
 *
 * @param {string} endpoint - The API endpoint to call (e.g., '/chat').
 * @param {string} [method='GET'] - The HTTP method (GET, POST, etc.).
 * @param {object|null} [body=null] - The request body for POST/PUT requests.
 * @returns {Promise<any>} The JSON response from the server.
 * @throws {Error} Throws an error if the network request fails or the server returns an error status.
 */
async function apiCall(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {},
  };

  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);

    // If the server response is not OK (e.g., 400, 404, 500), try to parse the error and throw it.
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Server returned an invalid error format or is down.',
      }));
      throw new Error(errorData.error || `HTTP Error: ${response.status}`);
    }

    // Handle successful responses that might not have content (e.g., status 204).
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${method} ${endpoint}:`, error.message);
    // Re-throw the error so the calling component's catch block can handle it (e.g., show a toast).
    throw error;
  }
}

// --- API Service Functions ---

/**
 * Sends a user's message to the chat endpoint to be processed in the background.
 * @param {string} userId - The ID of the user sending the message.
 * @param {string} message - The content of the user's message.
 * @returns {Promise<{reply: string, jobId: string}>} The initial acknowledgement reply and the background job ID.
 */
const startChat = (userId, message) => {
  return apiCall('/chat', 'POST', { userId, message });
};

/**
 * Requests the server to generate a new set of daily tasks for the user.
 * @param {string} userId - The ID of the user for whom to generate tasks.
 * @returns {Promise<{success: boolean, source: string, tasks: Array<object>}>} The result of the generation request.
 */
const generateDailyTasks = (userId) => {
  return apiCall('/generate-daily-tasks', 'POST', { userId });
};

/**
 * Submits the results of a quiz to the backend for AI analysis.
 * @param {object} quizPayload - The data object containing quiz results.
 * @param {string} quizPayload.userId - The user's ID.
 * @param {string} quizPayload.lessonTitle - The title of the lesson.
 * @param {Array<object>} quizPayload.quizQuestions - The original questions and answers.
 * @param {Array<string|null>} quizPayload.userAnswers - The answers provided by the user.
 * @param {number} quizPayload.totalScore - The user's final score.
 * @returns {Promise<{newMasteryScore: number, feedbackSummary: string, suggestedNextStep: string}>} The AI-generated analysis.
 */
const analyzeQuiz = (quizPayload) => {
  return apiCall('/analyze-quiz', 'POST', quizPayload);
};

/**
 * Requests a short, descriptive title for a given message.
 * @param {string} message - The message to be summarized into a title.
 * @returns {Promise<{title: string}>} An object containing the generated title.
 */
const generateTitle = (message) => {
  return apiCall('/generate-title', 'POST', { message });
};

/**
 * A collection of all API functions, exported for use throughout the application.
 */
export const apiService = {
  startChat,
  generateDailyTasks,
  analyzeQuiz,
  generateTitle,
};