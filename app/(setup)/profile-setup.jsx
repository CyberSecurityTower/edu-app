import React from 'react'; // <--- THE FIX IS HERE
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ProfileSetupScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>
          Tell us a bit about your studies to personalize your experience.
        </Text>

        {/* We will add dropdowns and selectors here */}
        <View style={styles.form}>
          <Text style={styles.label}>Select Your Educational Path</Text>
          {/* Placeholder for Educational Path Dropdown */}

          <Text style={styles.label}>Preferred App Language</Text>
          {/* Placeholder for App Language Selector */}

          <Text style={styles.label}>Primary Language of Instruction</Text>
          {/* Placeholder for Instruction Language Selector */}
        </View>

        {/* We will add a save button here */}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0C0F27',
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#a7adb8ff',
    marginBottom: 40,
    textAlign: 'center',
    maxWidth: '90%',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    color: '#a7adb8ff',
    marginBottom: 10,
    marginLeft: 5,
  },
});

export default ProfileSetupScreen;