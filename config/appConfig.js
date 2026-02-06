
// config/appConfig.js

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const API_CONFIG = {
  BASE_URL: API_URL,
  TIMEOUT: 60000, 
};

export const STORAGE_KEYS = {
  CHAT_SESSIONS: '@chat_sessions_v2',
  USER_PROGRESS: '@user_progress_cache', // توحيد مفاتيح التخزين هنا
};