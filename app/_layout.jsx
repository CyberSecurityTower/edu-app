import { Stack, useRouter, useSegments } from 'expo-router';
import { useState, useEffect } from 'react';
import OnboardingScreen from '../components/OnboardingScreen';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

const InitialLayout = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        // onAuthStateChanged returns an unsubscriber
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            // Delay setting user to avoid flicker
            setTimeout(() => {
                setUser(currentUser);
                setLoading(false);
            }, 500); 
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (loading) return; // Do nothing until loading is complete

        const inAuthGroup = segments[0] === '(auth)'; // This is incorrect, segments don't include groups
        const inApp = segments[0] === '(home)';

        if (user && !inApp) {
            // CORRECTED: Navigate to the root URL which is handled by the (home) group
            router.replace('/');
        } else if (!user && inApp) {
            // CORRECTED: Navigate to the /login URL
            router.replace('/login');
        }
    }, [user, loading, segments]);

    // Show a loading screen while we check for a user
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

    // Stack Navigator for the entire app
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="create-account" />
            <Stack.Screen name="(home)" />
        </Stack>
    );
};


export default function RootLayout() {
    const [showOnboarding, setShowOnboarding] = useState(true);

    if (showOnboarding) {
        return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
    }

    return <InitialLayout />;
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0C0F27'
    }
});