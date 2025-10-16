import { Stack, useRouter, useSegments } from 'expo-router';
import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';
import { getUserProfile } from '../services/firestoreService';
import OnboardingScreen from '../components/OnboardingScreen';

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
      if (currentUser) {
        const userProfile = await getUserProfile(currentUser.uid);
        setUser(userProfile || { uid: currentUser.uid, email: currentUser.email, profileStatus: 'pending_setup' });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    const checkOnboardingStatus = async () => {
      const hasCompleted = await AsyncStorage.getItem('@hasCompletedOnboarding');
      setHasCompletedOnboarding(hasCompleted === 'true');
    };
    checkOnboardingStatus();
    return () => unsubscribeAuth();
  }, []);

  return (
    <AppStateContext.Provider value={{ user, authLoading, hasCompletedOnboarding, setHasCompletedOnboarding, setUser }}>
      {children}
    </AppStateContext.Provider>
  );
}

function RootLayoutNav() {
  const { user, authLoading, hasCompletedOnboarding } = useAppState();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || hasCompletedOnboarding === null) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inSetupGroup = segments[0] === '(setup)';
    const inAppGroup = segments[0] === '(tabs)';
    const inProtectedGroup = inAppGroup || inSetupGroup;

    if (user) {
      if (user.profileStatus === 'pending_setup' && !inSetupGroup) {
        return router.replace('/(setup)/profile-setup');
      }
      if (user.profileStatus === 'completed' && !inProtectedGroup) {
        return router.replace('/(tabs)/');
      }
    } else if (!inAuthGroup) {
      return router.replace('/(auth)/');
    }
  }, [user, segments, authLoading, hasCompletedOnboarding]);

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(setup)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

function MainLayout() {
  const { authLoading, hasCompletedOnboarding, setHasCompletedOnboarding } = useAppState();
  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
    setHasCompletedOnboarding(true);
  };

  if (authLoading || hasCompletedOnboarding === null) {
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
    </AppStateProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
});