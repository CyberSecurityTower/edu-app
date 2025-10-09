import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { auth } from '../../firebase';
import { useAuth } from '../_layout'; // Import the useAuth hook

const HomeScreen = () => {
  const { user } = useAuth(); // Access user data

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to EduApp!</Text>
      {/* Display user's email if available */}
      <Text style={styles.subtitle}>You are logged in as {user?.email}</Text>
      <Pressable style={styles.signOutButton} onPress={() => auth.signOut()}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0C0F27',
    padding: 20,
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
  },
  signOutButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#1E293B',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#334155',
  },
  signOutButtonText: {
    color: '#a7adb8ff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;