import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, LogBox, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

import OnboardingScreen from '../components/OnboardingScreen';
import { toastConfig } from '../config/toastConfig';
import { ActionSheetProvider } from '../context/ActionSheetContext';
import { AppStateProvider, useAppState } from '../context/AppStateContext';
import { EditModeProvider } from '../context/EditModeContext';
import { FabProvider, useFab } from '../context/FabContext';
import 'react-native-get-random-values';
LogBox.ignoreLogs(['WARN  [Layout children]']);

function FabRenderer() {
  const { fabConfig, isSheetVisible } = useFab();

  if (isSheetVisible || !fabConfig) {
    return null;
  }

  const { component: FabComponent, props } = fabConfig;

  if (!FabComponent) {
    return null;
  }

  return <FabComponent {...props} />;
}

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
      {/* Group screens */}
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(setup)" />
      <Stack.Screen name="(tabs)" />

      {/* Regular screens */}
      <Stack.Screen name="subject-details" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="lesson-view" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="study-kit" options={{ animation: 'slide_from_bottom' }} />

      {/* Modal screens */}
      <Stack.Screen name="ai-chatbot" options={{ presentation: 'modal' }} />
      <Stack.Screen name="chat-history" options={{ presentation: 'modal' }} />
      {/* ✨ [CONFIRMED] The notification screen is correctly registered as a modal */}
      <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

function MainLayout() {
  const { authLoading, hasCompletedOnboarding, setHasCompletedOnboarding } = useAppState();

  const handleOnboardingComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
      setHasCompletedOnboarding(true);
    } catch (e) {
      console.log('Error saving onboarding status:', e);
    }
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
        <FabProvider>
          <EditModeProvider>
            <ActionSheetProvider>
              <MainLayout />
              <FabRenderer />
              <Toast config={toastConfig} />
            </ActionSheetProvider>
          </EditModeProvider>
        </FabProvider>
      </AppStateProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
});