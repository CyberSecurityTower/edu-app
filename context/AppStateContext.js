// context/AppStateContext.js
import React, { createContext, useState, useEffect, useMemo, useCallback, useContext, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

import { auth, db } from '../firebase';
import { getUserProfile, getUserProgressDocument, updateUserDailyStreak } from '../services/firestoreService';
import { POINTS_CONFIG } from '../config/points';

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);
  const [points, setPoints] = useState(0);

  // ✨ [NEW] State for notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenToastIds = useRef(new Set());

  const refreshPoints = useCallback(async () => {
    if (user?.uid) {
      const progressDoc = await getUserProgressDocument(user.uid);
      setPoints(progressDoc?.stats?.points || 0);
    }
  }, [user]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const userProfile = await getUserProfile(currentUser.uid);
          const fullUserProfile = userProfile ? { uid: currentUser.uid, ...userProfile } : { uid: currentUser.uid, email: currentUser.email, profileStatus: 'pending_setup' };
          setUser(fullUserProfile);

          if (fullUserProfile.profileStatus === 'completed') {
            const progressDoc = await getUserProgressDocument(currentUser.uid);
            setPoints(progressDoc?.stats?.points || 0);

            const lastLogin = progressDoc?.lastLogin?.toDate();
            const streakCount = progressDoc?.streakCount || 0;
            const now = new Date();

            if (!lastLogin || now.toDateString() !== lastLogin.toDateString()) {
              const yesterday = new Date();
              yesterday.setDate(now.getDate() - 1);
              const isConsecutive = lastLogin && yesterday.toDateString() === lastLogin.toDateString();
              const newStreak = isConsecutive ? streakCount + 1 : 1;

              let pointsToAward = isConsecutive ? Math.floor(POINTS_CONFIG.DAILY_STREAK_BONUS * Math.pow(1.1, streakCount)) : POINTS_CONFIG.DAILY_STREAK_BONUS;
              if (newStreak === 1 && lastLogin) pointsToAward = POINTS_CONFIG.DAILY_STREAK_BONUS;
              if (!lastLogin) pointsToAward = 0;

              await updateUserDailyStreak(currentUser.uid, newStreak, pointsToAward);

              if (pointsToAward > 0) {
                Toast.show({
                  type: 'points',
                  text1: `Day ${newStreak} Streak! +${pointsToAward} Points`,
                  position: 'bottom',
                  visibilityTime: 3500,
                });
                refreshPoints();
              }
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [refreshPoints]);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const hasCompleted = await AsyncStorage.getItem('@hasCompletedOnboarding');
        setHasCompletedOnboarding(hasCompleted === 'true');
      } catch (e) {
        setHasCompletedOnboarding(false);
      }
    };
    checkOnboardingStatus();
  }, []);

  // ✨ [REWRITTEN] useEffect for notifications to fix logic and add features
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const notificationsRef = collection(db, 'userNotifications', user.uid, 'inbox');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = [];
      let newUnreadCount = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        fetchedNotifications.push({ id: doc.id, ...data });
        if (!data.read) {
          newUnreadCount++;
        }
      });

      // Show toast only for new, unread notifications that haven't been shown before
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notificationData = change.doc.data();
          const notificationId = change.doc.id;
          if (!notificationData.read && !seenToastIds.current.has(notificationId)) {
            Toast.show({
              type: 'eduai_notification',
              text1: notificationData.title || 'EduAI Assistant',
              text2: notificationData.message,
              position: 'top',
              visibilityTime: 8000,
            });
            seenToastIds.current.add(notificationId);
          }
        }
      });
      
      setNotifications(fetchedNotifications);
      setUnreadCount(newUnreadCount);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const contextValue = useMemo(() => ({
    user,
    authLoading,
    hasCompletedOnboarding,
    setHasCompletedOnboarding,
    setUser,
    points,
    refreshPoints,
    // ✨ [NEW] Expose notification state for other components
    notifications,
    unreadCount,
  }), [user, authLoading, hasCompletedOnboarding, points, refreshPoints, notifications, unreadCount]);

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
}

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};