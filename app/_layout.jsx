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
export function useAppState() { return useContext(AppStateContext); }
function AppStateProvider({ children }) { /* ... (no changes here) ... */ }

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
    // --- THE FIX IS HERE (Part 1) ---
    const onStudyKitScreen = segments[0] === 'study-kit';

    if (user) {
      const status = user.profileStatus;
      if (status === 'pending_setup' && !inSetupGroup) {
        router.replace('/(setup)/profile-setup');
      } 
      // --- THE FIX IS HERE (Part 2) ---
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
      {/* --- THE FIX IS HERE (Part 3) --- */}
      <Stack.Screen name="study-kit" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

// ... (MainLayout and RootLayout remain the same)
function MainLayout() {
  const { authLoading, hasCompletedOnboarding, setHasCompletedOnboarding } = useAppState();
  const handleOnboardingComplete = async () => { await AsyncStorage.setItem('@hasCompletedOnboarding', 'true'); setHasCompletedOnboarding(true); };
  if (authLoading || hasCompletedOnboarding === null) { return (<View style={styles.container}><ActivityIndicator size="large" color="#10B981" /></View>); }
  if (hasCompletedOnboarding === false) { return <OnboardingScreen onComplete={handleOnboardingComplete} />; }
  return <RootLayoutNav />;
}
export default function RootLayout() { return (<AppStateProvider><MainLayout /></AppStateProvider>); }
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' } });