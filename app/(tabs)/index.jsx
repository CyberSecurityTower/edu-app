// app/(tabs)/index.jsx (النسخة النهائية مع إصلاح عرض الدروس)
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAppState } from '../../context/AppStateContext';
import { useFab } from '../../context/FabContext';
import { getEducationalPathById, getUserProgressDocument } from '../../services/firestoreService';

import SubjectCard from '../../components/SubjectCard';
import MainHeader from '../../components/MainHeader';
import DailyTasks from '../../components/DailyTasks';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';

const HomeScreen = () => {
  const { user, points } = useAppState();
  const router = useRouter();
  const { setFabActions } = useFab();

  const [pathDetails, setPathDetails] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- إعداد إجراءات الزر السحري ---
  useFocusEffect(
    useCallback(() => {
      const actions = [
        { icon: 'tasks', label: 'Manage All Tasks', onPress: () => router.push('/tasks') },
        { icon: 'robot', label: 'Ask EduAI', onPress: () => router.push('/(modal)/ai-chatbot') },
      ];
      setFabActions(actions);
      return () => setFabActions(null);
    }, [router, setFabActions])
  );

  // --- جلب بيانات المسار والتقدم ---
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchAllData = async () => {
        setIsLoading(true);
        if (!user?.uid) {
          if (isMounted) setIsLoading(false);
          return;
        }
        
        try {
            const progressDoc = await getUserProgressDocument(user.uid);
            if (isMounted) setUserProgress(progressDoc);

            if (user.selectedPathId) {
                const details = await getEducationalPathById(user.selectedPathId);
                if (isMounted) setPathDetails(details);
            }
        } catch (error) {
            console.error("Error fetching home screen data:", error);
        } finally {
            if (isMounted) setIsLoading(false);
        }
      };
      
      fetchAllData();
      return () => { isMounted = false; };
    }, [user?.uid, user?.selectedPathId])
  );

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  // حالة عدم وجود مسار دراسي محدد
  if (!user?.selectedPathId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerPadding}>
           <MainHeader title={`Hi, ${user?.firstName || 'Student'}!`} points={points} />
        </View>
        <View style={styles.emptyPathContainer}>
          <Text style={styles.emptyPathTitle}>Choose Your Learning Path!</Text>
          <Text style={styles.emptyPathSubtitle}>To see your subjects and tasks, please complete your profile setup.</Text>
          <AnimatedGradientButton 
            text="Setup Profile" 
            onPress={() => router.replace('/(setup)/profile-setup')} 
            buttonWidth={220}
          />
        </View>
      </SafeAreaView>
    );
  }

  const dailyTasks = userProgress?.dailyTasks?.tasks || [];
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
              <MainHeader title={`Hi, ${user?.firstName || 'Student'}!`} points={points} />
            </View>
            <DailyTasks 
              tasksProp={dailyTasks} 
              pathId={user.selectedPathId}
              isCompact={true}
            />
            {pathDetails?.subjects?.length > 0 && (
              <View style={styles.subjectsHeader}>
                <Text style={styles.sectionTitle}>Continue Learning</Text>
              </View>
            )}
          </>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  headerPadding: { paddingHorizontal: 20, marginBottom: 10 },
  listContent: { paddingHorizontal: 8, paddingBottom: 130 },
  subjectsHeader: { paddingHorizontal: 12, marginTop: 20 },
  sectionTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  emptyPathContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, marginHorizontal: 20 },
  emptyPathTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  emptyPathSubtitle: { color: '#8A94A4', fontSize: 16, textAlign: 'center', marginBottom: 25 },
});

export default HomeScreen;