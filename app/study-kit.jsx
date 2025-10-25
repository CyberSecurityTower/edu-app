// app/study-kit.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

import StudyKitTabs from '../components/StudyKitTabs';
import { getStudyKit } from '../services/firestoreService';

export default function StudyKitScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const { lessonId, lessonTitle, subjectId, pathId } = params;

  const [kitData, setKitData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchKit = async () => {
      if (!lessonId) {
        setError("Lesson ID is missing.");
        setIsLoading(false);
        return;
      }
      try {
        const data = await getStudyKit(lessonId);
        if (data) {
          setKitData(data);
        } else {
          setError("Study kit not found for this lesson. It might not be generated yet.");
        }
      } catch (e) {
        console.error("Failed to fetch study kit:", e);
        setError("An error occurred while loading the study kit.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchKit();
  }, [lessonId]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading Study Kit...</Text>
        </View>
      );
    }

    if (error || !kitData) {
      return (
        <View style={styles.centerContainer}>
          <LottieView
            source={require('../assets/images/task_loading.json')}
            autoPlay
            loop={false}
            style={{ width: 200, height: 200 }}
          />
          <Text style={styles.errorTitle}>Study Kit Not Ready</Text>
          <Text style={styles.errorText}>
            {error || "The study materials for this lesson haven't been generated yet."}
          </Text>
        </View>
      );
    }

    return (
      <StudyKitTabs
        data={kitData}
        lessonTitle={lessonTitle}
        lessonId={lessonId}
        pathId={pathId}
        subjectId={subjectId}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <FontAwesome5 name="times" size={22} color="white" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{lessonTitle || 'Study Kit'}</Text>
          <Text style={styles.headerSubtitle}>Powered by EduAI</Text>
        </View>
        <View style={{ width: 50 }} />
      </View>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  headerIcon: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    color: '#a7adb8ff',
    fontSize: 16,
  },
  errorTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  errorText: {
    color: '#a7adb8ff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },
});