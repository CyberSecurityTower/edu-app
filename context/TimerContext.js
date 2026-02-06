
// context/TimerContext.js

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import BackgroundTimer from 'react-native-background-timer';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ استيراد
import { AppState } from 'react-native'; // ✅ استيراد لمراقبة حالة التطبيق
import { audioService } from '../services/audioService';

const TimerContext = createContext(null);
export const useTimer = () => useContext(TimerContext);

const TIMER_STORAGE_KEY = '@timer_state_v1';

const createInitialState = () => ({
  status: 'idle',
  timeLeft: 0,
  duration: 0,
  taskId: null,
  taskTitle: null,
  selectedSound: null,
  lastUpdated: null, // ✅ حقل جديد لحساب الوقت المنقضي
  notificationMeta: null, // ✅ NEW: Store notification meta
});

export const TimerProvider = ({ children }) => {
  const [timerSession, setTimerSession] = useState(createInitialState());
  const onFinishCallback = useRef(null);
  const timeLeftShared = useSharedValue(0);
  const sessionRef = useRef(timerSession);
  
  // تحديث الـ Ref دائماً
  useEffect(() => { sessionRef.current = timerSession; }, [timerSession]);

  // ✅ دالة لحفظ حالة المؤقت
  const persistTimerState = async (state) => {
    try {
      const stateToSave = {
        ...state,
        lastUpdated: Date.now(), // نحفظ وقت الحفظ
      };
      await AsyncStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to persist timer', e);
    }
  };

  // ✅ دالة لمسح حالة المؤقت
  const clearPersistedTimer = async () => {
    try {
      await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
    } catch (e) { console.error(e); }
  };

  
  // ✅ استعادة المؤقت عند فتح التطبيق (مع معالجة الانتهاء في الخلفية)
  useEffect(() => {
    const restoreTimer = async () => {
      try {
        const savedRaw = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
        if (savedRaw) {
          const savedState = JSON.parse(savedRaw);
          
          if (savedState.status === 'active') {
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - savedState.lastUpdated) / 1000);
            const newTimeLeft = savedState.timeLeft - elapsedSeconds;

            if (newTimeLeft > 0) {
              // الحالة 1: الوقت لم ينتهِ بعد -> استئناف طبيعي
              const restoredSession = { ...savedState, timeLeft: newTimeLeft };
              setTimerSession(restoredSession);
              timeLeftShared.value = newTimeLeft;
              runTimer();
              audioService.playSessionSound(restoredSession.selectedSound);
            } else {
              // الحالة 2: الوقت انتهى أثناء غلق التطبيق -> تفعيل إنهاء الجلسة
              console.log("Timer expired while app was closed/backgrounded");
              
              // 1. تنظيف الحالة المحفوظة
              await clearPersistedTimer();
              setTimerSession(createInitialState());

              // 2. تفعيل الـ Callback يدوياً (لأن الـ ref ضاع عند غلق التطبيق)
              // بما أن onFinishCallback.current سيكون null بعد إعادة التشغيل،
              // نحتاج لطريقة لإخبار AppStateContext بأن الجلسة انتهت.
              
              // الحل: سنستخدم حدث مخصص أو نحدث حالة خاصة
              // لكن الأبسط هنا هو استخدام setTimeout صغير لضمان تحميل AppStateContext أولاً
              // ثم استدعاء دالة "معالجة جلسة منتهية" سنمررها عبر الـ Context
              
              // سنقوم بتخزين "جلسة منتهية معلقة" في الـ State ليقرأها AppStateContext
              setExpiredSession(savedState); 
            }
          } else if (savedState.status === 'paused') {
            setTimerSession(savedState);
            timeLeftShared.value = savedState.timeLeft;
          }
        }
      } catch (e) {
        console.error('Failed to restore timer', e);
      }
    };
    restoreTimer();
  }, []);
  // ✅ حفظ الحالة عند تغيير التطبيق للخلفية أو الأمام
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        if (sessionRef.current.status !== 'idle') {
          persistTimerState(sessionRef.current);
        }
      }
    });
    return () => subscription.remove();
  }, []);

  const runTimer = useCallback(() => {
    BackgroundTimer.stopBackgroundTimer(); // تأكد من إيقاف أي مؤقت سابق
    BackgroundTimer.runBackgroundTimer(() => {
      const newTimeLeft = timeLeftShared.value - 1;

      if (newTimeLeft < 1) {
        BackgroundTimer.stopBackgroundTimer();
        
        const finishedSession = { ...sessionRef.current, timeLeft: 0 };
        const callback = onFinishCallback.current;

        runOnJS(() => {
          if (callback) callback(finishedSession);
          setTimerSession(createInitialState());
          clearPersistedTimer(); // ✅ مسح الحفظ عند الانتهاء
          onFinishCallback.current = null;
        })();

        timeLeftShared.value = 0;
      } else {
        timeLeftShared.value = newTimeLeft;
        // تحديث الـ State كل ثانية (يمكن تقليل التكرار لتحسين الأداء، لكن ثانية مقبولة)
        runOnJS(() => {
          setTimerSession(prev => {
            const updated = { ...prev, timeLeft: newTimeLeft };
            // ✅ حفظ الحالة كل 5 ثوانٍ فقط لتقليل الكتابة على القرص
            if (newTimeLeft % 5 === 0) persistTimerState(updated);
            return updated;
          });
        })();
      }
    }, 1000);
  }, [timeLeftShared]);

  // ✅ [MODIFIED]: Now accepts notificationMeta
  const startTimer = useCallback((task, onFinish, notificationMeta = null) => {
    if (!task || sessionRef.current.status !== 'idle') return;
    const durationInSeconds = (task.duration || 25) * 60;
    const newState = {
      status: 'active',
      taskId: task.id,
      taskTitle: task.title,
      duration: durationInSeconds,
      timeLeft: durationInSeconds,
      selectedSound: task.ambientSound || 'quiet-rain',
      lastUpdated: Date.now(),
      notificationMeta: notificationMeta, // ✅ Store notification meta
    };
    timeLeftShared.value = durationInSeconds;
    setTimerSession(newState);
    persistTimerState(newState); // ✅ حفظ فوري عند البدء
    onFinishCallback.current = onFinish;
    runTimer();
    audioService.playEffect('start-effect');
  }, [runTimer, timeLeftShared]);

  const pauseTimer = useCallback(() => {
    BackgroundTimer.stopBackgroundTimer();
    setTimerSession(prev => {
      const newState = { ...prev, status: 'paused', lastUpdated: Date.now() };
      persistTimerState(newState); // ✅ حفظ حالة الإيقاف
      return newState;
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setTimerSession(prev => {
      if (prev.status === 'paused') {
        runTimer();
        const newState = { ...prev, status: 'active', lastUpdated: Date.now() };
        persistTimerState(newState); // ✅ حفظ حالة الاستئناف
        return newState;
      }
      return prev;
    });
  }, [runTimer]);

  const endTimer = useCallback(() => {
    BackgroundTimer.stopBackgroundTimer();
    audioService.stopSessionSound();
    timeLeftShared.value = 0;
    setTimerSession(createInitialState());
    clearPersistedTimer(); // ✅ تنظيف الحفظ
    onFinishCallback.current = null;
  }, [timeLeftShared]);
// ✅ إضافة State جديد لتمرير الجلسة المنتهية
  const [expiredSession, setExpiredSession] = useState(null);

  // ✅ دالة لمسح الجلسة المنتهية بعد معالجتها
  const clearExpiredSession = useCallback(() => {
    setExpiredSession(null);
  }, []);

  const value = {
    timerSession,
    timeLeftShared,
    startTimer,
    pauseTimer,
    resumeTimer,
    endTimer,
    expiredSession, // تصدير هذا المتغير
    clearExpiredSession, // وتصدير دالة المسح
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};