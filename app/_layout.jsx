import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { ActivityIndicator, View, StyleSheet, LogBox, Text } from 'react-native';
import { Stack, useSegments, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';

import { auth } from '../firebase';
import { getUserProfile, getUserProgressDocument, updateUserDailyStreak } from '../services/firestoreService';
import OnboardingScreen from '../components/OnboardingScreen';
import AppStateContext from '../context/AppStateContext';
import { POINTS_CONFIG } from '../config/points';

LogBox.ignoreLogs(['WARN  [Layout children]']);

const toastConfig = {
  points: ({ text1 }) => (
    <View style={styles.toastContainer}>
      <LinearGradient colors={['#10B981', '#34D399']} style={styles.toastGradient}>
        <FontAwesome5 name="star" size={18} color="white" solid />
        <Text style={styles.toastText}>{text1}</Text>
      </LinearGradient>
    </View>
  ),
};

function AppStateProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // Initial fetch to set the user state
          const userProfile = await getUserProfile(currentUser.uid);
          let fullUserProfile = userProfile ? { uid: currentUser.uid, ...userProfile } : { uid: currentUser.uid, email: currentUser.email, profileStatus: 'pending_setup' };
          setUser(fullUserProfile);

          if (fullUserProfile.profileStatus === 'completed') {
            const progressDoc = await getUserProgressDocument(currentUser.uid);
            const lastLogin = progressDoc?.lastLogin?.toDate();
            const streakCount = progressDoc?.streakCount || 0;
            const now = new Date();

            if (!lastLogin) {
              await updateUserDailyStreak(currentUser.uid, 1, 0);
              return;
            }

            const isSameDay = now.toDateString() === lastLogin.toDateString();
            if (isSameDay) return;

            const yesterday = new Date();
            yesterday.setDate(now.getDate() - 1);
            const isConsecutive = yesterday.toDateString() === lastLogin.toDateString();
            
            const newStreak = isConsecutive ? streakCount + 1 : 1;
            
            let pointsToAward = POINTS_CONFIG.DAILY_STREAK_BONUS;
            if (isConsecutive && streakCount > 0) {
              const previousBonus = POINTS_CONFIG.DAILY_STREAK_BONUS * Math.pow(1.1, streakCount - 1);
              pointsToAward = Math.floor(previousBonus * 1.1);
            }

            await updateUserDailyStreak(currentUser.uid, newStreak, pointsToAward);
            
            Toast.show({
              type: 'points',
              text1: `Day ${newStreak} Streak! +${pointsToAward} Points`,
              position: 'bottom',
              visibilityTime: 3500,
            });
            
            // --- THE IMMEDIATE UPDATE FIX IS HERE ---
            // After awarding points, we need to re-fetch the progress document
            // and merge the new points into our existing user state.
            const updatedProgressDoc = await getUserProgressDocument(currentUser.uid);
            if (updatedProgressDoc?.stats) {
              setUser(prevUser => ({
                ...prevUser,
                stats: { ...prevUser.stats, ...updatedProgressDoc.stats }
              }));
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    });

    const checkOnboardingStatus = async () => {
      try {
        const hasCompleted = await AsyncStorage.getItem('@hasCompletedOnboarding');
        setHasCompletedOnboarding(hasCompleted === 'true');
      } catch (e) {
        setHasCompletedOnboarding(false);
      }
    };

    checkOnboardingStatus();
    return () => unsubscribeAuth();
  }, []);

  const contextValue = useMemo(() => ({
    user, authLoading, hasCompletedOnboarding, setHasCompletedOnboarding, setUser,
  }), [user, authLoading, hasCompletedOnboarding]);

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
}

function RootLayoutNav() {
  const { user, authLoading, hasCompletedOnboarding } = useContext(AppStateContext);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const isReady = !authLoading && hasCompletedOnboarding !== null;
    if (!isReady) return;

    const currentSegment = segments[0] || null;
    const isUserAuthenticated = !!user;
    const profileStatus = user?.profileStatus;

    const isProtectedRoute = (seg) => ['(tabs)', '(modal)', 'subject-details', 'lesson-view', 'study-kit'].includes(seg);

    if (isUserAuthenticated) {
      if (profileStatus === 'pending_setup' && currentSegment !== '(setup)') {
        router.replace('/(setup)/profile-setup');
      } else if (profileStatus === 'completed' && !isProtectedRoute(currentSegment)) {
        router.replace('/(tabs)/');
      }
    } else {
      if (currentSegment !== '(auth)') {
        router.replace('/(auth)/');
      }
    }
  }, [user, segments, authLoading, hasCompletedOnboarding, router]);

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(setup)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(modal)" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="subject-details" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="lesson-view" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="study-kit" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

function MainLayout() {
  const { authLoading, hasCompletedOnboarding, setHasCompletedOnboarding } = useContext(AppStateContext);

  const handleOnboardingComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
    } catch (e) { console.log('Error saving onboarding status:', e); }
    setHasCompletedOnboarding(true);
  }, [setHasCompletedOnboarding]);

  if (authLoading || hasCompletedOnboarding === null) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  if (hasCompletedOnboarding === false) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return <RootLayoutNav />;
}

export default function RootLayout() {
  return (
    <AppStateProvider>
      <MainLayout />
      <Toast config={toastConfig} />
    </AppStateProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  toastContainer: { width: 'auto', maxWidth: '80%', alignItems: 'center', marginBottom: 50 },
  toastGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, gap: 10, shadowColor: '#10B981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  toastText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});