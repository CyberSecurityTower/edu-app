// components/DailyTasks.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { db } from '../firebase'; 
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAppState } from '../context/AppStateContext';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { apiService } from '../config/api'; // Use apiService for consistency
// ✨ [ENHANCED] Using the shared empty component
import EmptyTasksComponent from './EmptyTasksComponent';

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
  const isPressable = !!task.relatedLessonId || !!task.relatedSubjectId;

  return (
    <Animated.View style={styles.taskCard} entering={FadeInUp.duration(500)} layout={Layout.springify()}>
      <Pressable style={styles.mainContent} onPress={() => onNavigate(task)} disabled={!isPressable}>
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

const DailyTasks = ({ isCompact = false }) => {
  const { user } = useAppState();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
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
      fetchedTasks.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        if (a.status !== b.status) return a.status === 'completed' ? 1 : -1;
        return 0;
      });
      setTasks(fetchedTasks);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const displayedTasks = useMemo(() => {
    if (!isCompact) return tasks;
    const pinned = tasks.filter(t => t.isPinned);
    const unpinned = tasks.filter(t => !t.isPinned && t.status !== 'completed');
    let tasksToShow = [...pinned];
    const remainingSlots = 3 - pinned.length;
    if (remainingSlots > 0) {
      tasksToShow.push(...unpinned.slice(0, remainingSlots));
    }
    return tasksToShow.slice(0, 8);
  }, [tasks, isCompact]);

  const handleGenerateTasks = useCallback(async () => {
    if (!user?.uid || !user.selectedPathId) return;
    setIsGenerating(true);
    try {
      // Use the centralized apiService
      await apiService.generateDailyTasks(user.uid, user.selectedPathId);
    } catch (error) {
      console.error("Error generating tasks:", error);
      Alert.alert("Error", "Couldn't generate new tasks at this time.");
    } finally {
      setIsGenerating(false);
    }
  }, [user]);

  const handleToggleTaskStatus = async (taskId, newStatus) => {
    if (!user?.uid) return;
    const originalTasks = tasks;
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks); // Optimistic update
    try {
      await updateDoc(doc(db, `userProgress/${user.uid}`), { 'dailyTasks.tasks': updatedTasks });
    } catch (error) {
      console.error("Failed to update task status, reverting:", error);
      setTasks(originalTasks); // Revert on failure
      Alert.alert("Error", "Could not sync your changes.");
    }
  };

  const handleNavigateToTask = (task) => {
    if (!user.selectedPathId) {
      Alert.alert("No Path Selected", "Please complete your profile setup to navigate to tasks.");
      return;
    }
    if (task.relatedLessonId && task.relatedSubjectId) {
      const pathname = task.type === 'quiz' ? '/study-kit' : '/lesson-view';
      router.push({ pathname, params: { lessonId: task.relatedLessonId, lessonTitle: task.title, pathId: user.selectedPathId, subjectId: task.relatedSubjectId }});
    } else if (task.relatedSubjectId) {
      router.push({ pathname: '/subject-details', params: { id: task.relatedSubjectId }});
    }
  };

  if (isLoading) {
    return <View style={styles.container}><ActivityIndicator color="#10B981" /></View>;
  }

  if (tasks.length === 0) {
    // ✨ [ENHANCED] Using the shared component for a consistent look
    return (
        <View style={[styles.container, { paddingVertical: 30 }]}>
            <EmptyTasksComponent isGenerating={isGenerating} onGenerate={handleGenerateTasks} />
        </View>
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
        data={displayedTasks}
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
      {isCompact && displayedTasks.length < tasks.length && (
        <Pressable style={styles.viewAllButton} onPress={() => router.push('/(tabs)/tasks')}>
          <Text style={styles.viewAllText}>View All Tasks</Text>
          <FontAwesome5 name="arrow-right" size={14} color="#34D399" />
        </Pressable>
      )}
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
  viewAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 15, marginTop: 5 },
  viewAllText: { color: '#34D399', fontSize: 16, fontWeight: 'bold', marginRight: 8 },
});

export default DailyTasks;