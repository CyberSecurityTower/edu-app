import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';

import { getStudyKit } from '../services/firestoreService';
import StudyKitTabs from '../components/StudyKitTabs';
import MainHeader from '../components/MainHeader'; // <-- Import our reusable header

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
      {/* --- THE FIX IS HERE: Using the MainHeader component --- */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={22} color="white" />
        </Pressable>
        {/* We pass a custom title to our reusable header */}
        <MainHeader title="Study Kit" />
      </View>
      
      <Text style={styles.lessonTitle}>{lessonTitle}</Text>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  // Updated header style to accommodate the back button and the new header
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