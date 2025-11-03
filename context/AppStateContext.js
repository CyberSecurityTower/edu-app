
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
  // ✅ THE FIX: Auto-start is now the default behavior.
  autoStartNextSession: true, 
  enableAudioNotifications: true,
};

export const AppStateProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);
  const [points, setPoints] = useState(0);

  const [timerSession, setTimerSession] = useState({
    status: 'idle', // idle, active, paused, finished
    sessionType: 'focus', // focus, shortBreak, longBreak
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

  // ✅ GOD-TIER: The new and improved, fully automatic state machine.
  const _transitionToNextSession = useCallback(() => {
    const { sessionType, currentCycle, settings } = timerSession;
    
    // Case 1: A long break just finished. The entire cycle is now complete.
    if (sessionType === 'longBreak') {
      setTimerSession(prev => ({ ...prev, status: 'finished' }));
      setTimeLeft(0);
      return;
    }

    let nextSessionType = 'focus';
    let nextDuration = settings.focusDuration;
    let nextCycle = currentCycle;

    // Case 2: A focus session just finished.
    if (sessionType === 'focus') {
      if (currentCycle >= settings.pomodorosPerCycle) {
        nextSessionType = 'longBreak';
        nextDuration = settings.longBreakDuration;
        // The cycle count will reset to 1 after this long break is complete.
      } else {
        nextSessionType = 'shortBreak';
        nextDuration = settings.shortBreakDuration;
      }
    } 
    // Case 3: A short break just finished. Go back to focus and increment the cycle.
    else if (sessionType === 'shortBreak') {
        nextSessionType = 'focus';
        nextDuration = settings.focusDuration;
        nextCycle = currentCycle + 1;
    }
    
    setTimerSession(prev => ({
      ...prev,
      // ✅ THE FIX: Always transition to 'active' for a seamless flow.
      status: 'active',
      sessionType: nextSessionType,
      duration: nextDuration,
      currentCycle: nextCycle,
    }));
    setTimeLeft(nextDuration);

  }, [timerSession]);

  const handleSessionFinish = useCallback(() => {
    // ✅ THE FIX: The sound now plays on every transition.
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
      
      if (timerSession.status === 'finished') {
        const newSettings = timerSession.settings;
        setTimeLeft(newSettings.focusDuration);
        setTimerSession(prev => ({
          ...prev, status: 'active', sessionType: 'focus',
          duration: newSettings.focusDuration, currentCycle: 1, selectedSound: soundId,
        }));
      } else {
         setTimeLeft(timerSession.duration);
         setTimerSession(prev => ({ ...prev, status: 'active', selectedSound: soundId }));
      }
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

  const skipTimer = useCallback(() => {
    if (timerSession.status === 'active' || timerSession.status === 'paused') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        handleSessionFinish(); // Use the same finish logic for consistency
    }
  }, [timerSession.status, handleSessionFinish]);

  // This function now acts as a full reset.
  const endTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const currentSettings = timerSession.settings;
    setTimerSession(prev => ({
      ...prev, status: 'idle', sessionType: 'focus',
      duration: currentSettings.focusDuration, currentCycle: 1, selectedSound: null,
    }));
    setTimeLeft(currentSettings.focusDuration);
  }, [timerSession.settings]);

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
    timerSession, setTimerSession, timeLeft, startTimer, pauseTimer,
    resumeTimer, endTimer, resetTimer: endTimer, skipTimer, updateSettings,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => useContext(AppStateContext);