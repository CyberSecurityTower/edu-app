import { Stack, useRouter, useSegments } from 'expo-router';
import { useState, useEffect } from 'react';
import OnboardingScreen from '../components/OnboardingScreen';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View } from 'react-native';

const InitialLayout = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (user && !inAuthGroup) {
            router.replace('/(home)');
        } else if (!user) {
            router.replace('/login');
        }
    }, [user, loading, segments]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' }}>
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

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