import { Stack, useRouter, useSegments } from 'expo-router';
import { useState, useEffect, createContext, useContext } from 'react';
import OnboardingScreen from '../components/OnboardingScreen';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile } from '../services/firestoreService';

// Updated to include the new (tabs) group
LogBox.ignoreLogs([
  'WARN  [Layout children]: No route named "(auth)" exists in nested children',
  'WARN  [Layout children]: No route named "(tabs)" exists in nested children',
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
            
    // --- THE ONLY LOGIC CHANGE IS HERE ---
    // If user is logged in and setup is complete, they should be in the (tabs) group.
    // The root route '/' now automatically points to the first screen in (tabs).
    const inApp = segments[0] === '(tabs)';

    if (user) {
      if (user.profileStatus === 'pending_setup' && !inSetupGroup) {
        router.replace('/profile-setup');
        return;
      }
      
      // If user is fully set up but is on an auth or setup page, redirect them into the app.
      if (user.profileStatus === 'completed' && !inApp) {
        router.replace('/'); // Redirecting to '/' will land them on the tabs navigator
        return;
      }
    } 
    else {
      // If user is logged out, they should be in the (auth) group.
      if (!inAuthGroup) {
        router.replace('/create-account');
        return;
      }
    }
  }, [user, hasCompletedOnboarding, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" /> {/* CHANGED FROM (home) */}
      <Stack.Screen name="(setup)" />
       <Stack.Screen 
            name="[subject]" 
            options={{ 
              animation: 'slide_from_right', // Optional: for a nice transition
            }} 
          />
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
                    setUser(userProfile);
                } else {
                    setUser({ 
                        uid: currentUser.uid, 
                        email: currentUser.email, 
                        profileStatus: 'pending_setup'
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