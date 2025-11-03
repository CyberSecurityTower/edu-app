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
  focusDuration: 25 * 60,
  shortBreakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
  pomodorosPerCycle: 4,
  autoStartNextSession: false,
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
    duration: DEFAULT_SETTINGS.focusDuration,
    currentCycle: 1,
    taskTitle: null,
    taskId: null,
    selectedSound: null,
    settings: DEFAULT_SETTINGS,
  });
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.focusDuration);
  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const backgroundTime = useRef(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const onboarding = await AsyncStorage.getItem('@hasCompletedOnboarding');
        setHasCompletedOnboarding(onboarding === 'true');
        
        const storedSettings = await AsyncStorage.getItem(ASYNC_STORAGE_SETTINGS_KEY);
        const settings = storedSettings ? JSON.parse(storedSettings) : DEFAULT_SETTINGS;
        
        setTimerSession(prev => ({
          ...prev,
          settings,
          duration: settings.focusDuration,
        }));
        setTimeLeft(settings.focusDuration);
      } catch (e) {
        console.error("Failed to load initial data.", e);
      }
    };
    loadInitialData();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser({ uid: firebaseUser.uid, ...userDoc.data() });
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  const _transitionToNextSession = useCallback(() => {
    const { sessionType, currentCycle, settings } = timerSession;
    
    if (sessionType === 'longBreak') {
        const newCycle = 1;
        setTimerSession(prev => ({
            ...prev,
            status: 'idle',
            sessionType: 'focus',
            duration: prev.settings.focusDuration,
            currentCycle: newCycle,
        }));
        setTimeLeft(settings.focusDuration);
        return;
    }

    let nextSessionType = 'focus';
    let nextDuration = settings.focusDuration;
    let nextCycle = currentCycle;

    if (sessionType === 'focus') {
      if (currentCycle >= settings.pomodorosPerCycle) {
        nextSessionType = 'longBreak';
        nextDuration = settings.longBreakDuration;
        nextCycle = 1; // Reset for the next full cycle
      } else {
        nextSessionType = 'shortBreak';
        nextDuration = settings.shortBreakDuration;
        nextCycle = currentCycle + 1;
      }
    }
    
    setTimerSession(prev => ({
      ...prev,
      status: prev.settings.autoStartNextSession ? 'active' : 'idle',
      sessionType: nextSessionType,
      duration: nextDuration,
      currentCycle: nextCycle,
    }));
    setTimeLeft(nextDuration);
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
    if (status === 'active') {
      audioService.playSessionSound(selectedSound);
    } else if (status === 'paused') {
      audioService.pauseSessionSound();
    } else {
      audioService.stopSessionSound();
    }
  }, [timerSession.status, timerSession.selectedSound]);

  const startTimer = useCallback((soundId) => {
    if (timerSession.status === 'idle' || timerSession.status === 'finished') {
      if (timerSession.settings.enableAudioNotifications) {
        audioService.playEffect('start-effect');
      }
      setTimerSession(prev => ({ ...prev, status: 'active', selectedSound: soundId }));
    }
  }, [timerSession]);

  const pauseTimer = useCallback(() => {
    if (timerSession.status === 'active') {
      setTimerSession(prev => ({ ...prev, status: 'paused' }));
    }
  }, [timerSession.status]);

  const resumeTimer = useCallback(() => {
    if (timerSession.status === 'paused') {
      setTimerSession(prev => ({ ...prev, status: 'active' }));
    }
  }, [timerSession.status]);

  // ✅ GOD-TIER: This function now correctly skips to the next session.
  const skipTimer = useCallback(() => {
    if (timerSession.status === 'active' || timerSession.status === 'paused') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        // Play the end sound effect to signify a transition
        if (timerSession.settings.enableAudioNotifications) {
            audioService.playEffect('end-effect');
        }
        _transitionToNextSession();
    }
  }, [timerSession.status, timerSession.settings.enableAudioNotifications, _transitionToNextSession]);

  const endTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const currentSettings = timerSession.settings;
    setTimerSession(prev => ({
      ...prev, status: 'idle', sessionType: 'focus',
      duration: currentSettings.focusDuration, currentCycle: 1, selectedSound: null,
    }));
    setTimeLeft(currentSettings.focusDuration);
  }, [timerSession.settings]);

  // ✅ GOD-TIER: This function now updates settings and persists them.
  const updateSettings = useCallback(async (newSettings) => {
    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_SETTINGS_KEY, JSON.stringify(newSettings));
      setTimerSession(prev => {
        const shouldResetTimer = prev.status === 'idle' || prev.status === 'finished';
        if (shouldResetTimer) {
          setTimeLeft(newSettings.focusDuration);
          return {
            ...prev,
            settings: newSettings,
            duration: newSettings.focusDuration,
            sessionType: 'focus',
            currentCycle: 1,
          };
        }
        return { ...prev, settings: newSettings };
      });
    } catch (e) {
      console.error("Failed to save settings.", e);
    }
  }, []);

const refreshPoints = useCallback(async () => { if (user?.uid) { const progressDoc = await getDoc(doc(db, 'userProgress', user.uid)); if (progressDoc.exists()) { setPoints(progressDoc.data().stats?.points || 0); } } }, [user?.uid]);
  const value = {
    user, setUser, authLoading, hasCompletedOnboarding, setHasCompletedOnboarding, points, refreshPoints,
    timerSession, setTimerSession, timeLeft, setTimeLeft, startTimer, pauseTimer,
    resumeTimer, endTimer, resetTimer: endTimer, skipTimer, updateSettings,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => useContext(AppStateContext);