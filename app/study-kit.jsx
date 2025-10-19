// app/study-kit.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';

import { getStudyKit } from '../services/firestoreService';
import StudyKitTabs from '../components/StudyKitTabs';
import MainHeader from '../components/MainHeader';
import { useAppState } from '../context/AppStateContext';

export default function StudyKitScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  // --- THE FIX: Destructure safely with defaults ---
  const { lessonId, lessonTitle, pathId, subjectId } = params || {};

  const { user, points, refreshPoints } = useAppState();

  const [kitData, setKitData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchKit = async () => {
      // Critical check before fetching
      if (!lessonId) {
        if (mounted) setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const kitResult = await getStudyKit(lessonId);
        if (!mounted) return;

        if (kitResult) {
          setKitData(kitResult);
        } else {
          Alert.alert("Not Found", "No Study Kit is available for this lesson yet.");
        }
      } catch (error) {
        if (!mounted) return;
        console.error("Error fetching study kit:", error);
        Alert.alert("An Error Occurred", "Could not fetch the study kit.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    if (lessonId) {
      fetchKit();
    } else {
      setTimeout(() => {
        if (mounted) {
          Alert.alert("Error", "Lesson ID is missing.");
          setIsLoading(false);
        }
      }, 150);
    }

    return () => { mounted = false; };
  }, [lessonId]);

  useFocusEffect(
    useCallback(() => {
      if (refreshPoints) {
        refreshPoints();
      }
    }, [refreshPoints])
  );

  const safeLessonTitle = lessonTitle ?? 'Study Kit';
  
  // If critical IDs are missing (shouldn't happen now), we handle gracefully
  if (!lessonId || !pathId || !subjectId) {
       return (
        <SafeAreaView style={styles.centerContent}>
            <Text style={styles.errorText}>خطأ: بيانات المسار غير متوفرة. يرجى العودة.</Text>
        </SafeAreaView>
       );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={22} color="white" />
        </Pressable>
         <MainHeader 
          title="Study Kit" 
          isCompact={true} 
          points={points}
          hideNotifications={true}
        />
      </View>
      
      <Text style={styles.lessonTitle}>{safeLessonTitle}</Text>

     {isLoading ? (
        <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Generating your smart tools...</Text>
        </View>
    ) : kitData ? (
      <StudyKitTabs 
          data={kitData} 
          lessonTitle={safeLessonTitle}
          lessonId={lessonId}
          // --- Pass the new IDs down ---
          pathId={pathId}
          subjectId={subjectId}
      />
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
  errorText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' },
});