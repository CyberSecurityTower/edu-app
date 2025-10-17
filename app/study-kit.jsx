// app/study-kit.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';

import { getStudyKit, getUserProgressDocument } from '../services/firestoreService';
import StudyKitTabs from '../components/StudyKitTabs';
import MainHeader from '../components/MainHeader';
import { useAppState } from '../context/AppStateContext';

export default function StudyKitScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAppState();
  const { lessonId, lessonTitle } = params;

  const [kitData, setKitData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPoints, setCurrentPoints] = useState(0);

  // --- THE FIX IS HERE (Part 1): Create a function to refresh points ---
  const refreshPoints = useCallback(async () => {
    if (user?.uid) {
      const progressDoc = await getUserProgressDocument(user.uid);
      setCurrentPoints(progressDoc?.stats?.points || 0);
    }
  }, [user]);

  // Fetch kit data only once
  useEffect(() => {
    const fetchKit = async () => { /* ... (no changes here) ... */ };
    fetchKit();
  }, [lessonId]);

  // Fetch points every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      refreshPoints();
    }, [refreshPoints])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={22} color="white" />
        </Pressable>
        <MainHeader title="Study Kit" isCompact={true} points={currentPoints} />
      </View>
      
      <Text style={styles.lessonTitle}>{lessonTitle}</Text>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : kitData ? (
        // --- THE FIX IS HERE (Part 2): Pass the refresh function down ---
        <StudyKitTabs data={kitData} onPointsUpdate={refreshPoints} />
      ) : (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Could not load the Study Kit.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1E293B' 
  },
  backButton: {
    padding: 10,
  },
  lessonTitle: { 
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center', 
    marginTop: 10, 
    paddingHorizontal: 20, 
    marginBottom: 20
  },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#a7adb8ff', marginTop: 15 },
  errorText: { color: '#EF4444' },
});