
--- START OF FILE AppStateContext.js ---
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { audioService } from '../services/audioService';

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

  // ✅ THE FIX: timeLeft is now part of the timerSession object for atomic updates.
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

  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const backgroundTime = useRef(null);

  useEffect(() => {
    const getValidatedSettings = (storedSettingsString) => {
      if (!storedSettingsString) return DEFAULT_SETTINGS;
      try {
        const parsed = JSON.parse(storedSettingsString);
        if (parsed && Array.isArray(parsed.sessions) && parsed.sessions.length > 0) return parsed;
        return DEFAULT_SETTINGS;
      } catch (error) {
        console.error("Failed to parse stored settings, using default.", error);
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
        console.error("Failed to load initial data.", e);
        const initialDuration = DEFAULT_SETTINGS.sessions[0].focus;
        setTimerSession(prev => ({ ...prev, settings: DEFAULT_SETTINGS, duration: initialDuration, timeLeft: initialDuration }));
      }
    };
    loadInitialData();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) setUser({ uid: firebaseUser.uid, ...userDoc.data() });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return unsubscribeAuth;
  }, []);

  const _transitionToNextSession = useCallback(() => {
    setTimerSession(prev => {
      const { sessionType, currentCycle, settings } = prev;
      const sessionIndex = currentCycle - 1;
      const currentSessionConfig = settings.sessions[sessionIndex];

      if (sessionType === 'focus' && currentSessionConfig.break > 0) {
        return { ...prev, status: 'active', sessionType: 'break', duration: currentSessionConfig.break, timeLeft: currentSessionConfig.break };
      }

      const nextSessionIndex = sessionIndex + 1;
      if (nextSessionIndex < settings.sessions.length) {
        const nextSessionConfig = settings.sessions[nextSessionIndex];
        return { ...prev, status: 'active', sessionType: 'focus', duration: nextSessionConfig.focus, timeLeft: nextSessionConfig.focus, currentCycle: prev.currentCycle + 1 };
      }

      return { ...prev, status: 'finished', timeLeft: 0 };
    });
  }, []);

  const handleSessionFinish = useCallback(() => {
    if (timerSession.settings.enableAudioNotifications) audioService.playEffect('end-effect');
    _transitionToNextSession();
  }, [timerSession.settings.enableAudioNotifications, _transitionToNextSession]);

  useEffect(() => {
    if (timerSession.status !== 'active') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      // ✅ THE FIX: Use functional update to avoid stale state issues inside the interval.
      setTimerSession(prev => {
        if (prev.timeLeft <= 1) {
          clearInterval(intervalRef.current);
          handleSessionFinish();
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [timerSession.status, handleSessionFinish]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (timerSession.status === 'active' && backgroundTime.current) {
          const elapsed = Math.round((Date.now() - backgroundTime.current) / 1000);
          setTimerSession(prev => ({ ...prev, timeLeft: Math.max(0, prev.timeLeft - elapsed) }));
        }
        backgroundTime.current = null;
      } else if (nextAppState.match(/inactive|background/)) {
        backgroundTime.current = Date.now();
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [timerSession.status]);

  useEffect(() => {
    const { status, selectedSound } = timerSession;
    if (status === 'active') audioService.playSessionSound(selectedSound);
    else if (status === 'paused') audioService.pauseSessionSound();
    else audioService.stopSessionSound();
  }, [timerSession.status, timerSession.selectedSound]);

  const startTimer = useCallback((soundId) => {
    setTimerSession(prev => {
      if (prev.status === 'idle' || prev.status === 'finished') {
        if (prev.settings.enableAudioNotifications) audioService.playEffect('start-effect');
        if (prev.status === 'finished') {
          const firstSessionDuration = prev.settings.sessions[0].focus;
          return { ...prev, status: 'active', sessionType: 'focus', duration: firstSessionDuration, timeLeft: firstSessionDuration, currentCycle: 1, selectedSound: soundId };
        }
        // When starting from idle, ensure timeLeft is synced with duration.
        return { ...prev, status: 'active', timeLeft: prev.duration, selectedSound: soundId };
      }
      return prev;
    });
  }, []);

  const pauseTimer = useCallback(() => { if (timerSession.status === 'active') setTimerSession(prev => ({ ...prev, status: 'paused' })); }, [timerSession.status]);
  const resumeTimer = useCallback(() => { if (timerSession.status === 'paused') setTimerSession(prev => ({ ...prev, status: 'active' })); }, [timerSession.status]);
  const skipTimer = useCallback(() => { if (timerSession.status === 'active' || timerSession.status === 'paused') { if (intervalRef.current) clearInterval(intervalRef.current); handleSessionFinish(); } }, [timerSession.status, handleSessionFinish]);
  
  const endTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerSession(prev => {
      const firstSessionDuration = prev.settings.sessions[0].focus;
      return { ...prev, status: 'idle', sessionType: 'focus', duration: firstSessionDuration, timeLeft: firstSessionDuration, currentCycle: 1, selectedSound: null };
    });
  }, []);

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
    } catch (e) { console.error("Failed to save settings.", e); }
  }, []);

  const refreshPoints = useCallback(async () => { if (user?.uid) { const progressDoc = await getDoc(doc(db, 'userProgress', user.uid)); if (progressDoc.exists()) setPoints(progressDoc.data().stats?.points || 0); } }, [user?.uid]);
  
  // ✅ Pass the whole timerSession object. Consumers will destructure what they need.
  const value = { user, setUser, authLoading, hasCompletedOnboarding, setHasCompletedOnboarding, points, refreshPoints, timerSession, setTimerSession, startTimer, pauseTimer, resumeTimer, endTimer, resetTimer: endTimer, skipTimer, updateSettings };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};


export const useAppState = () => useContext(AppStateContext);