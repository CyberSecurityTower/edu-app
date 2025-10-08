import React, { useState } from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import OnboardingScreen from './OnboardingScreen.jsx';
import CreateAccount from "./CreateAccountScreen";
const PlaceholderScreen = () => (
  <SafeAreaView style={styles.container}>
    <Text style={styles.text}>Create Account Screen (Placeholder)</Text>
  </SafeAreaView>
);

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return <PlaceholderScreen />;
}