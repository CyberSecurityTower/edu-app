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
    if (loading) return; // Wait until auth state is known

    const inAuthGroup = segments[0] === '(auth)';

    // UPGRADED LOGIC: This is much simpler and more robust
    if (user && inAuthGroup) {
      // If the user is signed in and somehow lands on a login/create screen,
      // redirect them to the main app area.
      router.replace('/');
    } else if (!user && !inAuthGroup) {
      // If the user is NOT signed in and is NOT in the auth group (e.g., they are on a protected screen),
      // redirect them to the login screen.
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
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(home)" />
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