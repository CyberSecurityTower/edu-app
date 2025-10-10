import { Stack, useRouter, useSegments } from 'expo-router';
import { useState, useEffect, createContext, useContext } from 'react';
import OnboardingScreen from '../components/OnboardingScreen';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

console.log("--- SCRIPT START: _layout.jsx is being executed ---");

LogBox.ignoreLogs([
  'WARN  [Layout children]: No route named "(auth)" exists in nested children',
  'WARN  [Layout children]: No route named "(home)" exists in nested children'
]);

const AppStateContext = createContext(null);

export function useAppState() {
  return useContext(AppStateContext);
}

function RootLayoutNav() {
  console.log("Step 5: RootLayoutNav is rendering.");
  const { user, hasCompletedOnboarding } = useAppState(); // user now contains the profile
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // ... (previous log)

    const inAuthGroup = segments[0] === '(auth)';
    const inSetupGroup = segments[0] === '(setup)';

    if (user) {
      if (user.profileStatus === 'pending_setup' && !inSetupGroup) {
        console.log("Decision: User profile setup is pending. Redirecting to '/profile-setup'");
        router.replace('/profile-setup');
      } else if (user.profileStatus === 'completed' && (inAuthGroup || inSetupGroup)) {
        console.log("Decision: User is logged in and setup is complete. Redirecting to home '/'");
        router.replace('/');
      }
    } else if (!user && !inAuthGroup && hasCompletedOnboarding) {
      console.log("Decision: User is logged out. Redirecting to '/create-account'");
      router.replace('/create-account');
    } else {
      console.log("Decision: No redirection needed at this time.");
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
    console.log("Step 2: AppStateProvider is rendering for the first time.");
    const [user, setUser] = useState(null); // This will now hold the full profile
    const [authLoading, setAuthLoading] = useState(true);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

    useEffect(() => {
        console.log("Step 3: AppStateProvider useEffect is running to set up listeners.");
        
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                console.log("Firebase Auth State Changed! User found:", currentUser.uid);
                const userProfile = await getUserProfile(currentUser.uid);
                setUser(userProfile);
            } else {
                console.log("Firebase Auth State Changed! No user.");
                setUser(null);
            }
            setAuthLoading(false);
        });

        // ... (checkOnboardingStatus remains the same)
        
        checkOnboardingStatus();
        return () => {
          console.log("Cleaning up auth listener.");
          unsubscribeAuth();
        };
    }, []);

    console.log("AppStateProvider is about to provide context values:", { user, authLoading, hasCompletedOnboarding });
    return (
        <AppStateContext.Provider value={{ user, authLoading, hasCompletedOnboarding, setHasCompletedOnboarding, setUser }}>
            {children}
        </AppStateContext.Provider>
    );
}

export default function RootLayout() {
    console.log("Step 1: RootLayout is rendering.");
    return (
        <AppStateProvider>
            <MainLayout />
        </AppStateProvider>
    );
}

function MainLayout() {
    const { authLoading, hasCompletedOnboarding, setHasCompletedOnboarding } = useAppState();
    console.log("Step 4: MainLayout is rendering with state:", { authLoading, hasCompletedOnboarding });

    const handleOnboardingComplete = async () => {
        try {
            console.log("Onboarding complete! Saving to AsyncStorage...");
            await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
            setHasCompletedOnboarding(true);
            console.log("Saved successfully.");
        } catch (e) {
            console.error("Error saving to AsyncStorage:", e);
            setHasCompletedOnboarding(true);
        }
    };

    if (authLoading || hasCompletedOnboarding === null) {
        console.log("Decision: Showing loading screen.");
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" style={{ transform: [{ scale: 1.5 }] }} />
            </View>
        );
    }

    if (hasCompletedOnboarding === false) {
        console.log("Decision: Showing OnboardingScreen.");
        return <OnboardingScreen onComplete={handleOnboardingComplete} />;
    }

    console.log("Decision: Showing RootLayoutNav (the main app).");
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