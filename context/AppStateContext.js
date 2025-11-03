
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { audioService } from '../services/audioService';
import BackgroundTimer from 'react-native-background-timer'; // ✅ استيراد المكتبة الجديدة

const AppStateContext = createContext();

const ASYNC_STORAGE_SETTINGS_KEY = '@lastActiveTimerSettings';

const DEFAULT_SETTINGS = {
  sessions: [
    { focus: 25 * 60, break: 5 * 60 },
    { focus: 25 * 60, break: 5 * 60 },
    { focus: 25 * 60, break: 5 * 60 },
    { focus: 25 * 60, break: 5 * 60 },
  ],
  autoStartNextSession: true,
  enableAudioNotifications: true,
};

export const AppStateProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);
  const [points, setPoints] = useState(0);

  const [timerSession, setTimerSession] = useState({
    status: 'idle',
    sessionType: 'focus',
    duration: DEFAULT_SETTINGS.sessions[0].focus,
    timeLeft: DEFAULT_SETTINGS.sessions[0].focus,
    currentCycle: 1,
    taskTitle: null,
    taskId: null,
    selectedSound: null,
    settings: DEFAULT_SETTINGS,
  });

  // ✅ تم حذف كل الـ refs المتعلقة بالمؤقت القديم (intervalRef, appState, backgroundTime)

  useEffect(() => {
    // ... (الكود الخاص بتحميل الإعدادات والمستخدم يبقى كما هو)
    const getValidatedSettings = (storedSettingsString) => {
      if (!storedSettingsString) return DEFAULT_SETTINGS;
      try {
        const parsed = JSON.parse(storedSettingsString);
        if (parsed && Array.isArray(parsed.sessions) && parsed.sessions.length > 0) return parsed;
        return DEFAULT_SETTINGS;
      } catch (error) {
        console.error('Failed to parse stored settings, using default.', error);
        return DEFAULT_SETTINGS;
      }
    };

    const loadInitialData = async () => {
      try {
        const onboarding = await AsyncStorage.getItem('@hasCompletedOnboarding');
        setHasCompletedOnboarding(onboarding === 'true');
        const storedSettingsString = await AsyncStorage.getItem(ASYNC_STORAGE_SETTINGS_KEY);
        const settings = getValidatedSettings(storedSettingsString);
        const initialDuration = settings.sessions[0].focus;
        setTimerSession(prev => ({ ...prev, settings, duration: initialDuration, timeLeft: initialDuration }));
      } catch (e) {
        console.error('Failed to load initial data.', e);
        const initialDuration = DEFAULT_SETTINGS.sessions[0].focus;
        setTimerSession(prev => ({ ...prev, settings: DEFAULT_SETTINGS, duration: initialDuration, timeLeft: initialDuration }));
      }
    };
    loadInitialData();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) setUser({ uid: firebaseUser.uid, ...userDoc.data() });
          else setUser({ uid: firebaseUser.uid });
        } catch (e) {
          console.error('Failed to fetch user doc', e);
          setUser({ uid: firebaseUser.uid });
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => {
      unsubscribeAuth();
      BackgroundTimer.stopBackgroundTimer(); // ✅ التأكد من إيقاف المؤقت عند تفكيك المكون
    };
  }, []);

  const _transitionToNextSession = useCallback((currentSession) => {
    const { sessionType, currentCycle, settings } = currentSession;
    const sessionIndex = currentCycle - 1;
    const currentSessionConfig = settings.sessions[sessionIndex];

    if (sessionType === 'focus' && currentSessionConfig.break > 0) {
      return { ...currentSession, status: 'active', sessionType: 'break', duration: currentSessionConfig.break, timeLeft: currentSessionConfig.break };
    }

    const nextSessionIndex = sessionIndex + 1;
    if (nextSessionIndex < settings.sessions.length) {
      const nextSessionConfig = settings.sessions[nextSessionIndex];
      return { ...currentSession, status: 'active', sessionType: 'focus', duration: nextSessionConfig.focus, timeLeft: nextSessionConfig.focus, currentCycle: currentSession.currentCycle + 1 };
    }

    return { ...currentSession, status: 'finished', timeLeft: 0 };
  }, []);

  const handleSessionFinish = useCallback(() => {
    setTimerSession(prev => {
      if (prev.settings.enableAudioNotifications) {
        audioService.playEffect('end-effect');
      }
      const nextState = _transitionToNextSession(prev);
      if (nextState.status === 'active') {
        // ✅ ابدأ المؤقت للجلسة التالية تلقائيًا
        startTimerLogic(nextState);
      }
      return nextState;
    });
  }, [_transitionToNextSession]);
  
  // ✅ [NEW] الدالة الأساسية التي تشغل المؤقت
  const startTimerLogic = (sessionState) => {
    BackgroundTimer.runBackgroundTimer(() => {
      setTimerSession(prev => {
        // التأكد من أن المؤقت لا يزال نشطًا لتجنب التحديثات غير المرغوب فيها
        if (prev.status !== 'active') {
          BackgroundTimer.stopBackgroundTimer();
          return prev;
        }
        
        const newTimeLeft = prev.timeLeft - 1;
        if (newTimeLeft <= 0) {
          BackgroundTimer.stopBackgroundTimer();
          // استدعاء دالة الانتهاء بعد تحديث الحالة لتجنب race conditions
          setTimeout(handleSessionFinish, 0); 
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: newTimeLeft };
      });
    }, 1000);
  };

  const startTimer = useCallback((soundId) => {
    setTimerSession(prev => {
      if (prev.status === 'idle' || prev.status === 'finished') {
        if (prev.settings.enableAudioNotifications) audioService.playEffect('start-effect');

        let newState;
        if (prev.status === 'finished') {
          const firstSessionDuration = prev.settings.sessions[0].focus;
          newState = { ...prev, status: 'active', sessionType: 'focus', duration: firstSessionDuration, timeLeft: firstSessionDuration, currentCycle: 1, selectedSound: soundId };
        } else {
          newState = { ...prev, status: 'active', selectedSound: soundId };
        }
        
        startTimerLogic(newState); // ✅ بدء المؤقت
        return newState;
      }
      return prev;
    });
  }, [handleSessionFinish]);

  const pauseTimer = useCallback(() => {
    BackgroundTimer.stopBackgroundTimer(); // ✅ إيقاف المؤقت
    setTimerSession(prev => (prev.status === 'active' ? { ...prev, status: 'paused' } : prev));
  }, []);

  const resumeTimer = useCallback(() => {
    setTimerSession(prev => {
      if (prev.status === 'paused') {
        const newState = { ...prev, status: 'active' };
        startTimerLogic(newState); // ✅ استئناف المؤقت
        return newState;
      }
      return prev;
    });
  }, []);

  const skipTimer = useCallback(() => {
    BackgroundTimer.stopBackgroundTimer(); // ✅ إيقاف المؤقت الحالي
    handleSessionFinish(); // ✅ الانتقال للجلسة التالية
  }, [handleSessionFinish]);

  const endTimer = useCallback(() => {
    BackgroundTimer.stopBackgroundTimer(); // ✅ إيقاف المؤقت
    setTimerSession(prev => {
      const firstSessionDuration = prev.settings.sessions[0].focus;
      return { ...prev, status: 'idle', sessionType: 'focus', duration: firstSessionDuration, timeLeft: firstSessionDuration, currentCycle: 1, selectedSound: null };
    });
  }, []);
  
  // session sound management — reacts to status and selectedSound
  useEffect(() => {
    const { status, selectedSound } = timerSession;
    if (status === 'active') audioService.playSessionSound(selectedSound);
    else if (status === 'paused') audioService.pauseSessionSound();
    else audioService.stopSessionSound();
  }, [timerSession.status, timerSession.selectedSound]);

  const updateSettings = useCallback(async (newSettings) => {
    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_SETTINGS_KEY, JSON.stringify(newSettings));
      setTimerSession(prev => {
        const firstSessionDuration = newSettings.sessions[0].focus;
        if (prev.status === 'idle' || prev.status === 'finished') {
          return { ...prev, settings: newSettings, duration: firstSessionDuration, timeLeft: firstSessionDuration, sessionType: 'focus', currentCycle: 1 };
        }
        return { ...prev, settings: newSettings };
      });
    } catch (e) { console.error('Failed to save settings.', e); }
  }, []);

  const refreshPoints = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const progressDoc = await getDoc(doc(db, 'userProgress', user.uid));
      if (progressDoc.exists()) setPoints(progressDoc.data().stats?.points || 0);
    } catch (e) { console.error('Failed to refresh points', e); }
  }, [user?.uid]);
  
  const value = { user, setUser, authLoading, hasCompletedOnboarding, setHasCompletedOnboarding, points, refreshPoints, timerSession, setTimerSession, startTimer, pauseTimer, resumeTimer, endTimer, resetTimer: endTimer, skipTimer, updateSettings };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => useContext(AppStateContext);