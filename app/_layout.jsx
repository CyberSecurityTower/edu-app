 import { Stack } from 'expo-router';
    import { useState } from 'react';
    import OnboardingScreen from '../components/OnboardingScreen'; 

    export default function RootLayout() {
      const [showOnboarding, setShowOnboarding] = useState(true);

      if (showOnboarding) {
        return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
      }

      return (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="create-account" />
          <Stack.Screen name="login" />
        </Stack>
      );
    }