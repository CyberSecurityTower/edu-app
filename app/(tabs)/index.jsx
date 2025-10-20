// app/(tabs)/index.jsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAppState } from '../../context/AppStateContext';
import { getEducationalPathById, getUserProgressDocument } from '../../services/firestoreService';
import SubjectCard from '../../components/SubjectCard';
import MainHeader from '../../components/MainHeader';
import DailyTasks from '../../components/DailyTasks';

const HomeScreen = () => {
  const { user } = useAppState();
  const [pathDetails, setPathDetails] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPoints, setCurrentPoints] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchPathData = async () => {
        // استخدم user.uid للتحقق من وجود المستخدم
        if (user?.uid && user.selectedPathId) {
          try {
            const [details, progressDoc] = await Promise.all([
              getEducationalPathById(user.selectedPathId),
              getUserProgressDocument(user.uid)
            ]);
            if (isMounted) {
              setPathDetails(details);
              setUserProgress(progressDoc?.pathProgress?.[user.selectedPathId] || {});
              setCurrentPoints(progressDoc?.stats?.points || 0);
            }
          } catch (error) {
            console.error("Error fetching home screen data:", error);
          }
        }
        if (isMounted) {
          setIsLoading(false);
        }
      };
      
      setIsLoading(true); // أظهر التحميل في كل مرة يتم فيها التركيز على الشاشة
      fetchPathData();

      return () => { isMounted = false; };
    }, [user?.uid, user?.selectedPathId]) // <--- الإصلاح الحاسم هنا
  );

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={pathDetails?.subjects || []}
        renderItem={({ item }) => <SubjectCard item={item} userProgress={userProgress} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 8 }}
        ListHeaderComponent={
          <>
            <MainHeader title={`Hello, ${user?.firstName}!`} points={currentPoints} />
            
            <DailyTasks />
            
            <View style={styles.subjectsHeader}>
              <Text style={styles.sectionTitle}>Continue Learning</Text>
            </View>
          </>
        }
        // إضافة مكون في حالة كانت قائمة المواد فارغة
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.emptySubjectsContainer}>
              <Text style={styles.emptySubjectsText}>No subjects found for your selected path.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  subjectsHeader: {
    paddingHorizontal: 12,
    marginTop: 10,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubjectsContainer: {
    marginTop: 50,
    alignItems: 'center',
  },
  emptySubjectsText: {
    color: '#a7adb8ff',
    fontSize: 16,
  },
});

export default HomeScreen;