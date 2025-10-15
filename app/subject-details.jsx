
// In app/subject-details.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, FlatList, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { getSubjectDetails, getUserProgressForSubject } from '../services/firestoreService';
import { useAppState } from './_layout';
import { LinearGradient } from 'expo-linear-gradient';

// (LessonItem component remains the same as before)
const LessonItem = ({ item }) => {
    // ... same code as before
};

export default function SubjectDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAppState();

  const [subjectData, setSubjectData] = useState(null); // Static data (title, lessons array)
  const [progressData, setProgressData] = useState(null); // User-specific data
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !params.id) return;

      // Fetch static subject structure and user progress IN PARALLEL
      const [subjectDetails, userProgress] = await Promise.all([
        getSubjectDetails(user.selectedPathId, params.id),
        getUserProgressForSubject(user.uid, user.selectedPathId, params.id)
      ]);

      if (subjectDetails) {
        setSubjectData(subjectDetails);
        setProgressData(userProgress);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [user, params.id]);

  // --- UI LOGIC ---
  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  if (!subjectData) {
    // ... error handling UI remains the same
  }

  // MERGE the two data sources for rendering
  const mergedLessons = subjectData.lessons.map(lesson => ({
    ...lesson, // { id, title, duration } from educationalPaths
    status: progressData.lessons[lesson.id] || 'locked', // Get status from userProgress, default to 'locked'
  }));

  const progress = progressData.progress || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* ... header UI ... */}
        <Text style={styles.headerTitle}>{subjectData.name}</Text>
        <Text style={styles.headerSubtitle}>{progress}% Completed</Text>
        {/* ... */}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        {/* ... progress bar UI ... */}
      </View>

      <Text style={styles.sectionTitle}>Lessons</Text>

      {/* Lessons List now uses the MERGED data */}
      <FlatList
        data={mergedLessons}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LessonItem item={item} />}
        // ... ListEmptyComponent and other props
      />
    </SafeAreaView>
  );
}

// --- Professional Styles ---
const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27', padding: 20 },
  container: { flex: 1, backgroundColor: '#0C0F27' },
  errorText: { color: '#EF4444', fontSize: 20, textAlign: 'center', marginTop: 20, marginBottom: 30 },
  backButton: { backgroundColor: '#1E293B', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
  backButtonText: { color: '#10B981', fontSize: 16, fontWeight: 'bold' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  backIcon: { padding: 10 },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  headerSubtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 2 },
  logo: { width: 40, height: 40 },
  progressContainer: { height: 8, backgroundColor: '#1E293B', borderRadius: 4, marginHorizontal: 20, marginTop: 15 },
  progressBar: { height: '100%', borderRadius: 4 },
  sectionTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginHorizontal: 20, marginTop: 30, marginBottom: 15 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, opacity: 0.8 },
  emptyText: { color: '#D1D5DB', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
  emptySubtext: { color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 5 },
  lessonItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', padding: 20, borderRadius: 12, marginBottom: 10 },
  lessonItemLocked: { opacity: 0.6 },
  lessonTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
  lessonSubtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
});