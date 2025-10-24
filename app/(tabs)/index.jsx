// app/(tabs)/index.jsx (النسخة النهائية المدمجة والمحسّنة)
import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';

import { db } from '../../firebase';
import { useAppState } from '../../context/AppStateContext';
import { useFab } from '../../context/FabContext';
import { getEducationalPathById } from '../../services/firestoreService';
import { API_CONFIG } from '../../config/appConfig';

import SubjectCard from '../../components/SubjectCard';
import MainHeader from '../../components/MainHeader';
import DailyTasks from '../../components/DailyTasks';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';

const HomeScreen = () => {
  const { user } = useAppState();
  const router = useRouter();
  const { setFabActions } = useFab();

  const [pathDetails, setPathDetails] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. تحديد إجراءات الزر العائم لهذه الشاشة ---
  useFocusEffect(
    useCallback(() => {
      const actions = [
        { icon: 'tasks', label: 'Manage Tasks', onPress: () => router.push('/tasks') },
        { icon: 'robot', label: 'Ask EduAI', onPress: () => router.push('/(modal)/ai-chatbot') },
      ];
      setFabActions(actions);
      return () => setFabActions(null);
    }, [router, setFabActions])
  );

  // --- 2. جلب البيانات في الوقت الفعلي باستخدام onSnapshot ---
  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      const userProgressRef = doc(db, 'userProgress', user.uid);
      const unsubscribe = onSnapshot(userProgressRef, async (progressDoc) => {
        if (progressDoc.exists()) {
          const progressData = progressDoc.data();
          setUserProgress(progressData);

          if (progressData.selectedPathId && progressData.selectedPathId !== pathDetails?.id) {
            try {
              const details = await getEducationalPathById(progressData.selectedPathId);
              setPathDetails(details);
            } catch (error) {
              console.error("Error fetching path details:", error);
              setPathDetails(null);
            }
          } else if (!progressData.selectedPathId) {
            setPathDetails(null);
          }
        } else {
          setUserProgress(null);
          setPathDetails(null);
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
    }, [user?.uid])
  );
  
  // --- 3. دالة لتوليد مهام جديدة (سيتم تمريرها لـ DailyTasks) ---
  const handleGenerateTasks = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/generate-daily-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, pathId: user.selectedPathId }),
      });
      if (!response.ok) {
        throw new Error('Failed to generate tasks from server.');
      }
    } catch (error) {
      console.error("Error generating tasks:", error);
      Alert.alert("Error", "Couldn't generate new tasks at this time.");
    }
  }, [user]);


  // --- 4. حالات العرض المختلفة (تحميل، لا يوجد مسار، عرض البيانات) ---
  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  if (!user?.selectedPathId && !isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerPadding}>
          <MainHeader title={`Hi, ${user?.firstName || 'Student'}!`} points={userProgress?.stats?.points || 0} />
        </View>
        <View style={styles.emptyPathContainer}>
          <Text style={styles.emptyPathTitle}>قم بتحديد مسارك الدراسي أولاً!</Text>
          <Text style={styles.emptyPathSubtitle}>لتتمكن من عرض المهام والمواد، يرجى إكمال إعداد ملفك الشخصي.</Text>
          <AnimatedGradientButton 
            text="إعداد الملف الشخصي" 
            onPress={() => router.replace('/(setup)/profile-setup')} 
            buttonWidth={220}
          />
        </View>
      </SafeAreaView>
    );
  }

  const currentPoints = userProgress?.stats?.points || 0;
  const pathProgressForSubjects = userProgress?.pathProgress?.[user.selectedPathId] || {};

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={pathDetails?.subjects || []}
        renderItem={({ item }) => <SubjectCard item={item} userProgress={pathProgressForSubjects} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.headerPadding}>
              <MainHeader title={`Hi, ${user?.firstName || 'Student'}!`} points={currentPoints} />
            </View>
            <DailyTasks 
              pathId={user.selectedPathId}
              // ✨ تمرير الدالة الجديدة هنا
              onGenerateNewTasks={handleGenerateTasks}
            />
            <View style={styles.subjectsHeader}>
              <Text style={styles.sectionTitle}>Continue Learning</Text>
            </View>
          </>
        }
        // يمكنك إضافة مكون للحالة الفارغة إذا لم تكن هناك مواد دراسية
        ListEmptyComponent={
            <View style={styles.emptySubjectsContainer}>
                <Text style={styles.emptySubjectsText}>لا توجد مواد دراسية في هذا المسار بعد.</Text>
            </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  listContent: { 
    paddingHorizontal: 8, 
    paddingBottom: 130 // مساحة كافية للزر العائم وشريط التبويبات
  },
  headerPadding: {
    paddingHorizontal: 12, // توحيد المسافات
    marginBottom: 10,
  },
  subjectsHeader: { paddingHorizontal: 12, marginTop: 20 },
  sectionTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  emptyPathContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, margin: 20, backgroundColor: '#1E293B', borderRadius: 16 },
  emptyPathTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  emptyPathSubtitle: { color: '#8A94A4', fontSize: 16, textAlign: 'center', marginBottom: 25 },
  emptySubjectsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptySubjectsText: {
    color: '#8A94A4',
    fontSize: 16,
    textAlign: 'center',
  }
});

export default HomeScreen;