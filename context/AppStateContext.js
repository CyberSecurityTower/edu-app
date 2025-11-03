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
    timeLeft: DEFAULT_SETTINGS.sessions[0].focus,
    currentCycle: 1,
    taskTitle: null,
    taskId: null,
    selectedSound: null,
    settings: DEFAULT_SETTINGS,
  });

  // refs to keep latest values without creating stale-closure issues
  const timerSessionRef = useRef(timerSession);
  const settingsRef = useRef(timerSession.settings);
  const intervalRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const backgroundTime = useRef(null);

  useEffect(() => { timerSessionRef.current = timerSession; }, [timerSession]);
  useEffect(() => { settingsRef.current = timerSession.settings; }, [timerSession.settings]);

  useEffect(() => {
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
      // cleanup auth subscription and any intervals
      unsubscribeAuth();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // transition logic (pure, uses settings from ref when called outside setState)
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

  // use a ref-based settings check to avoid stale closures
  const handleSessionFinish = useCallback(() => {
    if (settingsRef.current?.enableAudioNotifications) audioService.playEffect('end-effect');
    _transitionToNextSession();
  }, [_transitionToNextSession]);

  // interval manager — keeps running reliably without stale closures
  useEffect(() => {
    if (timerSession.status !== 'active') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // clear any previous interval just in case
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setTimerSession(prev => {
        if (prev.timeLeft <= 1) {
          // ensure interval is cleared
          if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
          // call finish handler (safe — uses refs internally)
          handleSessionFinish();
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [timerSession.status, handleSessionFinish]);

  // AppState (background/foreground) handling. If the app was in background, compute elapsed seconds
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (timerSessionRef.current.status === 'active' && backgroundTime.current) {
          const elapsed = Math.round((Date.now() - backgroundTime.current) / 1000);
          setTimerSession(prev => {
            const newTimeLeft = Math.max(0, prev.timeLeft - elapsed);
            // If the time ran out while backgrounded, run finish handler
            if (newTimeLeft === 0) {
              // we must trigger finish *after* state update; calling directly is fine because handler uses refs
              handleSessionFinish();
              return { ...prev, timeLeft: 0 };
            }
            return { ...prev, timeLeft: newTimeLeft };
          });
        }
        backgroundTime.current = null;
      } else if (nextAppState.match(/inactive|background/)) {
        backgroundTime.current = Date.now();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [handleSessionFinish]);

  // session sound management — reacts to status and selectedSound
  useEffect(() => {
    const { status, selectedSound } = timerSession;
    if (status === 'active') audioService.playSessionSound(selectedSound);
    else if (status === 'paused') audioService.pauseSessionSound();
    else audioService.stopSessionSound();
  }, [timerSession.status, timerSession.selectedSound]);

  // start/pause/resume/skip/end logic (careful with closures)
  const startTimer = useCallback((soundId) => {
    setTimerSession(prev => {
      if (prev.status === 'idle' || prev.status === 'finished') {
        if (prev.settings.enableAudioNotifications) audioService.playEffect('start-effect');

        if (prev.status === 'finished') {
          const firstSessionDuration = prev.settings.sessions[0].focus;
          return { ...prev, status: 'active', sessionType: 'focus', duration: firstSessionDuration, timeLeft: firstSessionDuration, currentCycle: 1, selectedSound: soundId };
        }

        // For 'idle' state, timeLeft is already correct from settings
        return { ...prev, status: 'active', selectedSound: soundId };
      }
      return prev;
    });
  }, []);

  const pauseTimer = useCallback(() => { setTimerSession(prev => (prev.status === 'active' ? { ...prev, status: 'paused' } : prev)); }, []);
  const resumeTimer = useCallback(() => { setTimerSession(prev => (prev.status === 'paused' ? { ...prev, status: 'active' } : prev)); }, []);

  const skipTimer = useCallback(() => {
    // clear interval then finish
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    handleSessionFinish();
  }, [handleSessionFinish]);

  const endTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setTimerSession(prev => {
      const firstSessionDuration = prev.settings.sessions[0].focus;
      return { ...prev, status: 'idle', sessionType: 'focus', duration: firstSessionDuration, timeLeft: firstSessionDuration, currentCycle: 1, selectedSound: null };
    });
  }, []);

  // update settings and persist; if idle/finished, update current duration/timeLeft to reflect new settings
  const updateSettings = useCallback(async (newSettings) => {
    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_SETTINGS_KEY, JSON.stringify(newSettings));
      setTimerSession(prev => {
        const firstSessionDuration = newSettings.sessions[0].focus;
        if (prev.status === 'idle' || prev.status === 'finished') {
          return { ...prev, settings: newSettings, duration: firstSessionDuration, timeLeft: firstSessionDuration, sessionType: 'focus', currentCycle: 1 };
        }
        // If a session is active/paused, we only replace settings object — don't mutate current timers
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

  // cleanup on unmount: intervals already cleared in other effects but keep safe guard
  useEffect(() => {
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, []);

  const value = { user, setUser, authLoading, hasCompletedOnboarding, setHasCompletedOnboarding, points, refreshPoints, timerSession, setTimerSession, startTimer, pauseTimer, resumeTimer, endTimer, resetTimer: endTimer, skipTimer, updateSettings };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => useContext(AppStateContext);
