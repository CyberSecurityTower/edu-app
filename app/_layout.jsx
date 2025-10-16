import { Stack, useSegments, useRouter } from 'expo-router';
import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';
import { getUserProfile, listenToUserProgress } from '../services/firestoreService'; // استيراد listenToUserProgress
import OnboardingScreen from '../components/OnboardingScreen';

LogBox.ignoreLogs(['WARN  [Layout children]']);

const AppStateContext = createContext(null);
export function useAppState() {
  return useContext(AppStateContext);
}

function AppStateProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProgress, setUserProgress] = useState(null); // --- ✨ حالة جديدة لتقدم المستخدم
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

  // --- ✨ التأثير الجديد الذي يستمع لتقدم المستخدم ---
  useEffect(() => {
    // إذا لم يكن هناك مستخدم، لا تفعل شيئًا
    if (!user || !user.uid) {
      setUserProgress(null);
      return;
    }

    // ابدأ الاستماع...
    console.log(`Setting up userProgress listener for UID: ${user.uid}`);
    const unsubscribe = listenToUserProgress(user.uid, (progressData) => {
      console.log("Global context received progress update!");
      setUserProgress(progressData); // تحديث الحالة العامة عند وصول بيانات جديدة
    });

    // أوقف الاستماع عند تسجيل الخروج أو تغيير المستخدم
    return () => {
      console.log("Cleaning up userProgress listener.");
      unsubscribe();
    };
  }, [user]); // هذا التأثير يعمل فقط عندما يتغير كائن المستخدم

  return (
    <AppStateContext.Provider
      value={{ user, userProgress, authLoading, hasCompletedOnboarding, setHasCompletedOnboarding, setUser }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

// --- RootLayoutNav و MainLayout و RootLayout تبقى كما هي تمامًا ---
// (لا حاجة لتغيير أي شيء في بقية الملف)

function RootLayoutNav() {
  const { user, authLoading, hasCompletedOnboarding } = useAppState();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || hasCompletedOnboarding === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSetupGroup = segments[0] === '(setup)';
    const inAppGroup = segments[0] === '(tabs)';
    
    if (user) {
      if (user.profileStatus === 'pending_setup' && !inSetupGroup) {
        router.replace('/(setup)/profile-setup');
      } else if (user.profileStatus === 'completed' && !inAppGroup && !inSetupGroup) {
        router.replace('/(tabs)/');
      }
    } else if (!inAuthGroup) {
      router.replace('/(auth)/');
    }
  }, [user, segments, authLoading, hasCompletedOnboarding]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(setup)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="subject-details" options={{ animation: 'slide_from_right' }} />
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
});