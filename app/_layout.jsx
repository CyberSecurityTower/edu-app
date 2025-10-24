// app/_layout.jsx
import React, { useContext, useEffect, useCallback } from 'react';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import { Stack, useSegments, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppStateProvider, useAppState } from '../context/AppStateContext';
import { ActionSheetProvider } from '../context/ActionSheetContext';
import { FabProvider, useFab } from '../context/FabContext';
import { EditModeProvider } from '../context/EditModeContext';
import { toastConfig } from '../config/toastConfig';
import OnboardingScreen from '../components/OnboardingScreen';

LogBox.ignoreLogs(['WARN  [Layout children]']);

/**
 * ✨ --- الإصلاح الحاسم هنا --- ✨
 * تم تعديل هذا المكون ليكون أكثر أمانًا.
 */
function FabRenderer() {
  const { fabConfig, isSheetVisible } = useFab();
  
  // 1. تحقق أولاً من الشروط التي يجب أن تخفي الزر
  // إذا كانت الـ BottomSheet مرئية، أو إذا لم يكن هناك تكوين للزر (null)، فلا تعرض شيئًا.
  if (isSheetVisible || !fabConfig) {
    return null;
  }

  // 2. الآن نحن متأكدون أن fabConfig هو كائن صالح
  const { component: FabComponent, props } = fabConfig;
  
  // 3. تأكد أيضًا من أن المكون نفسه موجود قبل عرضه
  if (!FabComponent) {
    return null;
  }
  return <FabComponent {...props} />;
}

/**
 * هذا المكون هو المسؤول عن منطق التوجيه الرئيسي بعد تحميل التطبيق.
 */
function RootLayoutNav() {
  const { user, authLoading, hasCompletedOnboarding } = useAppState();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // لا تقم بأي توجيه حتى يتم تحميل حالة المصادقة والإعداد الأولي
    const isReady = !authLoading && hasCompletedOnboarding !== null;
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSetupGroup = segments[0] === '(setup)';

    if (user) {
      // إذا كان المستخدم مسجلاً ولكنه لم يكمل إعداد الملف الشخصي
      if (user.profileStatus === 'pending_setup' && !inSetupGroup) {
        router.replace('/(setup)/profile-setup');
      } 
      // إذا كان المستخدم قد أكمل الإعداد وهو حالياً في صفحة تسجيل الدخول أو الإعداد
      else if (user.profileStatus === 'completed' && (inAuthGroup || inSetupGroup)) {
        router.replace('/(tabs)/'); // توجيه إلى الشاشة الرئيسية (التبويبات)
      }
    } 
    // إذا لم يكن المستخدم مسجلاً وهو ليس في صفحة تسجيل الدخول
    else if (!inAuthGroup) {
      router.replace('/(auth)/');
    }
  }, [user, segments, authLoading, hasCompletedOnboarding, router]);

  // تعريف مكدس التنقل الرئيسي (Stack Navigator)
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

/**
 * هذا المكون هو "البوابة" التي تقرر ما يجب عرضه للمستخدم أولاً.
 */
function MainLayout() {
  const { authLoading, hasCompletedOnboarding, setHasCompletedOnboarding } = useAppState();

  // دالة لحفظ حالة إكمال الإعداد الأولي
  const handleOnboardingComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
      setHasCompletedOnboarding(true);
    } catch (e) { console.log('Error saving onboarding status:', e); }
  }, [setHasCompletedOnboarding]);

  // 1. عرض شاشة التحميل أثناء جلب البيانات
  if (authLoading || hasCompletedOnboarding === null) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  // 2. عرض شاشة الإعداد الأولي (Onboarding) إذا لم يكملها المستخدم
  if (hasCompletedOnboarding === false) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // 3. عرض التطبيق الرئيسي إذا تم كل شيء
  return <RootLayoutNav />;
}

/**
 * هذا هو المكون الجذري للتطبيق، يغلف كل شيء بالـ Providers اللازمة.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppStateProvider>
        <FabProvider>
          {/* ✨ 3. إضافة EditModeProvider ليغلف التطبيق */}
          <EditModeProvider>
            <ActionSheetProvider>
              {/* MainLayout يعرض الشاشات الفعلية */}
              <MainLayout />
              
              {/* ✨ 4. المكونات العامة التي تظهر فوق الشاشات */}
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