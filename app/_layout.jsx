
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from 'expo-router';
import { collection, getFirestore, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, LogBox, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-get-random-values';
import Toast from 'react-native-toast-message';
import { AnimatePresence } from 'moti';

// Components & Config
import OnboardingScreen from '../components/OnboardingScreen';
import DynamicTimerIsland from '../components/timer/DynamicTimerIsland';
import { toastConfig } from '../config/toastConfig';
import { apiService } from '../config/api';

// Contexts & Services
import { ActionSheetProvider } from '../context/ActionSheetContext';
import { AppStateProvider, useAppState } from '../context/AppStateContext';
import { EditModeProvider } from '../context/EditModeContext';
import { FabProvider, useFab } from '../context/FabContext';
import { BehavioralAnalyticsService } from '../services/behavioralAnalyticsService';

LogBox.ignoreLogs(['WARN  [Layout children]']);
function AppContent() {
  // ✅ هذا الـ Hook الآن "آمن". لن يتم استدعاؤه كل ثانية.
  const { timerSession } = useAppState(); 
  const segments = useSegments() ?? [];
  const lastSegment = segments.length ? segments[segments.length - 1] : null;
  const isOnTimerScreen = lastSegment === 'study-timer';

  const shouldShowTimerIsland =
    timerSession &&
    timerSession.status !== 'idle' &&
    timerSession.status !== 'finished' &&
    !isOnTimerScreen;

  return (
    // ✅ [THE FIX] استخدم View بدلاً من Fragment لإنشاء سياق تكديس صحيح
    <View style={{ flex: 1 }}>
      {/* RootLayoutNav سيرسم المحتوى الرئيسي (الtabs، إلخ) */}
      <RootLayoutNav />

      {/* DynamicTimerIsland الآن ستطفو بشكل موثوق فوق RootLayoutNav */}
      <AnimatePresence>
        {shouldShowTimerIsland && <DynamicTimerIsland />}
      </AnimatePresence>
      
      {/* FabRenderer يظل كما هو */}
      <FabRenderer />
    </View>
  );
}



// مكون مساعد لعرض زر FAB العائم
function FabRenderer() {
  const { fabConfig, isSheetVisible } = useFab();
  if (isSheetVisible || !fabConfig) return null;
  const { component: FabComponent, props } = fabConfig;
  if (!FabComponent) return null;
  return <FabComponent {...props} />;
}

// إدارة مكدس الصفحات الرئيسي والتوجيه
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
      <Stack.Screen name="subject-details" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="lesson-view" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="study-kit" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="(modals)/study-timer" options={{ presentation: 'modal' }} />
      <Stack.Screen name="ai-chatbot" options={{ presentation: 'modal' }} />
      <Stack.Screen name="chat-history" options={{ presentation: 'modal' }} />
      <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

// --- المكون "الحارس" الذي يعالج التهيئة والمستمعين العالميين ---
function MainLayout() {
  const { authLoading, hasCompletedOnboarding, setHasCompletedOnboarding, user } = useAppState();
  const router = useRouter();

  const handleOnboardingComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
      setHasCompletedOnboarding(true);
    } catch (e) {
      console.error('Error saving onboarding status:', e);
    }
  }, [setHasCompletedOnboarding]);

  useEffect(() => {
    apiService.wakeUp().catch(() => {}); // Fire and forget
  }, []); 

  // useEffect للاستماع إلى الإشعارات الجديدة
  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirestore();
    const notificationsRef = collection(db, 'userNotifications', user.uid, 'inbox');
    const q = query(notificationsRef, where('read', '==', false), orderBy('createdAt', 'desc'), limit(1));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newNotification = change.doc.data();
          Toast.show({
            type: 'info',
            text1: newNotification.title || 'رسالة جديدة من EduAI',
            text2: newNotification.message,
            onPress: () => {
              router.push('/notifications');
              Toast.hide();
            }
          });
        }
      });
    });
    return () => unsubscribe();
  }, [user, router]);

  // useEffect لتهيئة خدمة التحليلات
  useEffect(() => {
    BehavioralAnalyticsService.init();
  }, []);

  // --- ✅ [FINAL FIX] شرط التحميل المبسط ---
  if (authLoading || hasCompletedOnboarding === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (hasCompletedOnboarding === false) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // --- ✅ عرض التطبيق بالكامل بعد انتهاء التحميل ---
  return <AppContent />;
}

// المكون الأعلى مستوى الذي يغلف التطبيق بالـ Providers

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppStateProvider>
        <FabProvider>
          <EditModeProvider>
            <ActionSheetProvider>
              <MainLayout />
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