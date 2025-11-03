

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { audioService } from '../services/audioService';
import BackgroundTimer from 'react-native-background-timer';

const AppStateContext = createContext();

const ASYNC_STORAGE_SETTINGS_KEY = '@lastActiveTimerSettings';

const DEFAULT_MODES = [
  { key: 'default-pomodoro', name: 'Classic Focus', icon: 'brain', settings: { sessions: [{ focus: 25 * 60, break: 5 * 60 }, { focus: 25 * 60, break: 5 * 60 }, { focus: 25 * 60, break: 5 * 60 }, { focus: 25 * 60, break: 15 * 60 }], autoStartNextSession: true, enableAudioNotifications: true }},
  { key: 'default-50-10', name: 'Intense Sprint', icon: 'hourglass-half', settings: { sessions: [{ focus: 50 * 60, break: 10 * 60 }], autoStartNextSession: true, enableAudioNotifications: true }},
];

const DEFAULT_SETTINGS = DEFAULT_MODES[0].settings;

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
    activeModeKey: DEFAULT_MODES[0].key,
  });

  // ... (useEffect for loading data and auth remains the same)
  useEffect(() => {
    const getValidatedSettings = (storedSettingsString) => {
      if (!storedSettingsString) return { settings: DEFAULT_SETTINGS, key: DEFAULT_MODES[0].key };
      try {
        const parsed = JSON.parse(storedSettingsString);
        if (parsed && parsed.settings && Array.isArray(parsed.settings.sessions) && parsed.settings.sessions.length > 0 && parsed.key) {
          return parsed;
        }
        return { settings: DEFAULT_SETTINGS, key: DEFAULT_MODES[0].key };
      } catch (error) {
        console.error('Failed to parse stored settings, using default.', error);
        return { settings: DEFAULT_SETTINGS, key: DEFAULT_MODES[0].key };
      }
    };
    const loadInitialData = async () => {
      try {
        const onboarding = await AsyncStorage.getItem('@hasCompletedOnboarding');
        setHasCompletedOnboarding(onboarding === 'true');
        const storedSettingsString = await AsyncStorage.getItem(ASYNC_STORAGE_SETTINGS_KEY);
        const { settings, key } = getValidatedSettings(storedSettingsString);
        const initialDuration = settings.sessions[0].focus;
        setTimerSession(prev => ({ ...prev, settings, duration: initialDuration, timeLeft: initialDuration, activeModeKey: key }));
      } catch (e) {
        console.error('Failed to load initial data.', e);
        const initialDuration = DEFAULT_SETTINGS.sessions[0].focus;
        setTimerSession(prev => ({ ...prev, settings: DEFAULT_SETTINGS, duration: initialDuration, timeLeft: initialDuration, activeModeKey: DEFAULT_MODES[0].key }));
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
      BackgroundTimer.stopBackgroundTimer();
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
      if (nextState.status === 'active' && prev.settings.autoStartNextSession) {
        startTimerLogic(nextState);
      } else if (nextState.status === 'finished') {
        // Ensure timer is stopped if the whole cycle is finished
        BackgroundTimer.stopBackgroundTimer();
      }
      return nextState;
    });
  }, [_transitionToNextSession]);

  const startTimerLogic = (sessionState) => {
    // ✅ FIX [1/2]: The most important fix. Always stop any potential old timer before starting a new one.
    // This prevents multiple timers from running simultaneously.
    BackgroundTimer.stopBackgroundTimer();

    BackgroundTimer.runBackgroundTimer(() => {
      setTimerSession(prev => {
        if (prev.status !== 'active') {
          BackgroundTimer.stopBackgroundTimer();
          return prev;
        }
        const newTimeLeft = prev.timeLeft - 1;
        if (newTimeLeft < 1) {
          BackgroundTimer.stopBackgroundTimer();
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
        startTimerLogic(newState);
        return newState;
      }
      return prev;
    });
  }, [handleSessionFinish]);

  const pauseTimer = useCallback(() => {
    BackgroundTimer.stopBackgroundTimer();
    setTimerSession(prev => (prev.status === 'active' ? { ...prev, status: 'paused' } : prev));
  }, []);

  const resumeTimer = useCallback(() => {
    setTimerSession(prev => {
      if (prev.status === 'paused') {
        const newState = { ...prev, status: 'active' };
        startTimerLogic(newState);
        return newState;
      }
      return prev;
    });
  }, []);

  const skipTimer = useCallback(() => {
    BackgroundTimer.stopBackgroundTimer();
    handleSessionFinish();
  }, [handleSessionFinish]);

  const endTimer = useCallback(() => {
    BackgroundTimer.stopBackgroundTimer();
    setTimerSession(prev => {
      const firstSessionDuration = prev.settings.sessions[0].focus;
      return { ...prev, status: 'idle', sessionType: 'focus', duration: firstSessionDuration, timeLeft: firstSessionDuration, currentCycle: 1, selectedSound: null };
    });
  }, []);

  const updateSettings = useCallback(async (newMode) => {
    // ✅ ENHANCED: Enhanced guard clause with logging to help debug if it ever happens again.
    if (!newMode || !newMode.settings || !newMode.key) {
      console.error("CRITICAL: updateSettings was called with an invalid mode object. Aborting update.", newMode);
      return;
    }
    try {
      const dataToStore = JSON.stringify({ settings: newMode.settings, key: newMode.key });
      await AsyncStorage.setItem(ASYNC_STORAGE_SETTINGS_KEY, dataToStore);
      setTimerSession(prev => {
        const firstSessionDuration = newMode.settings.sessions[0].focus;
        if (prev.status === 'idle' || prev.status === 'finished') {
          return { ...prev, settings: newMode.settings, activeModeKey: newMode.key, duration: firstSessionDuration, timeLeft: firstSessionDuration, sessionType: 'focus', currentCycle: 1 };
        }
        return { ...prev, settings: newMode.settings, activeModeKey: newMode.key };
      });
    } catch (e) { 
      console.error('Failed to save settings.', e); 
    }
  }, []);

  useEffect(() => {
    const { status, selectedSound } = timerSession;
    if (status === 'active') audioService.playSessionSound(selectedSound);
    else if (status === 'paused') audioService.pauseSessionSound();
    else audioService.stopSessionSound();
  }, [timerSession.status, timerSession.selectedSound]);

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