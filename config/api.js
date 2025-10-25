/**
 * @file api.js
 * @description Centralized API service for all interactions with the EduAI backend.
 */

const BASE_URL = 'https://eduserver-0ffm.onrender.com';

/**
 * A robust, generic wrapper around the fetch API.
 * @param {string} endpoint - The API endpoint to call.
 * @param {string} [method='GET'] - The HTTP method.
 * @param {object|null} [body=null] - The request payload.
 * @param {boolean} [isStream=false] - If true, returns the raw Response object for stream processing.
 * @returns {Promise<any>} The parsed JSON response or the raw Response object for streams.
 * @throws {Error} Throws a detailed error if the request fails.
 */
async function apiCall(endpoint, method = 'GET', body = null, isStream = false) {
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Server returned an invalid error format or is down.',
      }));
      throw new Error(errorData.error || `HTTP Error: ${response.status}`);
    }

    if (isStream) {
      return response;
    }
    if (response.status === 204) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${method} ${endpoint}:`, error.message);
    throw error;
  }
}

// --- Chat Service Functions ---

const startChatStream = (payload) => {
  return apiCall('/chat-stream', 'POST', payload, true);
};

const generateTitle = (message) => {
  return apiCall('/generate-title', 'POST', { message });
};

// --- Task Service Functions ---

const generateDailyTasks = (userId, pathId) => {
  return apiCall('/generate-daily-tasks', 'POST', { userId, pathId });
};

// --- Quiz & Analysis Functions ---

const analyzeQuiz = (quizPayload) => {
  return apiCall('/analyze-quiz', 'POST', quizPayload);
};

/**
 * The single, exported object containing all available API functions.
 * This acts as a clean, organized interface for the rest of the application.
 */
export const apiService = {
  // Chat
  startChatStream,
  generateTitle,

  // Tasks
  generateDailyTasks,

  // Analysis
  analyzeQuiz,
};