import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import OnboardingScreen from './OnboardingScreen.jsx';
import AuthNavigator from './navigation/AuthNavigator.jsx';

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <NavigationContainer>
      <AuthNavigator />
    </NavigationContainer>
  );
}