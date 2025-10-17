import React, { useState, useEffect, memo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// --- THE FIX IS HERE: Corrected the typo in the function name ---
// The path '../' is correct because we go up from 'app' to the root directory.
import { getSubjectDetails, getUserProgressDocument, updateUserFavoriteSubject } from '../services/firestoreService';

// The path './' is correct because _layout.jsx is in the same 'app' directory.
import { useAppState } from '../context/AppStateContext';

const LessonItem = memo(({ item, subjectId, pathId, totalLessons }) => {
  const router = useRouter();

  const getIcon = () => {
    switch (item.status) {
      case 'completed': return { name: 'check-circle', color: '#10B981', solid: true };
      case 'current': return { name: 'play-circle', color: '#3B82F6', solid: true };
      // Using 'lock' icon for locked lessons is more intuitive
      default: return { name: 'lock', color: '#9CA3AF', solid: true };
    }
  };
  const icon = getIcon();

  const handlePress = () => {
    if (item.status === 'locked') return; // Prevent navigation for locked lessons

    router.push({
      pathname: '/lesson-view',
      params: { 
        lessonId: item.id, 
        lessonTitle: item.title,
        subjectId: subjectId, 
        pathId: pathId,
        totalLessons: totalLessons
      },
    });
  };

  return (
    <Pressable onPress={handlePress} style={[styles.lessonItem, item.status === 'locked' && styles.lockedLesson]}>
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={styles.lessonTitle}>{item.title}</Text>
        <Text style={styles.lessonSubtitle}>{item.duration || '15 min'}</Text>
      </View>
      <FontAwesome5 name={icon.name} size={24} color={icon.color} solid={icon.solid} />
    </Pressable>
  );
});

export default function SubjectDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAppState();

  const [subjectData, setSubjectData] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      if (!user || !params.id) {
        setIsLoading(false);
        return;
      }
      
      const [subjectDetails, progressDoc] = await Promise.all([
        getSubjectDetails(user.selectedPathId, params.id),
        getUserProgressDocument(user.uid),
      ]);
      
      if (subjectDetails) {
        setSubjectData(subjectDetails);
        setUserProgress(progressDoc || {});
        setIsFavorite(progressDoc?.favorites?.subjects?.includes(params.id) || false);
      }
      setIsLoading(false);
    };
    
    fetchData();
  }, [user, params.id]);

  const handleFavoritePress = async () => {
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    await updateUserFavoriteSubject(user.uid, params.id, newFavoriteState);
  };

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  if (!subjectData) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Could not load subject details.</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const subjectProgress = userProgress?.pathProgress?.[user.selectedPathId]?.subjects?.[params.id];
  
  const mergedLessons = Array.isArray(subjectData.lessons)
    ? subjectData.lessons.map(lesson => ({
        ...lesson,
        status: subjectProgress?.lessons?.[lesson.id] || 'locked',
      }))
    : [];

  const progress = subjectProgress?.progress || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}><FontAwesome5 name="arrow-left" size={22} color="white" /></Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{subjectData.name}</Text>
          <Text style={styles.headerSubtitle}>{progress}% Completed</Text>
        </View>
        <Pressable onPress={handleFavoritePress} style={styles.headerIcon}><FontAwesome5 name="star" size={22} color={isFavorite ? '#FFD700' : '#6B7280'} solid={isFavorite} /></Pressable>
      </View>
      <View style={styles.progressContainer}><LinearGradient colors={['#10B981', '#34D399']} style={[styles.progressBar, { width: `${progress}%` }]} /></View>
      <Text style={styles.sectionTitle}>Lessons</Text>
      <FlatList
        data={mergedLessons}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LessonItem item={item} subjectId={params.id} pathId={user.selectedPathId} totalLessons={subjectData.lessons.length} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  container: { flex: 1, backgroundColor: '#0C0F27' },
  errorText: { color: 'white', fontSize: 18, marginBottom: 20 },
  backButton: { backgroundColor: '#1E293B', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
  backButtonText: { color: '#10B981', fontSize: 16, fontWeight: 'bold' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10 },
  headerIcon: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 2 },
  progressContainer: { height: 8, backgroundColor: '#1E293B', borderRadius: 4, marginHorizontal: 20, marginTop: 15 },
  progressBar: { height: '100%', borderRadius: 4 },
  sectionTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginHorizontal: 20, marginTop: 30, marginBottom: 15 },
  lessonItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', padding: 20, borderRadius: 12, marginBottom: 10 },
  lockedLesson: { opacity: 0.6 },
  lessonTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
  lessonSubtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
});