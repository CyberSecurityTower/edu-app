import React, { useState, useEffect, memo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { getSubjectDetails, getUserProgressForSubject } from '../../services/firestoreService';
import { useAppState } from '../_layout'; // <-- THE FIX IS HERE
import { LinearGradient } from 'expo-linear-gradient';

// --- LessonItem Component (Memoized for Performance) ---
const LessonItem = memo(({ item }) => {
  const router = useRouter();

  const getIcon = () => {
    switch (item.status) {
      case 'completed':
        return { name: 'check-circle', color: '#10B981', solid: true };
      case 'current':
        return { name: 'play-circle', color: '#3B82F6', solid: true };
      case 'locked':
      default:
        return { name: 'lock', color: '#6B7280', solid: false };
    }
  };
  const icon = getIcon();

  const handlePress = () => {
    if (item.status === 'locked') {
      console.log('This lesson is locked.');
      return;
    }
    
    console.log(`Navigating to lesson: ${item.title} with ID: ${item.id}`);
    router.push({
      pathname: '/(tabs)/lesson-view',
      params: { lessonId: item.id, lessonTitle: item.title },
    });
  };

  return (
    <Pressable onPress={handlePress} style={[styles.lessonItem, item.status === 'locked' && styles.lessonItemLocked]}>
       <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={styles.lessonTitle}>{item.title}</Text>
        <Text style={styles.lessonSubtitle}>{item.duration || '15 min'}</Text>
      </View>
      <FontAwesome5 name={icon.name} size={24} color={icon.color} solid={icon.solid} />
    </Pressable>
  );
});

// --- Main Screen Component ---
export default function SubjectDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAppState();

  const [subjectData, setSubjectData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !params.id) {
        setIsLoading(false);
        return;
      }
      const [subjectDetails, userProgress] = await Promise.all([
        getSubjectDetails(user.selectedPathId, params.id),
        getUserProgressForSubject(user.uid, user.selectedPathId, params.id),
      ]);
      if (subjectDetails) {
        setSubjectData(subjectDetails);
        setProgressData(userProgress);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [user, params.id]);

  const handleFavoritePress = () => {
    setIsFavorite(!isFavorite);
  };

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  if (!subjectData) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <FontAwesome5 name="exclamation-triangle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Could not load subject details.</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const mergedLessons = Array.isArray(subjectData.lessons)
    ? subjectData.lessons.map(lesson => ({
        ...lesson,
        status: progressData?.lessons?.[lesson.id] || 'locked',
      }))
    : [];

  const progress = progressData?.progress || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <FontAwesome5 name="arrow-left" size={22} color="white" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{subjectData.name}</Text>
          <Text style={styles.headerSubtitle}>{progress}% Completed</Text>
        </View>
        <Pressable onPress={handleFavoritePress} style={styles.headerIcon}>
          <FontAwesome5 
            name="star" 
            size={22} 
            color={isFavorite ? '#FFD700' : '#6B7280'}
            solid={isFavorite}
          />
        </Pressable>
      </View>

      <View style={styles.progressContainer}>
        <LinearGradient
          colors={['#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressBar, { width: `${progress}%` }]}
        />
      </View>

      <Text style={styles.sectionTitle}>Lessons</Text>

      <FlatList
        data={mergedLessons}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LessonItem item={item} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="book-dead" size={60} color="#4B5563" />
            <Text style={styles.emptyText}>No lessons have been added yet.</Text>
            <Text style={styles.emptySubtext}>Check back soon!</Text>
          </View>
        }
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, minHeight: 60, backgroundColor: '#0C0F27' },
  headerIcon: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  headerSubtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 2 },
  progressContainer: { height: 8, backgroundColor: '#1E293B', borderRadius: 4, marginHorizontal: 20, marginTop: 15 },
  progressBar: { height: '100%', borderRadius: 4 },
  sectionTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginHorizontal: 20, marginTop: 30, marginBottom: 15 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, opacity: 0.8 },
  emptyText: { color: '#D1D5DB', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
  emptySubtext: { color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 5 },
  lessonItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 12, marginBottom: 10 },
  lessonItemLocked: { opacity: 0.6 },
  lessonTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
  lessonSubtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
});