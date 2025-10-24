// app/(tabs)/tasks.jsx
import React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { FontAwesome5 } from '@expo/vector-icons';

import { db } from '../../firebase';
import { useAppState } from '../../context/AppStateContext';
import { useFab } from '../../context/FabContext';
import { useEditMode } from '../../context/EditModeContext';
import { API_CONFIG } from '../../config/appConfig';

import TasksHeader from '../../components/TasksHeader';
import TaskItem from '../../components/TaskItem';
import EmptyTasksComponent from '../../components/EmptyTasksComponent';
import AddTaskBottomSheet from '../../components/AddTaskBottomSheet';

export default function TasksScreen() {
  const { user } = useAppState();
  const router = useRouter();
  const bottomSheetRef = useRef(null);
  
  // السياقات
  const { setFabActions } = useFab();
  const { isEditMode, setIsEditMode, selectedTasks, setSelectedTasks, setActions } = useEditMode();

  // الحالة المحلية
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // جلب وتحديث المهام من Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const userProgressRef = doc(db, 'userProgress', user.uid);
    const unsubscribe = onSnapshot(userProgressRef, (snapshot) => {
      const fetchedTasks = snapshot.data()?.dailyTasks?.tasks || [];
      fetchedTasks.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        if (a.status !== b.status) return a.status === 'completed' ? 1 : -1;
        return 0; // يمكنك إضافة فرز ثانوي هنا إذا أردت
      });
      setTasks(fetchedTasks);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // دالة لتحديث المهام في Firestore
  const updateTasksInFirestore = useCallback(async (newTasks) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'userProgress', user.uid), { 'dailyTasks.tasks': newTasks });
    } catch (error) {
      console.error("Failed to update tasks:", error);
      Alert.alert("Error", "Could not sync your changes.");
    }
  }, [user?.uid]);

  // دوال التعامل مع المهام
  const handleTaskUpdate = (title, taskToEdit) => {
    let newTasks;
    if (taskToEdit) {
      newTasks = tasks.map(t => t.id === taskToEdit.id ? { ...t, title } : t);
    } else {
      const newTask = { id: `user_${Date.now()}`, title, type: 'study', status: 'pending', isPinned: false, source: 'user' };
      newTasks = [newTask, ...tasks];
    }
    updateTasksInFirestore(newTasks);
    setEditingTask(null);
  };

  const handleDelete = (taskId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newTasks = tasks.filter(t => t.id !== taskId);
    updateTasksInFirestore(newTasks);
  };

  const handleToggleStatus = (taskId, newStatus) => {
    const newTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    updateTasksInFirestore(newTasks);
  };

  const handlePinToggle = (task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const newTasks = tasks.map(t => t.id === task.id ? { ...t, isPinned: !t.isPinned } : t);
    updateTasksInFirestore(newTasks);
  };

  const openAddTaskSheet = (task = null) => {
    setEditingTask(task);
    bottomSheetRef.current?.snapToIndex(0);
  };

  const handleGeneratePlan = useCallback(async () => {
    if (!user?.uid) return;
    setIsGenerating(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await fetch(`${API_CONFIG.BASE_URL}/generate-daily-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, pathId: user.selectedPathId }),
      });
    } catch (error) {
      console.error("Error generating plan:", error);
      Alert.alert("Error", "Couldn't generate a new plan right now.");
    } finally {
      setIsGenerating(false);
    }
  }, [user]);

  // التعامل مع وضع التعديل
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setSelectedTasks(new Set()); // مسح التحديد عند الخروج من وضع التعديل
  };

  const handleSelectTask = (taskId) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  };

  const handleBulkDelete = () => {
    const newTasks = tasks.filter(t => !selectedTasks.has(t.id));
    updateTasksInFirestore(newTasks);
    toggleEditMode();
  };

  const handleBulkPin = () => {
    // هذا المنطق يثبت كل المهام المحددة. يمكنك تغييره ليكون تبديليًا.
    const newTasks = tasks.map(t => selectedTasks.has(t.id) ? { ...t, isPinned: true } : t);
    updateTasksInFirestore(newTasks);
    toggleEditMode();
  };

  // ربط إجراءات وضع التعديل بالسياق
  useEffect(() => {
    setActions({
      onDelete: handleBulkDelete,
      onPin: handleBulkPin,
    });
  }, [selectedTasks, tasks]); // تحديث الإجراءات عند تغير التحديد أو المهام

  // تحديد إجراءات الزر العائم لهذه الشاشة
  useFocusEffect(
    useCallback(() => {
      const actions = [
        { icon: 'plus', label: 'New Task', onPress: () => openAddTaskSheet() },
        { icon: 'magic', label: 'Generate Smart Plan', onPress: handleGeneratePlan },
        { icon: 'robot', label: 'Ask EduAI', onPress: () => router.push('/(modal)/ai-chatbot') },
      ];
      setFabActions(actions);
      return () => setFabActions(null);
    }, [handleGeneratePlan, router, setFabActions])
  );

  const progress = useMemo(() => {
    const total = tasks.length;
    if (total === 0) return { completed: 0, total: 0, percent: 0 };
    const completed = tasks.filter(t => t.status === 'completed').length;
    return { completed, total, percent: total > 0 ? completed / total : 0 };
  }, [tasks]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TasksHeader
          progress={progress.percent}
          completedCount={progress.completed}
          totalCount={progress.total}
        />
        {tasks.length > 0 && (
          <Pressable onPress={toggleEditMode} style={styles.editButton}>
            <FontAwesome5 name={isEditMode ? "times" : "pen"} size={18} color={isEditMode ? "#F87171" : "#a7adb8ff"} />
          </Pressable>
        )}
      </View>
      
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MotiView
            from={{ opacity: 0, scale: 0.9, translateY: 10 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
          >
            <TaskItem
              task={item}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              onLongPress={() => !isEditMode && handlePinToggle(item)}
              onNavigate={() => {}}
              isEditMode={isEditMode}
              isSelected={selectedTasks.has(item.id)}
              onSelect={handleSelectTask}
            />
          </MotiView>
        )}
        ListEmptyComponent={!isLoading && <EmptyTasksComponent isGenerating={isGenerating} onGenerate={handleGeneratePlan} />}
        contentContainerStyle={{ paddingBottom: 180, paddingTop: 10 }}
      />
      
      <AddTaskBottomSheet
        ref={bottomSheetRef}
        editingTask={editingTask}
        onTaskUpdate={handleTaskUpdate}
        onVisibilityChange={(isVisible) => {
            // يمكنك استخدام هذا لتتبع رؤية النافذة السفلية إذا احتجت
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  editButton: {
    padding: 20,
    paddingTop: 75,
  },
});