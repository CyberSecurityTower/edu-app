import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { db } from '../firebase'; 
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAppState } from '../context/AppStateContext';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import AnimatedGradientButton from './AnimatedGradientButton';
import { API_CONFIG } from '../config/appConfig';
import LottieView from 'lottie-react-native';

const ICONS = {
  review: { name: 'book-reader', color: '#60A5FA' },
  quiz: { name: 'puzzle-piece', color: '#FBBF24' },
  new_lesson: { name: 'lightbulb', color: '#34D399' },
  practice: { name: 'pencil-ruler', color: '#F87171' },
  study: { name: 'brain', color: '#C084FC' },
  default: { name: 'clipboard-list', color: '#9CA3AF' },
};

const TaskItem = ({ task, onToggleStatus, onNavigate }) => {
  const isCompleted = task.status === 'completed';
  const iconInfo = ICONS[task.type] || ICONS.default;

  return (
    <Animated.View style={styles.taskCard} entering={FadeInUp.duration(500)} layout={Layout.springify()}>
      <Pressable style={styles.mainContent} onPress={() => onNavigate(task)} disabled={!task.relatedLessonId}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconInfo.color}20` }]}>
          <FontAwesome5 name={iconInfo.name} size={18} color={iconInfo.color} />
        </View>
        <Text style={[styles.taskText, isCompleted && styles.taskTextCompleted]}>{task.title}</Text>
      </Pressable>
      <Pressable style={styles.checkbox} onPress={() => onToggleStatus(task.id, isCompleted ? 'pending' : 'completed')}>
        <FontAwesome5 name={isCompleted ? 'check-circle' : 'circle'} size={24} color={isCompleted ? '#10B981' : '#4B5563'} solid={isCompleted} />
      </Pressable>
    </Animated.View>
  );
};

// --- 1. إنشاء مكون معزول ومُحسَّن للحالة الفارغة ---
const EmptyDailyTasks = React.memo(({ isGenerating, onGenerate }) => {
  return (
    <View style={[styles.container, styles.emptyContainer]}>
      <FontAwesome5 name="clipboard-list" size={32} color="#4B5563" style={{ marginBottom: 15 }}/>
      
      {isGenerating ? (
        <>
          {/* نصوص حالة التحميل */}
          <Text style={styles.emptyTitle}>جاري إنشاء خطتك...</Text>
          <Text style={styles.emptySubtitle}>يقوم EduAI بتخصيص مهامك الآن.</Text>
          <LottieView
            source={require('../assets/images/task_loading.json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
            renderMode="hardware"
          />
        </>
      ) : (
        <>
          {/* نصوص الحالة العادية */}
          <Text style={styles.emptyTitle}>Your daily plan is clear!</Text>
          <Text style={styles.emptySubtitle}>Let EduAI create a personalized study plan for you.</Text>
          <AnimatedGradientButton
            text="Generate My Plan"
            onPress={onGenerate}
            buttonWidth={220}
            buttonHeight={45}
          />
        </>
      )}
    </View>
  );
});


const DailyTasks = ({ tasksProp = [], pathId }) => {
  const { user } = useAppState();
  const router = useRouter();
  const [tasks, setTasks] = useState(tasksProp);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    const userProgressRef = doc(db, 'userProgress', user.uid);
    const unsubscribe = onSnapshot(userProgressRef, (snapshot) => {
      const fetchedTasks = snapshot.data()?.dailyTasks?.tasks || [];
      setTasks(fetchedTasks);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // --- 2. تغليف الدالة بـ useCallback لضمان استقرارها ---
  const handleGenerateTasks = useCallback(async () => {
    if (!user?.uid) return;
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/generate-daily-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, pathId: pathId }),
      });
      if (!response.ok) {
        throw new Error('Failed to generate tasks from server.');
      }
    } catch (error) {
      console.error("Error generating tasks:", error);
      Alert.alert("Error", "Couldn't generate new tasks at this time.");
    } finally {
      setIsGenerating(false);
    }
  }, [user, pathId]); // تعتمد على user و pathId

  const handleToggleTaskStatus = async (taskId, newStatus) => {
    if (!user?.uid) return;
    const originalTasks = tasks;
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);

    try {
      await updateDoc(doc(db, `userProgress/${user.uid}`), { 'dailyTasks.tasks': updatedTasks });
    } catch (error) {
      console.error("Failed to update task status, reverting:", error);
      setTasks(originalTasks);
      Alert.alert("Error", "Could not sync your changes.");
    }
  };

  const handleNavigateToTask = (task) => {
    if (task.relatedLessonId && user.selectedPathId && task.relatedSubjectId) {
      const pathname = task.type === 'quiz' ? '/study-kit' : '/lesson-view';
      router.push({
        pathname,
        params: { 
          lessonId: task.relatedLessonId, 
          lessonTitle: task.title,
          pathId: user.selectedPathId,
          subjectId: task.relatedSubjectId,
        },
      });
    } else {
      Alert.alert("معلومات غير كافية", "لا يمكن فتح هذه المهمة لأنها غير مرتبطة بدرس محدد.");
    }
  };

  if (isLoading) {
    return <View style={styles.container}><ActivityIndicator color="#10B981" /></View>;
  }

  // --- 3. استخدام المكون الجديد والمُحسَّن ---
  if (tasks.length === 0) {
    return (
      <EmptyDailyTasks 
        isGenerating={isGenerating} 
        onGenerate={handleGenerateTasks} 
      />
    );
  }
  
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Daily Plan</Text>
        <Text style={styles.progressText}>{completedCount}/{tasks.length} Done</Text>
      </View>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskItem 
            task={item} 
            onToggleStatus={handleToggleTaskStatus}
            onNavigate={handleNavigateToTask}
          />
        )}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, marginHorizontal: 12, marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  progressText: { color: '#a7adb8ff', fontSize: 14, fontWeight: '600' },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 15, padding: 10, marginBottom: 10 },
  mainContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  taskText: { color: 'white', fontSize: 16, flex: 1 },
  taskTextCompleted: { textDecorationLine: 'line-through', color: '#6B7280' },
  checkbox: { padding: 10 },
  emptyContainer: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  emptySubtitle: { color: '#a7adb8ff', fontSize: 15, textAlign: 'center', marginTop: 8, marginBottom: 20 },
  // --- 4. إضافة النمط للأنيميشن ---
  lottieAnimation: {
    width: 120,
    height: 120,
    marginTop: 10,
  },
});

export default DailyTasks;