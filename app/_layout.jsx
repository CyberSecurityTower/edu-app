import { Stack, useRouter, useSegments } from 'expo-router';
import { useState, useEffect, createContext, useContext } from 'react';
import OnboardingScreen from '../components/OnboardingScreen';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function InitialLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (user && inAuthGroup) {
      router.replace('/');
    } else if (!user && !inAuthGroup) {
      router.replace('/login');
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" style={{ transform: [{ scale: 1.5 }] }} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
      <Stack.Screen name="(home)" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export default function RootLayout() {
    const [isOnboardingLoading, setIsOnboardingLoading] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
      const checkOnboardingStatus = async () => {
        try {
          const hasCompleted = await AsyncStorage.getItem('@hasCompletedOnboarding');
          if (hasCompleted !== null) {
            setShowOnboarding(false);
          } else {
            setShowOnboarding(true);
          }
        } catch (error) {
          setShowOnboarding(true); // Default to showing onboarding if there's an error
        } finally {
          setIsOnboardingLoading(false);
        }
      };

      checkOnboardingStatus();
    }, []);

    const handleOnboardingComplete = async () => {
        try {
            await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
            setShowOnboarding(false);
        } catch (error) {
            // Even if saving fails, hide it for the current session
            setShowOnboarding(false);
        }
    };

    if (isOnboardingLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" style={{ transform: [{ scale: 1.5 }] }} />
            </View>
        );
    }

    if (showOnboarding) {
        return <OnboardingScreen onComplete={handleOnboardingComplete} />;
    }

    return (
        <AuthProvider>
            <InitialLayout />
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0C0F27'
    }
});