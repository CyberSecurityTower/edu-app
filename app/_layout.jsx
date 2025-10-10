import { Stack, useRouter, useSegments } from 'expo-router';
import { useState, useEffect, createContext, useContext } from 'react';
import OnboardingScreen from '../components/OnboardingScreen';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile } from '../services/firestoreService';

LogBox.ignoreLogs([
  'WARN  [Layout children]: No route named "(auth)" exists in nested children',
  'WARN  [Layout children]: No route named "(home)" exists in nested children',
  'WARN  [Layout children]: No route named "(setup)" exists in nested children'
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
    if (hasCompletedOnboarding === null) {
      return;
    }
    
    if (!hasCompletedOnboarding) {
      return;
    }

    if (user && !user.profileStatus) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inSetupGroup = segments[0] === '(setup)';

    if (user) {
      if (user.profileStatus === 'pending_setup' && !inSetupGroup) {
        router.replace('/profile-setup');
        return;
      }
      
      if (user.profileStatus === 'completed' && (inSetupGroup || inAuthGroup)) {
        router.replace('/');
        return;
      }
    } 
    else {
      if (!inAuthGroup) {
        router.replace('/create-account');
        return;
      }
    }
  }, [user, hasCompletedOnboarding, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(home)" />
      <Stack.Screen name="(setup)" />
    </Stack>
  );
}

function AppStateProvider({ children }) {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userProfile = await getUserProfile(currentUser.uid);
                
                if (userProfile) {
                    // Happy path: Profile found in Firestore.
                    setUser(userProfile);
                } else {
                    // CRITICAL FIX: Profile not found, but user is authenticated.
                    // This happens for users who existed before the profile system,
                    // or if there's a Firestore write delay.
                    // We assume they need to go through setup.
                    setUser({ 
                        uid: currentUser.uid, 
                        email: currentUser.email, 
                        profileStatus: 'pending_setup' // Force 'pending_setup' status
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

        return () => {
          unsubscribeAuth();
        };
    }, []);

    return (
        <AppStateContext.Provider value={{ user, authLoading, hasCompletedOnboarding, setHasCompletedOnboarding, setUser }}>
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