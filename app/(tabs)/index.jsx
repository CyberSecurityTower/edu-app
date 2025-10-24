// app/(tabs)/index.jsx (النسخة النهائية مع الإصلاح)
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAppState } from '../../context/AppStateContext';
import { getEducationalPathById, getUserProgressDocument } from '../../services/firestoreService';
import SubjectCard from '../../components/SubjectCard';
import MainHeader from '../../components/MainHeader';
import DailyTasks from '../../components/DailyTasks';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';

const HomeScreen = () => {
  const { user } = useAppState();
  const router = useRouter();
  const [pathDetails, setPathDetails] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchAllData = async () => {
        if (user?.uid && user.selectedPathId) {
          try {
            const [details, progressDoc] = await Promise.all([
              getEducationalPathById(user.selectedPathId),
              getUserProgressDocument(user.uid)
            ]);
            if (isMounted) {
              setPathDetails(details);
              setUserProgress(progressDoc);
            }
          } catch (error) {
            console.error("Error fetching home screen data:", error);
          }
        }
        if (isMounted) setIsLoading(false);
      };
      
      fetchAllData();
      return () => { isMounted = false; };
    }, [user?.uid, user?.selectedPathId])
  );

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  if (!user?.selectedPathId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <MainHeader title={`Hello, ${user?.firstName}!`} points={userProgress?.stats?.points || 0} />
        <View style={styles.emptyPathContainer}>
          <Text style={styles.emptyPathTitle}>قم بتحديد مسارك الدراسي أولاً!</Text>
          <Text style={styles.emptyPathSubtitle}>لتتمكن من عرض المهام والمواد، يرجى إكمال إعداد ملفك الشخصي.</Text>
          <AnimatedGradientButton 
            text="إعداد الملف الشخصي" 
            onPress={() => router.push('/(setup)/edit-profile')} 
            buttonWidth={220}
          />
        </View>
      </SafeAreaView>
    );
  }

  const dailyTasks = userProgress?.dailyTasks?.tasks || [];
  const currentPoints = userProgress?.stats?.points || 0;
  const pathProgressForSubjects = userProgress?.pathProgress?.[user.selectedPathId] || {};

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={pathDetails?.subjects || []}
        renderItem={({ item }) => <SubjectCard item={item} userProgress={pathProgressForSubjects} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        // ✨ --- هذا هو الإصلاح الحاسم --- ✨
        // أضفنا مساحة سفلية كبيرة جدًا (130) لتجنب تداخل القائمة مع شريط التبويب والزر السحري
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <MainHeader title={`Hello, ${user?.firstName}!`} points={currentPoints} />
            <DailyTasks tasksProp={dailyTasks} pathId={user.selectedPathId} />
            <View style={styles.subjectsHeader}>
              <Text style={styles.sectionTitle}>Continue Learning</Text>
            </View>
          </>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  // ✨ --- وهذا هو النمط الذي يحتوي على الإصلاح --- ✨
  listContent: { 
    paddingHorizontal: 8, 
    paddingBottom: 130 // تمت زيادة المساحة لتجنب التداخل
  },
  subjectsHeader: { paddingHorizontal: 12, marginTop: 20 },
  sectionTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  emptyPathContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, margin: 20, backgroundColor: '#1E293B', borderRadius: 16 },
  emptyPathTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  emptyPathSubtitle: { color: '#8A94A4', fontSize: 16, textAlign: 'center', marginBottom: 25 },
});

export default HomeScreen;