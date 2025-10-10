import { Stack, useRouter, useSegments } from 'expo-router';
import { useState, useEffect, createContext, useContext } from 'react';
import OnboardingScreen from '../components/OnboardingScreen';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Suppress known, harmless warnings
LogBox.ignoreLogs([
  'WARN  [Layout children]: No route named "(auth)" exists in nested children',
  'WARN  [Layout children]: No route named "(home)" exists in nested children'
]);

const AppStateContext = createContext(null);

export function useAppState() {
  return useContext(AppStateContext);
}

function RootLayoutNav() {
  const { user, hasCompletedOnboarding } = useAppState();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (hasCompletedOnboarding === null) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (user && inAuthGroup) {
      router.replace('/');
    } else if (!user && !inAuthGroup && hasCompletedOnboarding) {
      // Default to create-account for new users after onboarding
      router.replace('/create-account');
    }
  }, [user, hasCompletedOnboarding, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
      <Stack.Screen name="(home)" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

function AppStateProvider({ children }) {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
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
        <AppStateContext.Provider value={{ user, authLoading, hasCompletedOnboarding, setHasCompletedOnboarding }}>
            {children}
        </AppStateContext.Provider>
    );
}

export default function RootLayout() {
    return (
        <AppStateProvider>
            <MainLayout />
        </AppStateProvider>
    );
}

// THIS IS THE CORRECTED FUNCTION
function MainLayout() {
    const { authLoading, hasCompletedOnboarding, setHasCompletedOnboarding } = useAppState();

    const handleOnboardingComplete = async () => {
        try {
            await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
            setHasCompletedOnboarding(true);
        } catch (e) {
            setHasCompletedOnboarding(true);
        }
    };

    if (authLoading || hasCompletedOnboarding === null) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" style={{ transform: [{ scale: 1.5 }] }} />
            </View>
        );
    }

    // THE FIX IS HERE: We re-added the check for onboarding
    if (hasCompletedOnboarding === false) {
        return <OnboardingScreen onComplete={handleOnboardingComplete} />;
    }

    return <RootLayoutNav />;
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0C0F27'
    }
});