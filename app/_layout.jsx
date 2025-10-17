import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';
import { Stack, useSegments, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';

import { auth } from '../firebase';
import { getUserProfile } from '../services/firestoreService';
import OnboardingScreen from '../components/OnboardingScreen';

// --- THE FIX IS HERE: We now import BOTH from the new central file ---
import AppStateContext from '../context/AppStateContext'; // Import only the context

LogBox.ignoreLogs(['WARN  [Layout children]']);

// --- Custom Toast Design ---
const toastConfig = {
  points: ({ text1 }) => (
    <View style={styles.toastContainer}>
      <LinearGradient colors={['#10B981', '#34D399']} style={styles.toastGradient}>
        <FontAwesome5 name="star" size={18} color="white" solid />
        <Text style={styles.toastText}>{text1}</Text>
      </LinearGradient>
    </View>
  ),
};

// --- AppStateProvider now ONLY provides the state ---
function AppStateProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const userProfile = await getUserProfile(currentUser.uid);
          setUser(userProfile ? { uid: currentUser.uid, ...userProfile } : { uid: currentUser.uid, email: currentUser.email, profileStatus: 'pending_setup' });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    });

    const checkOnboardingStatus = async () => {
      try {
        const hasCompleted = await AsyncStorage.getItem('@hasCompletedOnboarding');
        setHasCompletedOnboarding(hasCompleted === 'true');
      } catch (e) {
        console.log('Error reading onboarding status:', e);
        setHasCompletedOnboarding(false);
      }
    };

    checkOnboardingStatus();
    
    return () => unsubscribeAuth();
  }, []);

  const contextValue = useMemo(() => ({
    user, authLoading, hasCompletedOnboarding, setHasCompletedOnboarding, setUser,
  }), [user, authLoading, hasCompletedOnboarding]);

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
}

// ... (RootLayoutNav and MainLayout remain the same)
function RootLayoutNav() { /* ... */ }
function MainLayout() { /* ... */ }


export default function RootLayout() {
  return (
    <AppStateProvider>
      <MainLayout />
      <Toast config={toastConfig} />
    </AppStateProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0C0F27',
  },
  toastContainer: {
    width: 'auto',
    maxWidth: '80%',
    alignItems: 'center',
    marginBottom: 50,
  },
  toastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  toastText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});