import React, { useState } from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import OnboardingScreen from './OnboardingScreen.jsx';
import CreateAccount from "./CreateAccountScreen.jsx";
const PlaceholderScreen = () => (
  <SafeAreaView>
    <CreateAccount/>
  </SafeAreaView>
);

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return <PlaceholderScreen />;
}