// services/behavioralAnalyticsService.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const EVENTS_BUFFER_KEY = '@behavioral_events_buffer';
// !! مهم: تأكد من أن هذا هو الرابط الصحيح لسيرفرك على Render
const RENDER_SERVER_URL = 'https://eduserver-htnt.onrender.com';

let isInitialized = false;
let eventsBuffer = [];
let currentSessionId = null;
let sessionStartTime = null;

const startNewSession = async () => {
  currentSessionId = uuidv4();
  sessionStartTime = new Date();
  eventsBuffer = [];
  // عند بدء جلسة جديدة، نقوم بإنشاء سجل فارغ في AsyncStorage
  // هذا يضمن أننا إذا أغلقنا التطبيق فورًا، فلن يتم إرسال بيانات الجلسة السابقة مرة أخرى
  const emptySession = { sessionId: currentSessionId, startTime: sessionStartTime, events: [] };
  await AsyncStorage.setItem(EVENTS_BUFFER_KEY, JSON.stringify(emptySession));
  console.log(`[Analytics] New session started: ${currentSessionId}`);
};

const init = async () => {
  if (isInitialized) return;

  try {
    const previousSessionRaw = await AsyncStorage.getItem(EVENTS_BUFFER_KEY);
    if (previousSessionRaw) {
      const previousSession = JSON.parse(previousSessionRaw);
      if (previousSession.events && previousSession.events.length > 0) {
        console.log(`[Analytics] Found ${previousSession.events.length} unflushed events. Flushing now.`);
        // استدعاء دالة الإرسال مع البيانات القديمة
        flushBuffer(previousSession);
      }
    }

    await startNewSession();

    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        console.log('[Analytics] App is going to background. Flushing current session...');
        flushBuffer(); // استدعاء عادي للجلسة الحالية
      }
    });

    isInitialized = true;
    console.log('[Analytics] Service initialized successfully.');
  } catch (error) {
    console.error('[Analytics] Failed to initialize service:', error);
  }
};

const logEvent = async (type, metadata = {}) => {
  if (!isInitialized) {
    return;
  }

  const event = {
    type,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  eventsBuffer.push(event);

  try {
    const sessionToStore = {
      sessionId: currentSessionId,
      startTime: sessionStartTime,
      events: eventsBuffer,
    };
    await AsyncStorage.setItem(EVENTS_BUFFER_KEY, JSON.stringify(sessionToStore));
  } catch (error) {
    console.error('[Analytics] Failed to save event buffer to AsyncStorage:', error);
  }
};

const flushBuffer = async (sessionToFlush = null) => {
  const isFlushingPrevious = sessionToFlush !== null;
  const events = isFlushingPrevious ? sessionToFlush.events : eventsBuffer;
  const sId = isFlushingPrevious ? sessionToFlush.sessionId : currentSessionId;
  const sTime = isFlushingPrevious ? new Date(sessionToFlush.startTime) : sessionStartTime;

  if (!events || events.length === 0) {
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    // إذا لم يكن هناك مستخدم، نمسح المخزن المؤقت لمنع إرساله لاحقًا
    await AsyncStorage.removeItem(EVENTS_BUFFER_KEY);
    return;
  }

  const endTime = new Date();
  const durationSeconds = Math.round((endTime.getTime() - sTime.getTime()) / 1000);

  // --- بناء الملخص ---
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
  };

  const lessonStartTimes = {};
  const focusSessionStartTimes = {}; // لتتبع مدة الجلسات

  // --- ✅ التصحيح الحاسم هنا ---
  // استخدام متغير 'events' بدلاً من 'eventsBuffer'
  events.forEach(event => {
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
          
          if (duration < 10) {
            summary.quickCloseCount++;
          }
          
          if (event.subjectId) {
            summary.timePerSubject[event.subjectId] = (summary.timePerSubject[event.subjectId] || 0) + duration;
          }
          delete lessonStartTimes[event.lessonId];
        }
        break;
      case 'fab_chat_opened':
        summary.fabInteractions++;
        break;
      case 'study_kit_generated':
        summary.studyKitsGenerated++;
        break;
        case 'focus_session_start':
        summary.focusSessionsStarted++;
        // نسجل وقت البدء لتتبع المدة إذا انتهت الجلسة بشكل غير متوقع
        focusSessionStartTimes[event.taskId || 'general'] = new Date(event.timestamp);
        break;
      
      case 'focus_session_end':
        if (event.completed) {
          summary.focusSessionsCompleted++;
        }
        // event.duration هي المدة الكاملة المخطط لها للجلسة
        summary.totalFocusDurationSeconds += event.duration || 0;
        delete focusSessionStartTimes[event.taskId || 'general']; // نحذفها لأنها انتهت بنجاح
        break;
    }
  });

  try {
    const sessionDocRef = doc(db, 'userBehaviorAnalytics', user.uid, 'sessions', sId);
    await setDoc(sessionDocRef, summary);
    console.log(`[Analytics] Successfully flushed session ${sId} to Firestore.`);
    
    // إخطار السيرفر
    fetch(`${RENDER_SERVER_URL}/process-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.uid, sessionId: sId }),
    }).catch(apiError => {
      console.error('[Analytics] Failed to notify server:', apiError);
    });

    if (isFlushingPrevious) {
      // إذا أرسلنا جلسة قديمة، نمسح المخزن المؤقت فقط
      await AsyncStorage.removeItem(EVENTS_BUFFER_KEY);
    } else {
      // إذا أرسلنا الجلسة الحالية، نبدأ جلسة جديدة (والتي ستقوم بمسح المخزن المؤقت)
      await startNewSession();
    }

  } catch (error) {
    console.error(`[Analytics] Failed to flush session ${sId} to Firestore:`, error);
  }
};

export const BehavioralAnalyticsService = {
  init,
  logEvent,
};