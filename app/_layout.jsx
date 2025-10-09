import { Stack, useRouter, useSegments } from 'expo-router';
import { useState, useEffect, createContext, useContext } from 'react';
import OnboardingScreen from '../components/OnboardingScreen';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

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

    // Check if the user is in any of the app's main groups
    const inApp = segments[0] === '(auth)' || segments[0] === '(home)';

    if (user && !inApp) {
      // User is signed in but not in the home group, redirect to home.
      router.replace('/'); 
    } else if (!user && !inApp) {
      // User is not signed in and not in the auth group, redirect to login.
      router.replace('/login');
    }
  }, [user, loading, segments]);

  // The layout is loading the auth state, show a loading indicator.
  // This replaces the need for app/index.jsx
  if (loading) {
    return (
        <View style={styles.loadingContainer}>
            {/* UPGRADED: Added a transform style to make the indicator bigger */}
            <ActivityIndicator size="large" color="#10B981" style={{ transform: [{ scale: 1.5 }] }} />
        </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
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
    const [showOnboarding, setShowOnboarding] = useState(true);

    if (showOnboarding) {
        return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
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