import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../_layout';
import { getEducationalPathById, listenToUserProgress } from '../../services/firestoreService'; // استيراد الدالة الجديدة
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';

const SubjectCard = ({ item }) => {
  const router = useRouter();
  const total = item.totalLessons || 0;
  const completed = item.completedLessons || 0;
  const progress = item.progress || 0;

  const handlePress = () => {
    router.push({ pathname: '/subject-details', params: { id: item.id, name: item.name } });
  };

  return (
    <Pressable style={styles.cardContainer} onPress={handlePress}>
      <LinearGradient colors={item.color || ['#4c669f', '#192f6a']} style={styles.card}>
        <View style={styles.iconContainer}><FontAwesome5 name={item.icon || 'book'} size={32} color="white" /></View>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={styles.progressContainer}><View style={[styles.progressBar, { width: `${progress}%` }]} /></View>
        <Text style={styles.cardSubtitle}>{`${completed}/${total} Lessons`}</Text>
      </LinearGradient>
    </Pressable>
  );
};

const HomeScreen = () => {
  const { user } = useAppState();
  const [mergedSubjects, setMergedSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // سنحتفظ ببيانات المسار الثابتة في حالة منفصلة
  const [pathDetails, setPathDetails] = useState(null);

  // الخطوة الأولى: جلب بيانات المسار الثابتة مرة واحدة
  useEffect(() => {
    const fetchPathData = async () => {
      if (user && user.selectedPathId) {
        const details = await getEducationalPathById(user.selectedPathId);
        setPathDetails(details);
      }
    };
    fetchPathData();
  }, [user]);

  // الخطوة الثانية: إعداد المستمع للبيانات الديناميكية (تقدم المستخدم)
  useFocusEffect(
    useCallback(() => {
      if (!user || !pathDetails) {
        setIsLoading(false);
        return;
      }

      // بدء الاستماع...
      const unsubscribe = listenToUserProgress(user.uid, (userProgress) => {
        // هذا الكود سيعمل فورًا، ثم مرة أخرى مع كل تحديث
        console.log("Home screen received progress update via listener.");
        
        const subjectsWithProgress = pathDetails.subjects.map(subject => {
          const progressData = userProgress?.pathProgress?.[user.selectedPathId]?.subjects?.[subject.id];
          const completedLessonsCount = progressData?.lessons 
            ? Object.values(progressData.lessons).filter(status => status === 'completed').length
            : 0;
          return {
            ...subject,
            progress: progressData?.progress || 0,
            completedLessons: completedLessonsCount,
            totalLessons: subject.lessons?.length || 0,
          };
        });
        
        setMergedSubjects(subjectsWithProgress);
        setIsLoading(false);
      });

      // الأهم: إيقاف الاستماع عند مغادرة الشاشة
      return () => {
        console.log("Unsubscribing from Home screen listener.");
        unsubscribe();
      };
    }, [user, pathDetails]) // إعادة تشغيل المستمع إذا تغير المستخدم أو المسار
  );

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={mergedSubjects}
        renderItem={({ item }) => <SubjectCard item={item} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={
          <>
            <Text style={styles.headerTitle}>Hello, {user?.firstName}!</Text>
            <View style={styles.searchContainer}>
              <FontAwesome5 name="search" size={18} color="#8A94A4" /><TextInput style={styles.searchInput} placeholder="Search for a subject or lesson..." placeholderTextColor="#8A94A4" />
            </View>
            <Text style={styles.sectionTitle}>My Subjects</Text>
          </>
        }
        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No subjects available for this path yet.</Text></View>}
      />
    </SafeAreaView>
  );
};

// الأنماط تبقى كما هي
const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  container: { flex: 1, backgroundColor: '#0C0F27' },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: 'white', marginHorizontal: 20, marginTop: 20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 15, marginHorizontal: 20, marginTop: 20 },
  searchInput: { flex: 1, color: 'white', fontSize: 16, paddingVertical: 14, marginLeft: 10 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', marginHorizontal: 20, marginTop: 30, marginBottom: 10 },
  cardContainer: { flex: 1, padding: 8 },
  card: { borderRadius: 16, padding: 20, minHeight: 180, justifyContent: 'space-between' },
  iconContainer: { alignSelf: 'flex-start', opacity: 0.8 },
  cardTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  progressContainer: { height: 4, backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 2, marginTop: 10 },
  progressBar: { height: '100%', backgroundColor: 'white', borderRadius: 2 },
  cardSubtitle: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, marginTop: 5 },
  emptyContainer: { marginTop: 50, alignItems: 'center' },
  emptyText: { color: '#a7adb8ff', fontSize: 16 },
});

export default HomeScreen;