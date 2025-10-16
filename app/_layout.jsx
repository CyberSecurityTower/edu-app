import { Stack, useSegments, useRouter } from 'expo-router';
import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';
import { getUserProfile } from '../services/firestoreService';
import OnboardingScreen from '../components/OnboardingScreen';

LogBox.ignoreLogs(['WARN  [Layout children]']);

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
      console.log('Auth state changed. Current user:', currentUser?.uid || 'No user');
      if (currentUser) {
        console.log('Fetching user profile for UID:', currentUser.uid);
        const userProfile = await getUserProfile(currentUser.uid);
        console.log('User profile fetched:', userProfile);

        if (userProfile) {
          // --- THE FIX IS HERE ---
          // We now ensure the UID from the auth object is always included
          // with the profile data from Firestore.
          setUser({
            uid: currentUser.uid, 
            ...userProfile
          });
        } else {
          // This part was already correct.
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

function RootLayoutNav() {
  const { user, authLoading, hasCompletedOnboarding } = useAppState();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || hasCompletedOnboarding === null) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inSetupGroup = segments[0] === '(setup)';
    const inAppGroup = segments[0] === '(tabs)';
    const onDetailsScreen = segments[0] === 'subject-details';

    if (user) {
      const status = user.profileStatus;
      if (status === 'pending_setup' && !inSetupGroup) {
        console.log('Redirecting to (setup)...');
        router.replace('/(setup)/profile-setup');
      } 
      else if (status === 'completed' && !inAppGroup && !inSetupGroup && !onDetailsScreen) {
        console.log('Redirecting to (tabs)...');
        router.replace('/(tabs)/');
      }
    } 
    else if (!inAuthGroup) {
      console.log('Redirecting to (auth)...');
      router.replace('/(auth)/');
    }
}, [user, user?.profileStatus, segments, authLoading, hasCompletedOnboarding]);

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

function MainLayout() {
  const { authLoading, hasCompletedOnboarding, setHasCompletedOnboarding } = useAppState();

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
      setHasCompletedOnboarding(true);
    } catch (e) {
      console.log('Error saving onboarding status to AsyncStorage', e);
      setHasCompletedOnboarding(true);
    }
  };

  if (authLoading || hasCompletedOnboarding === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" style={{ transform: [{ scale: 1.5 }] }} />
      </View>
    );
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
});