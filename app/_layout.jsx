import { Stack, useRouter, useSegments } from 'expo-router';
import { useState, useEffect, createContext, useContext } from 'react';
import OnboardingScreen from '../components/OnboardingScreen';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Create a context to hold authentication status
const AuthContext = createContext(null);

// Custom hook to easily access the user
export function useAuth() {
  return useContext(AuthContext);
}

function InitialLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait until the auth state is known

    const inAuthGroup = segments[0] === '(auth)';

    if (user && inAuthGroup) {
      // If user is signed in and in the auth group, redirect to home
      router.replace('/'); 
    } else if (!user && !inAuthGroup) {
      // If user is not signed in and not in the auth group, redirect to login
      router.replace('/login');
    }
  }, [user, loading, segments]);

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