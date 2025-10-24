// app/(tabs)/index.jsx
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { useFab } from '../../context/FabContext';
import { useAppState } from '../../context/AppStateContext';

import MainHeader from '../../components/MainHeader';
import DailyTasks from '../../components/DailyTasks';
import SubjectCard from '../../components/SubjectCard'; // مثال لمكون قد يكون لديك

export default function HomeScreen() {
  const { setFabActions } = useFab();
  const { user, points } = useAppState();
  const router = useRouter();

  // تحديد إجراءات الزر العائم لهذه الشاشة
  useFocusEffect(
    useCallback(() => {
      const actions = [
        { icon: 'tasks', label: 'Manage Tasks', onPress: () => router.push('/tasks') },
        { icon: 'robot', label: 'Ask EduAI', onPress: () => router.push('/(modal)/ai-chatbot') },
      ];
      setFabActions(actions);

      // عند مغادرة الشاشة، نزيل الإجراءات
      return () => setFabActions(null);
    }, [router, setFabActions])
  );

  // مثال على بيانات قد تعرضها
  const exampleSubjects = [
    { id: 'math101', name: 'Algebra Basics', icon: 'calculator', color: ['#4c669f', '#192f6a'] },
    { id: 'phy202', name: 'Newtonian Physics', icon: 'atom', color: ['#F97794', '#623AA2'] },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerPadding}>
          <MainHeader title={`Hi, ${user?.firstName || 'Student'}!`} points={points} />
        </View>

        {/* قسم المهام اليومية */}
        <DailyTasks pathId={user?.selectedPathId} />

        {/* يمكنك إضافة أقسام أخرى هنا */}
        {/* مثال: قسم المواد الدراسية */}
        {/* <View style={styles.subjectsContainer}>
          {exampleSubjects.map(subject => (
            <SubjectCard key={subject.id} item={subject} userProgress={{}} />
          ))}
        </View> */}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  scrollContent: {
    paddingBottom: 120, // مساحة كافية للزر العائم
  },
  headerPadding: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  subjectsContainer: {
    marginTop: 20,
    paddingHorizontal: 12,
    flexDirection: 'row',
  },
});