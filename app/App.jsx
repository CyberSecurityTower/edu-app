import React, { useState } from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import OnboardingScreen from './OnboardingScreen.jsx'; // تأكد من أن المسار صحيح

// هذه شاشة وهمية مؤقتة لشاشة إنشاء الحساب
const PlaceholderScreen = () => (
  <SafeAreaView style={styles.container}>
    <Text style={styles.text}>هذه هي شاشة إنشاء الحساب (مؤقت)</Text>
  </SafeAreaView>
);

export default function App() {
  // "الذاكرة" التي تخبرنا إذا انتهى المستخدم من الترحيب
  const [showOnboarding, setShowOnboarding] = useState(true);

  // إذا كانت الذاكرة تقول "اعرض الترحيب" (showOnboarding is true)
  if (showOnboarding) {
    // نعرض مكون الترحيب
    // ونعطيه "جرس الباب" الذي سيقوم بتغيير الذاكرة إلى false
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return <PlaceholderScreen />;
}

// أنماط بسيطة للشاشة المؤقتة
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