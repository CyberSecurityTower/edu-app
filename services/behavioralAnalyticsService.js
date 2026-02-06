
// services/behavioralAnalyticsService.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { supabase } from '../config/supabaseClient'; 
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { API_CONFIG } from '../config/appConfig';

const EVENTS_BUFFER_KEY = '@behavioral_events_buffer';
const MAX_BUFFER_SIZE = 50; // ✅ تحديد سقف للأحداث المخزنة محلياً
const RENDER_SERVER_URL = API_CONFIG.BASE_URL; // ✅ استخدام الرابط من الكونفيج

let isInitialized = false;
let eventsBuffer = [];
let currentSessionId = null;
let sessionStartTime = null;

const startNewSession = async () => {
  currentSessionId = uuidv4();
  sessionStartTime = new Date();
  eventsBuffer = [];
  
  const emptySession = { sessionId: currentSessionId, startTime: sessionStartTime, events: [] };
  try {
    await AsyncStorage.setItem(EVENTS_BUFFER_KEY, JSON.stringify(emptySession));
    console.log(`[Analytics] New session started: ${currentSessionId}`);
  } catch (e) {
    console.error('[Analytics] Failed to start session storage', e);
  }
};

const init = async () => {
  if (isInitialized) return;

  try {
    const previousSessionRaw = await AsyncStorage.getItem(EVENTS_BUFFER_KEY);
    if (previousSessionRaw) {
      const previousSession = JSON.parse(previousSessionRaw);
      if (previousSession.events && previousSession.events.length > 0) {
        console.log(`[Analytics] Found ${previousSession.events.length} unflushed events. Flushing now.`);
        // لا ننتظر الإرسال لكي لا نعطل بدء التطبيق
        flushBuffer(previousSession).catch(err => console.warn("Failed to flush old session", err));
      }
    }

    await startNewSession();

    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        console.log('[Analytics] App backgrounded. Flushing...');
        flushBuffer();
      }
    });

    isInitialized = true;
  } catch (error) {
    console.error('[Analytics] Init failed:', error);
  }
};

const logEvent = async (type, metadata = {}) => {
  if (!isInitialized) return;

  // ✅ الحماية من الامتلاء: حذف الأقدم إذا تجاوزنا الحد
  if (eventsBuffer.length >= MAX_BUFFER_SIZE) {
    // استراتيجية FIFO (First In First Out) - نحذف أول 10 أحداث لتوفير مساحة
    eventsBuffer.splice(0, 10); 
    console.warn('[Analytics] Buffer full, dropped oldest 10 events.');
  }

  const event = {
    type,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  eventsBuffer.push(event);

  // حفظ احتياطي في التخزين المحلي (Debounced يمكن أن يكون أفضل، لكن هذا آمن حالياً)
  try {
    const sessionToStore = {
      sessionId: currentSessionId,
      startTime: sessionStartTime,
      events: eventsBuffer,
    };
    await AsyncStorage.setItem(EVENTS_BUFFER_KEY, JSON.stringify(sessionToStore));
  } catch (error) {
    // فشل صامت للحفاظ على تجربة المستخدم
  }
};

const flushBuffer = async (sessionToFlush = null) => {
  const isFlushingPrevious = sessionToFlush !== null;
  const events = isFlushingPrevious ? sessionToFlush.events : eventsBuffer;
  const sId = isFlushingPrevious ? sessionToFlush.sessionId : currentSessionId;
  
  // حماية: إذا لم يكن هناك أحداث، لا تفعل شيئاً
  if (!events || events.length === 0) return;

  const sTime = isFlushingPrevious ? new Date(sessionToFlush.startTime) : sessionStartTime;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    await AsyncStorage.removeItem(EVENTS_BUFFER_KEY);
    return;
  }

  const endTime = new Date();
  const durationSeconds = Math.round((endTime.getTime() - sTime.getTime()) / 1000);

  // --- بناء الملخص (نفس المنطق السابق مع تحسينات طفيفة) ---
  const summary = {
    userId: user.uid,
    startTime: sTime.toISOString(),
    endTime: endTime.toISOString(),
    durationSeconds,
    appStateAtEnd: AppState.currentState,
    timePerSubject: {},
    lessonsViewedCount: 0,
    quickCloseCount: 0,
    fabInteractions: 0,
    studyKitsGenerated: 0,
    focusSessionsStarted: 0,
    focusSessionsCompleted: 0,
    totalFocusDurationSeconds: 0,
    platform: Platform.OS, // ✅ إضافة مفيدة للتحليلات
  };

  const lessonStartTimes = {};
  const focusSessionStartTimes = {};

  events.forEach(event => {
    try {
      switch (event.type) {
        case 'lesson_view_start':
          summary.lessonsViewedCount++;
          lessonStartTimes[event.lessonId] = new Date(event.timestamp);
          break;
        case 'lesson_view_end':
          if (lessonStartTimes[event.lessonId]) {
            const start = lessonStartTimes[event.lessonId];
            const end = new Date(event.timestamp);
            const duration = Math.round((end.getTime() - start.getTime()) / 1000);
            if (duration < 10) summary.quickCloseCount++;
            if (event.subjectId) {
              summary.timePerSubject[event.subjectId] = (summary.timePerSubject[event.subjectId] || 0) + duration;
            }
            delete lessonStartTimes[event.lessonId];
          }
          break;
        case 'fab_chat_opened': summary.fabInteractions++; break;
        case 'study_kit_generated': summary.studyKitsGenerated++; break;
        case 'focus_session_start':
          summary.focusSessionsStarted++;
          focusSessionStartTimes[event.taskId || 'general'] = new Date(event.timestamp);
          break;
        case 'focus_session_end':
          if (event.completed) summary.focusSessionsCompleted++;
          summary.totalFocusDurationSeconds += event.duration || 0;
          delete focusSessionStartTimes[event.taskId || 'general'];
          break;
      }
    } catch (err) {
      console.warn('[Analytics] Error processing event:', err);
    }
  });
try {
  // الإرسال
  const { error } = await supabase
      .from('user_behavior_analytics') // تأكد من إنشاء هذا الجدول
      .insert({
        user_id: user.id,
        session_id: sId,
        data: summary, // تخزين البيانات كـ JSONB
        created_at: new Date()
      });

    if (error) throw error;

    console.log(`[Analytics] Flushed session ${sId} to Supabase`);
    if (isFlushingPrevious) {
      await AsyncStorage.removeItem(EVENTS_BUFFER_KEY);
    } else {
      await startNewSession();
    }
  } catch (error) {
    console.error(`[Analytics] Flush failed:`, error);
    // لا نمسح الـ Buffer في حالة الفشل، سيتم المحاولة في المرة القادمة عند فتح التطبيق
  }
};

export const BehavioralAnalyticsService = {
  init,
  logEvent,
};