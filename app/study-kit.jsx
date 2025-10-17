// app/study-kit.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';

import { getStudyKit } from '../services/firestoreService';
import StudyKitTabs from '../components/StudyKitTabs';

export default function StudyKitScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { lessonId, lessonTitle } = params;

  const [kitData, setKitData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchKit = async () => {
      setIsLoading(true);
      const [kitResult] = await Promise.all([
        getStudyKit(lessonId),
        new Promise(resolve => setTimeout(resolve, 1500))
      ]);
      if (kitResult) setKitData(kitResult);
      setIsLoading(false);
    };
    fetchKit();
  }, [lessonId]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <FontAwesome5 name="arrow-left" size={22} color="white" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <FontAwesome5 name="magic" size={16} color="#10B981" />
          <Text style={styles.headerTitle}>Study Kit</Text>
        </View>
        <View style={{ width: 50 }} />
      </View>
      <Text style={styles.lessonTitle}>{lessonTitle}</Text>

      {/* --- FIX #3: Vertically centering the content --- */}
      <View style={styles.contentWrapper}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Generating your smart tools...</Text>
          </View>
        ) : kitData ? (
          <StudyKitTabs data={kitData} />
        ) : (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>Could not load the Study Kit.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerIcon: { width: 50, justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  lessonTitle: { color: '#a7adb8ff', fontSize: 16, textAlign: 'center', marginTop: 10, paddingHorizontal: 20 },
  // New wrapper for the main content
  contentWrapper: {
    flex: 1,
    justifyContent: 'center', // This pushes the content to the vertical center
    paddingHorizontal: 20,
  },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#a7adb8ff', marginTop: 15 },
  errorText: { color: '#EF4444' },
});