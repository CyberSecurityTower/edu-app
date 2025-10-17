import { Stack, useSegments, useRouter } from 'expo-router';
import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';
import { getUserProfile } from '../services/firestoreService';
import OnboardingScreen from '../components/OnboardingScreen';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message'; // <-- Import Toast
LogBox.ignoreLogs(['WARN  [Layout children]']);
const AppStateContext = createContext(null);
export function useAppState() { return useContext(AppStateContext); }

// --- THE FIX IS HERE: Restoring the full, correct function ---
function AppStateProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userProfile = await getUserProfile(currentUser.uid);
        if (userProfile) {
          setUser({ uid: currentUser.uid, ...userProfile });
        } else {
          setUser({ uid: currentUser.uid, email: currentUser.email, profileStatus: 'pending_setup' });
        }
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
    const inModalGroup = segments[0] === '(modal)';
    const onDetailsScreen = segments[0] === 'subject-details';
    const onLessonScreen = segments[0] === 'lesson-view';
    const onStudyKitScreen = segments[0] === 'study-kit';

    if (user) {
      const status = user.profileStatus;
      if (status === 'pending_setup' && !inSetupGroup) {
        router.replace('/(setup)/profile-setup');
      } 
      else if (status === 'completed' && !inAppGroup && !inSetupGroup && !inModalGroup && !onDetailsScreen && !onLessonScreen && !onStudyKitScreen) {
        router.replace('/(tabs)/');
      }
    } 
    else if (!inAuthGroup) {
      router.replace('/(auth)/');
    }
  }, [user, segments, authLoading, hasCompletedOnboarding]);

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
  const handleOnboardingComplete = async () => { await AsyncStorage.setItem('@hasCompletedOnboarding', 'true'); setHasCompletedOnboarding(true); };
  if (authLoading || hasCompletedOnboarding === null) { return (<View style={styles.container}><ActivityIndicator size="large" color="#10B91" /></View>); }
  if (hasCompletedOnboarding === false) { return <OnboardingScreen onComplete={handleOnboardingComplete} />; }
  return <RootLayoutNav />;
}

export default function RootLayout() { return (<AppStateProvider><MainLayout /></AppStateProvider>); }

const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' } });