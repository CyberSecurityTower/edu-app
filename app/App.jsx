import React, { useState } from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import OnboardingScreen from './OnboardingScreen.jsx';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0C0F27'
  },
  text: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold'
  }
});