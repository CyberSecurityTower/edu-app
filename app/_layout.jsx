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
    // 1. Wait until we know the user's auth and onboarding status.
    if (authLoading || hasCompletedOnboarding === null) {
      return;
    }

    // 2. Define the current location context.
    const inAuthGroup = segments[0] === '(auth)';
    const inSetupGroup = segments[0] === '(setup)';
    const inAppGroup = segments[0] === '(tabs)';

    // --- THE ROBUST FIX IS HERE ---
    // This variable checks if the user is ANYWHERE inside the authenticated part of the app.
    const inProtectedGroup = inAppGroup || inSetupGroup;

    // 3. Handle authenticated users.
    if (user) {
      // If profile is incomplete, redirect to setup IF they are not already there.
      if (user.profileStatus === 'pending_setup' && !inSetupGroup) {
        console.log('User needs setup. Redirecting to (setup)...');
        return router.replace('/(setup)/profile-setup');
      }
      
      // If profile is complete, redirect to the main app IF they are not already in a protected area.
      // This is the key change: it prevents redirection when navigating between screens
      // like `(tabs)/index` and `(tabs)/subject-details`.
      if (user.profileStatus === 'completed' && !inProtectedGroup) {
        console.log('User is authenticated. Redirecting to (tabs)...');
        return router.replace('/(tabs)/');
      }
    } 
    // 4. Handle unauthenticated users.
    else {
      // If not logged in and not in the auth flow, redirect them.
      if (!inAuthGroup) {
        console.log('User not authenticated. Redirecting to (auth)...');
        return router.replace('/(auth)/');
      }
    }
}, [user, segments, authLoading, hasCompletedOnboarding]);

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(setup)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* The extra screen definition for "subject-details" is now removed. */}
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