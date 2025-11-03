
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

  const [timerSession, setTimerSession] = useState({
    status: 'idle',
    sessionType: 'focus',
    duration: DEFAULT_SETTINGS.sessions[0].focus,
    currentCycle: 1,
    taskTitle: null,
    taskId: null,
    selectedSound: null,
    settings: DEFAULT_SETTINGS,
  });
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.sessions[0].focus);
  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const backgroundTime = useRef(null);

  useEffect(() => {
    // ✅ THE FIX: A robust function to validate settings from storage.
    const getValidatedSettings = (storedSettingsString) => {
      if (!storedSettingsString) {
        return DEFAULT_SETTINGS;
      }
      try {
        const parsed = JSON.parse(storedSettingsString);
        // This check ensures the settings are in the new format.
        if (parsed && Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
          return parsed;
        }
        // If the check fails, it's an old format or corrupted. Fallback to default.
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
        // Use the validation function to get safe settings
        const settings = getValidatedSettings(storedSettingsString);
        
        setTimerSession(prev => ({
          ...prev,
          settings,
          duration: settings.sessions[0].focus, // This is now safe
        }));
        setTimeLeft(settings.sessions[0].focus); // This is also safe
      } catch (e) {
        console.error("Failed to load initial data.", e);
        // Final fallback in case of any other error
        setTimerSession(prev => ({
            ...prev,
            settings: DEFAULT_SETTINGS,
            duration: DEFAULT_SETTINGS.sessions[0].focus,
        }));
        setTimeLeft(DEFAULT_SETTINGS.sessions[0].focus);
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
    const { sessionType, currentCycle, settings } = timerSession;
    const sessionIndex = currentCycle - 1;
    const currentSessionConfig = settings.sessions[sessionIndex];

    if (sessionType === 'focus') {
      if (currentSessionConfig.break > 0) {
        setTimerSession(prev => ({ ...prev, status: 'active', sessionType: 'break', duration: currentSessionConfig.break }));
        setTimeLeft(currentSessionConfig.break);
        return;
      }
    }

    const nextSessionIndex = sessionIndex + 1;
    if (nextSessionIndex < settings.sessions.length) {
      const nextSessionConfig = settings.sessions[nextSessionIndex];
      setTimerSession(prev => ({ ...prev, status: 'active', sessionType: 'focus', duration: nextSessionConfig.focus, currentCycle: prev.currentCycle + 1 }));
      setTimeLeft(nextSessionConfig.focus);
    } else {
      setTimerSession(prev => ({ ...prev, status: 'finished' }));
      setTimeLeft(0);
    }
  }, [timerSession]);

  const handleSessionFinish = useCallback(() => {
    if (timerSession.settings.enableAudioNotifications) {
      audioService.playEffect('end-effect');
    }
    _transitionToNextSession();
  }, [timerSession.settings.enableAudioNotifications, _transitionToNextSession]);

  useEffect(() => {
    if (timerSession.status !== 'active') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          handleSessionFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [timerSession.status, handleSessionFinish]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (timerSession.status === 'active' && backgroundTime.current) {
          const elapsed = Math.round((Date.now() - backgroundTime.current) / 1000);
          setTimeLeft(prev => Math.max(0, prev - elapsed));
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
    if (timerSession.status === 'idle' || timerSession.status === 'finished') {
      if (timerSession.settings.enableAudioNotifications) audioService.playEffect('start-effect');
      const firstSessionDuration = timerSession.settings.sessions[0].focus;
      if (timerSession.status === 'finished') {
        setTimeLeft(firstSessionDuration);
        setTimerSession(prev => ({ ...prev, status: 'active', sessionType: 'focus', duration: firstSessionDuration, currentCycle: 1, selectedSound: soundId }));
      } else {
         setTimeLeft(timerSession.duration);
         setTimerSession(prev => ({ ...prev, status: 'active', selectedSound: soundId }));
      }
    }
  }, [timerSession]);

  const pauseTimer = useCallback(() => { if (timerSession.status === 'active') setTimerSession(prev => ({ ...prev, status: 'paused' })); }, [timerSession.status]);
  const resumeTimer = useCallback(() => { if (timerSession.status === 'paused') setTimerSession(prev => ({ ...prev, status: 'active' })); }, [timerSession.status]);
  const skipTimer = useCallback(() => { if (timerSession.status === 'active' || timerSession.status === 'paused') { if (intervalRef.current) clearInterval(intervalRef.current); handleSessionFinish(); } }, [timerSession.status, handleSessionFinish]);
  
  const endTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const currentSettings = timerSession.settings;
    const firstSessionDuration = currentSettings.sessions[0].focus;
    setTimerSession(prev => ({ ...prev, status: 'idle', sessionType: 'focus', duration: firstSessionDuration, currentCycle: 1, selectedSound: null }));
    setTimeLeft(firstSessionDuration);
  }, [timerSession.settings]);

  const updateSettings = useCallback(async (newSettings) => {
    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_SETTINGS_KEY, JSON.stringify(newSettings));
      setTimerSession(prev => {
        const shouldResetTimer = prev.status === 'idle' || prev.status === 'finished';
        const firstSessionDuration = newSettings.sessions[0].focus;
        if (shouldResetTimer) {
          setTimeLeft(firstSessionDuration);
          return { ...prev, settings: newSettings, duration: firstSessionDuration, sessionType: 'focus', currentCycle: 1 };
        }
        return { ...prev, settings: newSettings };
      });
    } catch (e) { console.error("Failed to save settings.", e); }
  }, []);

  const refreshPoints = useCallback(async () => { if (user?.uid) { const progressDoc = await getDoc(doc(db, 'userProgress', user.uid)); if (progressDoc.exists()) setPoints(progressDoc.data().stats?.points || 0); } }, [user?.uid]);
  
  const value = { user, setUser, authLoading, hasCompletedOnboarding, setHasCompletedOnboarding, points, refreshPoints, timerSession, setTimerSession, timeLeft, startTimer, pauseTimer, resumeTimer, endTimer, resetTimer: endTimer, skipTimer, updateSettings };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => useContext(AppStateContext);