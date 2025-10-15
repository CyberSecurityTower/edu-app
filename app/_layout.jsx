import { Stack, useSegments, useNavigationContainerRef, useRouter } from 'expo-router';
import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';
import { getUserProfile } from '../services/firestoreService';
import OnboardingScreen from '../components/OnboardingScreen';

LogBox.ignoreLogs(['WARN  [Layout children]']);

// ---------- Context ----------
const AppStateContext = createContext(null);
export function useAppState() {
  return useContext(AppStateContext);
}

// ---------- App State Provider ----------
function AppStateProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      console.log('Auth state changed. Current user:', currentUser?.uid || 'No user');
      if (currentUser) {
        console.log('Fetching user profile for UID:', currentUser.uid);
        const userProfile = await getUserProfile(currentUser.uid);
        console.log('User profile fetched:', userProfile);

        if (userProfile) {
          setUser(userProfile);
        } else {
          console.log('No profile found, setting up pending user.');
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            profileStatus: 'pending_setup',
          });
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    const checkOnboardingStatus = async () => {
      try {
        const hasCompleted = await AsyncStorage.getItem('@hasCompletedOnboarding');
        setHasCompletedOnboarding(hasCompleted === 'true');
      } catch (e) {
        console.log('Error reading onboarding status from AsyncStorage', e);
        setHasCompletedOnboarding(false);
      }
    };

    checkOnboardingStatus();
    return () => unsubscribeAuth();
  }, []);

  return (
    <AppStateContext.Provider
      value={{ user, authLoading, hasCompletedOnboarding, setHasCompletedOnboarding, setUser }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

// ---------- Root Navigation (The Gatekeeper) ----------
function RootLayoutNav() {
  const { user, authLoading, hasCompletedOnboarding } = useAppState();
  const segments = useSegments();
  const navigationRef = useNavigationContainerRef();
  const router = useRouter();

  useEffect(() => {
    // --- START: ROBUST ROUTING LOGIC ---

    // Don't do anything until both auth and onboarding status are resolved.
    if (authLoading || hasCompletedOnboarding === null) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inSetupGroup = segments[0] === '(setup)';
    const inAppGroup = segments[0] === '(tabs)';

    // Case 1: User is logged in
    if (user) {
      const status = user.profileStatus;
      if (status === 'pending_setup' && !inSetupGroup) {
        console.log('Redirecting to (setup)...');
        router.replace('/(setup)/profile-setup');
      } else if (status === 'completed' && !inAppGroup) {
        console.log('Redirecting to (tabs)...');
        router.replace('/(tabs)/');
      }
    } 
    // Case 2: User is NOT logged in
    else if (!inAuthGroup) {
      console.log('Redirecting to (auth)...');
      router.replace('/(auth)/');
    }
    // --- END: ROBUST ROUTING LOGIC ---
  }, [user, user?.profileStatus, segments, authLoading, hasCompletedOnboarding]); // More robust dependencies

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(setup)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="subject-details"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
    </Stack>
  );
}

// ---------- Main Layout (Handles Onboarding/Loading UI) ----------
function MainLayout() {
  const { authLoading, hasCompletedOnboarding, setHasCompletedOnboarding } = useAppState();

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
      setHasCompletedOnboarding(true);
    } catch (e) {
      console.log('Error saving onboarding status to AsyncStorage', e);
      setHasCompletedOnboarding(true); // Still proceed even if storage fails
    }
  };

  // Show a loading screen while we determine auth and onboarding state
  if (authLoading || hasCompletedOnboarding === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" style={{ transform: [{ scale: 1.5 }] }} />
      </View>
    );
  }

  // If onboarding is not complete, show the onboarding screen
  if (hasCompletedOnboarding === false) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // Once ready, show the main navigator
  return <RootLayoutNav />;
}

// ---------- Root Layout (Main Export) ----------
export default function RootLayout() {
  return (
    <AppStateProvider>
      <MainLayout />
    </AppStateProvider>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0C0F27',
  },
});