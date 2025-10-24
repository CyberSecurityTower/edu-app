
import React, { useContext, useEffect, useCallback } from 'react';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import { Stack, useSegments, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppStateProvider, useAppState } from '../context/AppStateContext';
import { ActionSheetProvider } from '../context/ActionSheetContext';
import { FabProvider } from '../context/FabContext'; // ✨ 1. استيراد السياق الجديد
import { toastConfig } from '../config/toastConfig';
import OnboardingScreen from '../components/OnboardingScreen';
import { useFab } from '../../context/FabContext'; 
import ExpandableFAB from '../../components/ExpandableFAB';
LogBox.ignoreLogs(['WARN  [Layout children]']);

function RootLayoutNav() {
  const { user, authLoading, hasCompletedOnboarding } = useAppState();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const isReady = !authLoading && hasCompletedOnboarding !== null;
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSetupGroup = segments[0] === '(setup)';

    if (user) {
      if (user.profileStatus === 'pending_setup' && !inSetupGroup) {
        router.replace('/(setup)/profile-setup');
      } else if (user.profileStatus === 'completed' && (inAuthGroup || inSetupGroup)) {
        router.replace('/(tabs)/');
      }
    } else if (!inAuthGroup) {
      router.replace('/(auth)/');
    }
  }, [user, segments, authLoading, hasCompletedOnboarding, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(setup)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(modal)" options={{ presentation: 'modal' }} />
      <Stack.Screen name="subject-details" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="lesson-view" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="study-kit" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

function MainLayout() {
  const { authLoading, hasCompletedOnboarding, setHasCompletedOnboarding } = useAppState();

  const handleOnboardingComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
      setHasCompletedOnboarding(true);
    } catch (e) { console.log('Error saving onboarding status:', e); }
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppStateProvider>
        {/* ✨ 2. تغليف التطبيق بـ FabProvider */}
        {/* هذا يسمح لأي شاشة بتحديد الإجراءات التي يجب أن يعرضها الزر العائم */}
        <FabProvider>
          <ActionSheetProvider>
            <MainLayout />
            <Toast config={toastConfig} />
          </ActionSheetProvider>
        </FabProvider>
      </AppStateProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
});