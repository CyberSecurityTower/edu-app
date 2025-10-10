import { Stack, useRouter, useSegments } from 'expo-router';
import { useState, useEffect, createContext, useContext } from 'react';
import OnboardingScreen from '../components/OnboardingScreen';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile } from '../services/firestoreService';

console.log("--- SCRIPT START: _layout.jsx is being executed ---");

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
  console.log("Step 5: RootLayoutNav is rendering.");
  const { user, hasCompletedOnboarding } = useAppState();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    console.log("Step 6: Redirection useEffect running with state:", { 
      userExists: !!user, 
      profileStatus: user?.profileStatus,
      onboardingComplete: hasCompletedOnboarding,
      segments 
    });

    // Guard 1: Wait until onboarding status is known.
    if (hasCompletedOnboarding === null) {
      console.log("Decision: Paused. Waiting for onboarding status.");
      return;
    }
    
    // Guard 2: If onboarding is not complete, do nothing. MainLayout will show the OnboardingScreen.
    if (!hasCompletedOnboarding) {
        console.log("Decision: Paused. Onboarding is in progress.");
        return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inSetupGroup = segments[0] === '(setup)';

    // --- LOGIC FOR LOGGED-IN USERS ---
    if (user) {
      // Case 1: User needs to complete their profile.
      if (user.profileStatus === 'pending_setup' && !inSetupGroup) {
        console.log("Decision: User needs setup. Redirecting to /profile-setup");
        router.replace('/profile-setup');
        return; // Stop further checks
      }
      
      // Case 2: User has completed setup and is on a setup or auth page.
      if (user.profileStatus === 'completed' && (inSetupGroup || inAuthGroup)) {
        console.log("Decision: User is fully set up. Redirecting to home /");
        router.replace('/');
        return; // Stop further checks
      }
    } 
    // --- LOGIC FOR LOGGED-OUT USERS ---
    else {
      // Case 3: User is logged out but is not on an auth page.
      if (!inAuthGroup) {
        console.log("Decision: User is logged out. Redirecting to /create-account");
        router.replace('/create-account');
        return; // Stop further checks
      }
    }
    
    console.log("Decision: No redirection needed. User is in the correct location.");

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
    const [user, setUser] = useState(null);
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

        const checkOnboardingStatus = async () => {
            try {
                console.log("Checking AsyncStorage for onboarding status...");
                const hasCompleted = await AsyncStorage.getItem('@hasCompletedOnboarding');
                console.log("Value from AsyncStorage:", hasCompleted);
                setHasCompletedOnboarding(hasCompleted === 'true');
            } catch (e) {
                console.error("Error reading from AsyncStorage:", e);
                setHasCompletedOnboarding(false);
            }
        };

        checkOnboardingStatus();

        return () => {
          console.log("Cleaning up auth listener.");
          unsubscribeAuth();
        };
    }, []);

    console.log("AppStateProvider is about to provide context values:", { user: !!user, authLoading, hasCompletedOnboarding });
    return (
        <AppStateContext.Provider value={{ user, authLoading, hasCompletedOnboarding, setHasCompletedOnboarding, setUser }}>
            {children}
        </AppStateContext.Provider> // <--- THE FIX IS HERE
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