
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getEducationalPaths } from '../../services/firestoreService'; // Import the new service

const ProfileSetupScreen = () => {
  const [paths, setPaths] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPaths = async () => {
      const availablePaths = await getEducationalPaths();
      setPaths(availablePaths);
      setIsLoading(false);
      console.log("Fetched Paths:", availablePaths); // For debugging
    };

    fetchPaths();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>
          Tell us a bit about your studies to personalize your experience.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Select Your Educational Path</Text>
          {isLoading ? (
            <ActivityIndicator size="large" color="#10B981" />
          ) : (
            // We will replace this with a dropdown component soon
            <Text style={{ color: 'white' }}>
              {paths.length > 0 ? `Found ${paths.length} paths!` : 'No paths found.'}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

// ... (styles remain the same)
// Add the new styles
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
    alignItems: 'center', // Center the loading indicator
  },
  label: {
    fontSize: 16,
    color: '#a7adb8ff',
    marginBottom: 15,
    alignSelf: 'flex-start', // Align label to the left
    marginLeft: 5,
  },
});


export default ProfileSetupScreen;