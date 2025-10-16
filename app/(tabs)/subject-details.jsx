import React, { useState, memo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getSubjectDetails } from '../../services/firestoreService';
import { useAppState } from '../_layout';

const LessonItem = memo(({ item, subjectId, pathId, totalLessons }) => {
  const router = useRouter();
  const getIcon = () => {
    switch (item.status) {
      case 'completed': return { name: 'check-circle', color: '#10B981', solid: true };
      case 'current': return { name: 'play-circle', color: '#3B82F6', solid: true };
      default: return { name: 'play', color: '#9CA3AF', solid: true };
    }
  };
  const icon = getIcon();
  const handlePress = () => {
    router.push({
      pathname: '/(tabs)/lesson-view',
      params: { lessonId: item.id, lessonTitle: item.title, subjectId, pathId, totalLessons },
    });
  };
  return (
    <Pressable onPress={handlePress} style={styles.lessonItem}>
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
  const { user, userProgress } = useAppState(); // --- ✨ الحصول على userProgress من السياق العام

  const [subjectTemplate, setSubjectTemplate] = useState(null); // حالة للقالب الثابت
  const [isLoading, setIsLoading] = useState(true);

  // التأثير الأول: جلب القالب الثابت للمادة مرة واحدة فقط
  useEffect(() => {
    const fetchSubjectTemplate = async () => {
      if (user && user.selectedPathId && params.id) {
        setIsLoading(true);
        const details = await getSubjectDetails(user.selectedPathId, params.id);
        setSubjectTemplate(details);
        setIsLoading(false);
      }
    };
    fetchSubjectTemplate();
  }, [user, params.id]);

  if (isLoading || !subjectTemplate) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  // --- ✨ منطق الدمج الآن بسيط ومباشر ومضمون ---
  const subjectProgressData = userProgress?.pathProgress?.[user.selectedPathId]?.subjects?.[params.id];
  
  const mergedLessons = (subjectTemplate.lessons || []).map(lesson => ({
    ...lesson,
    status: subjectProgressData?.lessons?.[lesson.id] || 'locked',
  }));

  const progress = subjectProgressData?.progress || 0;
  const totalLessons = (subjectTemplate.lessons || []).length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}><FontAwesome5 name="arrow-left" size={22} color="white" /></Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{subjectTemplate.name}</Text>
          <Text style={styles.headerSubtitle}>{progress}% Completed</Text>
        </View>
        <View style={styles.headerIcon} />
      </View>

      <View style={styles.progressContainer}>
        <LinearGradient colors={['#10B981', '#34D399']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      <Text style={styles.sectionTitle}>Lessons</Text>

      <FlatList
        data={mergedLessons}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LessonItem item={item} subjectId={params.id} pathId={user.selectedPathId} totalLessons={totalLessons} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        ListEmptyComponent={<View style={styles.emptyContainer}><FontAwesome5 name="book-dead" size={60} color="#4B5563" /><Text style={styles.emptyText}>No lessons have been added yet.</Text></View>}
      />
    </SafeAreaView>
  );
}

// الأنماط تبقى كما هي
const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27', padding: 20 },
  container: { flex: 1, backgroundColor: '#0C0F27' },
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
  lessonItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 12, marginBottom: 10 },
  lessonTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
  lessonSubtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
});