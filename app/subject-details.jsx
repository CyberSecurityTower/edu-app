// app/subject-details.jsx
import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  getSubjectDetails,
  getUserProgressDocument,
  updateUserFavoriteSubject,
} from '../services/firestoreService';
import { useAppState } from '../context/AppStateContext';

// LessonItem component (memoized)
const LessonItem = memo(({ item, subjectId, pathId, totalLessons }) => {
  const router = useRouter();

  const isCompleted = item.status === 'completed';
  const masteryScore = item.masteryScore;
  const suggestedReview = item.suggestedReview;

  const getIcon = () => {
    switch (item.status) {
      case 'completed':
        return { name: 'check-circle', color: '#10B981', solid: true };
      case 'current':
        return { name: 'play-circle', color: '#3B82F6', solid: true };
      case 'unlocked':
        return { name: 'lock-open', color: '#3B82F6', solid: true };
      default:
        return { name: 'lock', color: '#9CA3AF', solid: true };
    }
  };
  const icon = getIcon();

  // Determine Review Status (نعتبر أقل من 70% يحتاج مراجعة)
  const needsReview = isCompleted && typeof masteryScore === 'number' && masteryScore < 70;

  const handlePress = () => {
    if (item.status === 'locked') return;

    router.push({
      pathname: '/lesson-view',
      params: {
        lessonId: item.id,
        lessonTitle: item.title,
        subjectId,
        pathId,
        totalLessons,
      },
    });
  };

  const itemStyle = [
    styles.lessonItem,
    item.status === 'locked' && styles.lockedLesson,
    needsReview && styles.lessonNeedsReview,
  ];

  return (
    <Pressable onPress={handlePress} style={itemStyle}>
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={styles.lessonTitle}>{item.title}</Text>

        {/* Show mastery & suggestion when completed */}
        {isCompleted && (
          <View style={styles.progressDetail}>
            <Text style={[styles.masteryText, needsReview && styles.reviewNeededText]}>
              {needsReview ? 'مراجعة مطلوبة' : 'تم الإتقان'}{typeof masteryScore === 'number' ? ` (${masteryScore}%)` : ''}
            </Text>
            {needsReview && (
              <Text style={styles.reviewSuggestion} numberOfLines={1}>
                {suggestedReview || 'لا يوجد اقتراح محدد.'}
              </Text>
            )}
          </View>
        )}

        {!isCompleted && <Text style={styles.lessonSubtitle}>{item.duration || '15 min'}</Text>}
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
    let mounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      if (!user || !params?.id) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const [subjectDetails, progressDoc] = await Promise.all([
          getSubjectDetails(user.selectedPathId, params.id),
          getUserProgressDocument(user.uid),
        ]);

        if (!mounted) return;

        if (subjectDetails) {
          setSubjectData(subjectDetails);
          setUserProgress(progressDoc || {});
          setIsFavorite(!!(progressDoc?.favorites?.subjects?.includes(params.id)));
        }
      } catch (err) {
        console.error('Failed to load subject details:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, [user, params?.id]);

  const handleFavoritePress = async () => {
    if (!user || !params?.id) return;
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    try {
      await updateUserFavoriteSubject(user.uid, params.id, newFavoriteState);
    } catch (err) {
      console.error('Failed to update favorite subject:', err);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
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

  const subjectProgress = userProgress?.pathProgress?.[user?.selectedPathId]?.subjects?.[params.id];

  // Merge lesson details with progress data (status, masteryScore, suggestedReview)
  let lastLessonCompleted = true; // Start with the assumption that the "pre-requisite" for the first lesson is met

  const mergedLessons = Array.isArray(subjectData.lessons)
    ? subjectData.lessons.map((lesson, index) => {
        const lessonData = subjectProgress?.lessons?.[lesson.id] || {};

        // 1. Determine the status based on completion and sequence
        let status;
        if (lessonData.status) {
            // If status exists (current or completed), use it.
            status = lessonData.status;
        } else if (lastLessonCompleted) {
            // If the previous lesson (or this is the first one) was completed, unlock this one.
            status = 'unlocked'; // NEW status for "ready to start"
        } else {
            // Otherwise, it remains locked.
            status = 'locked';
        }

        // 2. Update the tracking variable for the next iteration
        // Note: The previous lesson is only completed if its status is 'completed' or 'mastered'
        lastLessonCompleted = (status === 'completed' || status === 'mastered');

        // 3. Return the merged lesson object
        return {
          ...lesson,
          status: status, // The new calculated status
          masteryScore: lessonData.masteryScore,
          suggestedReview: lessonData.suggestedReview,
        };
      })
    : [];

  const progress = subjectProgress?.progress || 0;
  const totalLessons = Array.isArray(subjectData.lessons) ? subjectData.lessons.length : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <FontAwesome5 name="arrow-left" size={22} color="white" />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {subjectData.name}
          </Text>
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
          style={[styles.progressBar, { width: `${Math.max(0, Math.min(progress, 100))}%` }]}
        />
      </View>

      <Text style={styles.sectionTitle}>Lessons</Text>

      <FlatList
        data={mergedLessons}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <LessonItem
            item={item}
            subjectId={params.id}
            pathId={user?.selectedPathId}
            totalLessons={totalLessons}
          />
        )}
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
  lessonNeedsReview: {
    backgroundColor: '#332938',
    borderColor: '#F59E0B',
    borderWidth: 1,
  },
  lockedLesson: { opacity: 0.6 },
  lessonTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
  lessonSubtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  progressDetail: { marginTop: 4 },
  masteryText: { color: '#10B981', fontSize: 14, fontWeight: 'bold' },
  reviewNeededText: { color: '#F59E0B' },
  reviewSuggestion: { color: '#A7ADB8', fontSize: 12, marginTop: 2 },
});
