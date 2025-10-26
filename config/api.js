/**
 * @file api.js
 * @description Centralized API service for all interactions with the EduAI backend.
 * ✨ [ENHANCED & CLEANED] Simplified to a single, robust apiCall function with abort support.
 */
import { API_CONFIG } from './appConfig';

const BASE_URL = API_CONFIG.BASE_URL;

async function apiCall(endpoint, method = 'GET', body = null, signal = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = { method, headers: { 'Content-Type': 'application/json' }, signal };
  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP Error: ${response.status}` }));
      throw new Error(errorData.error);
    }
    return response.status === 204 ? null : await response.json();
  } catch (error) {
    if (error.name !== 'AbortError') console.error(`API call failed:`, error.message);
    throw error;
  }
}

// --- API Service Functions ---
export const apiService = {
  getInteractiveChatReply: (payload, signal) => apiCall('/chat-interactive', 'POST', payload, signal),
  generateTitle: (message, signal) => apiCall('/generate-title', 'POST', { message }, signal),
  generateDailyTasks: (userId, pathId) => apiCall('/generate-daily-tasks', 'POST', { userId, pathId }),
  analyzeQuiz: (quizPayload) => apiCall('/analyze-quiz', 'POST', quizPayload),
};