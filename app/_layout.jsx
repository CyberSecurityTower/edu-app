import { Stack, useSegments, useNavigationContainerRef } from 'expo-router';
import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase';
import { getUserProfile } from '../services/firestoreService'; 
import OnboardingScreen from '../components/OnboardingScreen';

LogBox.ignoreLogs(['WARN  [Layout children]']); // Ignore layout warnings

// ---------- Context ----------
const AppStateContext = createContext(null);
export function useAppState() {
  return useContext(AppStateContext);
}

// ---------- Root Navigation ----------
function RootLayoutNav() {
  const { user, hasCompletedOnboarding } = useAppState();
  const segments = useSegments();
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (hasCompletedOnboarding === null || (user && !user.profileStatus)) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSetupGroup = segments[0] === '(setup)';
    const inApp = segments[0] === '(tabs)';

    // This logic now correctly uses navigationRef via closure
    // without needing it as a dependency.
    if (user) {
        if (user.profileStatus === 'pending_setup' && !inSetupGroup) {
            navigationRef.resetRoot({
                index: 0,
                routes: [{ name: '(setup)' }],
            });
        } else if (user.profileStatus === 'completed' && !inApp) {
            navigationRef.resetRoot({
                index: 0,
                routes: [{ name: '(tabs)' }],
            });
        }
    } else if (!inAuthGroup) {
        navigationRef.resetRoot({
            index: 0,
            routes: [{ name: '(auth)' }],
        });
    }
}, [user, hasCompletedOnboarding, segments]); // <-- navigationRef has been removed

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(setup)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="subject-details"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}

// ---------- App State Provider ----------
function AppStateProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // 2. أضف هذا السجل لنرى متى يتم تشغيل المستمع
      console.log('Auth state changed. Current user:', currentUser?.uid || 'No user');

      if (currentUser) {
        // 3. أضف سجلات قبل وبعد جلب ملف المستخدم
        console.log('Fetching user profile for UID:', currentUser.uid);
        const userProfile = await getUserProfile(currentUser.uid);
        console.log('User profile fetched:', userProfile); // <-- هذا السجل حاسم جداً

        if (userProfile) {
          setUser(userProfile);
        } else {
          // هذا يحدث فقط للمستخدمين الجدد، ولكن من الجيد تسجيله
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
        setHasCompletedOnboarding(false);
      }
    };

    checkOnboardingStatus();
    return () => unsubscribeAuth();
  }, []);

  return (
    <AppStateContext.Provider
      value={{
        user,
        authLoading,
        hasCompletedOnboarding,
        setHasCompletedOnboarding,
        setUser,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

// ---------- Root Layout ----------
export default function RootLayout() {
  return (
    <AppStateProvider>
      <MainLayout />
    </AppStateProvider>
  );
}

// ---------- Main Layout ----------
function MainLayout() {
  const { authLoading, hasCompletedOnboarding, setHasCompletedOnboarding } =
    useAppState();

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
      setHasCompletedOnboarding(true);
    } catch {
      setHasCompletedOnboarding(true);
    }
  };

  if (authLoading || hasCompletedOnboarding === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#10B981"
          style={{ transform: [{ scale: 1.5 }] }}
        />
      </View>
    );
  }

  if (hasCompletedOnboarding === false) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return <RootLayoutNav />;
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0C0F27',
  },
});
