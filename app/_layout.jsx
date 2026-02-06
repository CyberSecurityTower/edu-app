// app/_layout.jsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, LogBox, StyleSheet, View, Text, Pressable } from 'react-native'; // ✅ تمت إضافة Text و Pressable
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-get-random-values';
import Toast from 'react-native-toast-message';
import PenaltyModal from '../components/PenaltyModal';
import { useFab } from '../context/FabContext';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons'; 
import VacationModeScreen from '../components/VacationModeScreen';
import { ThemeProvider as NavThemeProvider, DarkTheme } from '@react-navigation/native';
import 'react-native-get-random-values';
import { StatusBar } from 'expo-status-bar';
// --- Contexts ---
import { ActionSheetProvider } from '../context/ActionSheetContext';
import { AppStateProvider, useAppState } from '../context/AppStateContext';
import { ChatProvider } from '../context/ChatContext';
import { EditModeProvider } from '../context/EditModeContext';
import { FabProvider } from '../context/FabContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider } from '../context/ThemeContext';
import { TimerProvider } from '../context/TimerContext';
import { UIStateProvider, useUIState } from '../context/UIStateContext';

// --- Services & Components ---
import { AddTaskModal } from '../components/AddTaskBottomSheet';
import CustomAlert from '../components/CustomAlert';
import DynamicCampaignModal from '../components/DynamicCampaignModal';
import MaintenanceScreen from '../components/MaintenanceScreen';
import MiniChat from '../components/MiniChat';
import NetworkStatusBanner from '../components/NetworkStatusBanner';
import NoConnectionScreen from '../components/NoConnectionScreen';
import StreakCelebrationModal from '../components/StreakCelebrationModal';
import { apiService } from '../config/api';
import { toastConfig } from '../config/toastConfig';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { setupPushNotifications } from '../services/PushSetup';
import { fetchActiveCampaign, logSessionStart } from '../services/supabaseService';
import { useAppInitialization } from '../hooks/useAppInitialization'; // ✅ الاستيراد
SplashScreen.preventAutoHideAsync().catch(() => {});

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

LogBox.ignoreLogs([
  'WARN', 
  'Require cycle:', 
  'new NativeEventEmitter',
  '[Reanimated] Reading from `value`'
]);

const NavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0C0F27',
  },
};

// ... (MainContent و RootLayoutNav يبقيان كما هما في كودك الأصلي)
function MainContent() {
  const { 
    isChatPanelVisible, closeChatPanel, setIsTabBarVisible, 
    isAddTaskModalVisible, closeAddTaskModal, 
    alertConfig, hideAlert 
  } = useUIState();
  
  const { user, streakReward, handleCloseStreakModal, penaltyReward, setPenaltyReward } = useAppState();
  
  useEffect(() => {
    setIsTabBarVisible(!isChatPanelVisible && !isAddTaskModalVisible); 
  }, [isChatPanelVisible, isAddTaskModalVisible]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0C0F27' }}>
      <View style={{ flex: 1, zIndex: 1 }}>
        <RootLayoutNav />
      </View>
      <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]} pointerEvents="box-none">
         {isChatPanelVisible && <MiniChat isVisible={isChatPanelVisible} onClose={closeChatPanel} user={user} />}
         {isAddTaskModalVisible && <AddTaskModal isVisible={isAddTaskModalVisible} onClose={closeAddTaskModal} />}
      </View>
      <PenaltyModal isVisible={!!penaltyReward} data={penaltyReward} onClose={() => setPenaltyReward(null)} />
      <StreakCelebrationModal isVisible={!!streakReward && !penaltyReward} data={streakReward} onClose={handleCloseStreakModal} />
      <CustomAlert isVisible={alertConfig.isVisible} title={alertConfig.title} message={alertConfig.message} buttons={alertConfig.buttons} onClose={hideAlert} />
    </View>
  );
}
if (!__DEV__) {
  // نقوم باستبدال دوال الطباعة بدوال فارغة
  // هذا يمنع المعالج من إضاعة الوقت في تحويل البيانات وإرسالها
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function RootLayoutNav() {
  const { user, authLoading, hasCompletedOnboarding } = useAppState();
  const segments = useSegments();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (authLoading || !isMounted) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isOnboarding = segments[0] === 'onboarding';

    if (hasCompletedOnboarding === false) {
      if (!isOnboarding) router.replace('/onboarding');
      return;
    }

    if (user) {
      if (user.profileStatus === 'pending_setup') {
         if (segments[0] !== '(setup)') router.replace('/(setup)/profile-setup');
      } else if (inAuthGroup || isOnboarding) {
         router.replace('/(tabs)/');
      }
    } else {
      const preventRedirectPages = ['forgot-password', 're-login'];
      if (!inAuthGroup && !isOnboarding && !preventRedirectPages.includes(segments[1])) {
        router.replace('/(auth)/login');
      }
    }
  }, [user, segments, authLoading, hasCompletedOnboarding, isMounted]);

  return (
    <NavThemeProvider value={NavigationTheme}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: '#0C0F27' } }}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(setup)" />
        <Stack.Screen 
  name="(tabs)" 
  options={{ 
    animation: 'none', 
    gestureEnabled: false 
  }} 
/>
        <Stack.Screen name="subject-details" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="lesson-view" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="support" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="arena/index" options={{ presentation: 'modal', headerShown: false, gestureEnabled: true }} />
 <Stack.Screen 
      name="workspace/WorkspaceScreen" 
      options={{ 
        presentation: 'modal', 
        headerShown: false, 
        gestureEnabled: true 
      }} 
    />
      </Stack>
    </NavThemeProvider>
  );
}

// 🔥🔥🔥 المكون الرئيسي المعدل 🔥🔥🔥
function MainLayout() {
  // 1. استدعاء Hook التهيئة
  const { isReady, initError, retry } = useAppInitialization();
  
  const { authLoading, user, systemConfig, appReady: dataReady, hasCompletedOnboarding } = useAppState();
  const router = useRouter();
  const networkStatus = useNetworkStatus();
  const [activeCampaign, setActiveCampaign] = useState(null);

  // دالة مساعدة للقيام بـ "Hard Retry"
  const handleHardRetry = async () => {
    // 1. إيقاظ السيرفر
    apiService.wakeUp().catch(() => {});
    // 2. استدعاء إعادة المحاولة مع تمرير true لمسح الكاش
    await retry(true); 
  };

  useEffect(() => {
    if (isReady && !authLoading && dataReady && hasCompletedOnboarding !== null) {
      SplashScreen.hideAsync();
    }
  }, [isReady, authLoading, dataReady, hasCompletedOnboarding]);

  // 3. منطق الإشعارات والحملات (يعمل في الخلفية)
  useEffect(() => {
    if (!user?.uid) return;
    
    // إعداد الإشعارات
    setupPushNotifications(user.uid);
    logSessionStart(user.uid, {});
     
    const checkCampaigns = async () => {
      setTimeout(async () => {
        const campaign = await fetchActiveCampaign(user.uid);
        if (campaign) setActiveCampaign(campaign);
      }, 1500); 
    };
    checkCampaigns();

    const sub1 = Notifications.addNotificationReceivedListener(n => apiService.reportNotificationMetric(n, 'received'));
    const sub2 = Notifications.addNotificationResponseReceivedListener(r => {
        const payload = r.notification.request.content.data || {};
        apiService.reportNotificationMetric(r.notification, 'opened');
        if (payload.targetScreen) setTimeout(() => router.push(payload.targetScreen), 100);
    });
    return () => { sub1.remove(); sub2.remove(); };
  }, [user?.uid]);

  // 🛑 حالة الخطأ في التهيئة (Timeout أو غيره)
   if (initError) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome5 name="tools" size={50} color="#EF4444" style={{ marginBottom: 20 }} />
        <Text style={styles.errorTitle}>{initError.title}</Text>
        <Text style={styles.errorMessage}>{initError.message}</Text>
        
        {/* زر إعادة المحاولة مع تنظيف الكاش */}
        <Pressable 
            onPress={handleHardRetry} 
            style={({pressed}) => [styles.retryButton, { opacity: pressed ? 0.8 : 1 }]}
        >
            <Text style={styles.retryButtonText}>إصلاح وإعادة المحاولة</Text>
            <FontAwesome5 name="redo" size={14} color="white" />
        </Pressable>
      </View>
    );
  }

  // ⏳ 2. حالة التحميل
  if (!isReady || authLoading || !dataReady || hasCompletedOnboarding === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // 🛑 3. حالة الصيانة
  if (systemConfig?.maintenance_mode) return <MaintenanceScreen />;
  
  // 🏖️ 4. وضع العطلة الصيفية (جديد) 
  if (systemConfig?.vacation_mode) return <VacationModeScreen />;
  // 🛑 5. حالة انقطاع الإنترنت (مع Hard Retry أيضاً)
  if (networkStatus === 'none' || networkStatus === 'no-internet') {
      // نمرر handleHardRetry هنا لضمان مسح أي بيانات معلقة قد تسبب مشاكل عند عودة النت
      return <NoConnectionScreen onRetry={handleHardRetry} />;
  }

  // ✅ التطبيق جاهز
  return (
    <>
      <MainContent />
      <DynamicCampaignModal campaign={activeCampaign} onClose={() => setActiveCampaign(null)} />
    </>
  );
}

function AppProviders() {
  const { user } = useAppState();
  return (
    <ChatProvider user={user}>
      <FabProvider>
        <EditModeProvider>
          <ActionSheetProvider>
            <MainLayout />
            <Toast config={toastConfig} />
            <NetworkStatusBanner />
          </ActionSheetProvider>
        </EditModeProvider>
      </FabProvider>
    </ChatProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0C0F27' }}>
     <StatusBar 
        style="light"             // يجعل الأيقونات (البطارية، الساعة) بيضاء
        backgroundColor="#0C0F27" // يجعل الخلفية نفس لون التطبيق (للأندرويد)
        translucent={false}       // يمنع تداخل المحتوى مع الشريط (اختياري، يفضل false لضمان اللون)
      />
      <LanguageProvider>
        <ThemeProvider>
          <TimerProvider>
            <UIStateProvider>
              <AppStateProvider>
                <AppProviders />
              </AppStateProvider>
            </UIStateProvider>
          </TimerProvider>
        </ThemeProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#0C0F27' 
  },
  // ستايلات شاشة الخطأ الجديدة
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0C0F27',
    padding: 30
  },
  errorTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  errorMessage: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#38BDF8',
    paddingHorizontal: 25,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#38BDF8',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});