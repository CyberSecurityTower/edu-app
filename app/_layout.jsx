import React, { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import { Stack, useSegments, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import AppStateContext from '../context/AppStateContext';
import { auth } from '../firebase';
import { getUserProfile } from '../services/firestoreService';
import OnboardingScreen from '../components/OnboardingScreen';

LogBox.ignoreLogs(['WARN  [Layout children]']);

// --- Custom Toast Design ---
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

// --- App State Context ---
const AppStateContext = createContext(null);
export function useAppState() {
  return useContext(AppStateContext);
}

function AppStateProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const userProfile = await getUserProfile(currentUser.uid);
          setUser(userProfile ? { uid: currentUser.uid, ...userProfile } : { uid: currentUser.uid, email: currentUser.email, profileStatus: 'pending_setup' });
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

    // Onboarding status check
    const checkOnboardingStatus = async () => {
      try {
        const hasCompleted = await AsyncStorage.getItem('@hasCompletedOnboarding');
        setHasCompletedOnboarding(hasCompleted === 'true');
      } catch (e) {
        console.log('Error reading onboarding status:', e);
        setHasCompletedOnboarding(false); // Default to false on error
      }
    };

    checkOnboardingStatus();
    
    return () => unsubscribeAuth();
  }, []);

 const contextValue = useMemo(() => ({
    user, authLoading, hasCompletedOnboarding, setHasCompletedOnboarding, setUser,
  }), [user, authLoading, hasCompletedOnboarding]);

  // Use the imported context here
  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
}

function RootLayoutNav() {
  const { user, authLoading, hasCompletedOnboarding } = useAppState();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const isReady = !authLoading && hasCompletedOnboarding !== null;
    if (!isReady) return;

    const currentSegment = segments[0] || null;
    const isUserAuthenticated = !!user;
    const profileStatus = user?.profileStatus;

    const isProtectedRoute = (seg) => 
      ['(tabs)', '(modal)', 'subject-details', 'lesson-view', 'study-kit'].includes(seg);

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
  const { authLoading, hasCompletedOnboarding, setHasCompletedOnboarding } = useAppState();

  const handleOnboardingComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
    } catch (e) {
      console.log('Error saving onboarding status:', e);
    }
    setHasCompletedOnboarding(true);
  }, [setHasCompletedOnboarding]);

  const isLoading = authLoading || hasCompletedOnboarding === null;

  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  if (!hasCompletedOnboarding) {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0C0F27',
  },
  toastContainer: {
    width: 'auto', // Auto width based on content
    maxWidth: '80%',
    alignItems: 'center',
    marginBottom: 50, // Position it a bit higher from the bottom
  },
  toastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  toastText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});