// app/(tabs)/tasks.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAppState } from '../../context/AppStateContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';

import TasksHeader from '../../components/TasksHeader';
import TaskItem from '../../components/TaskItem';
import EmptyTasksComponent from '../../components/EmptyTasksComponent';
import ExpandableFAB from '../../components/ExpandableFAB';
import AddTaskBottomSheet from '../../components/AddTaskBottomSheet';
import { API_CONFIG } from '../../config/appConfig'; // تأكد من وجود هذا الملف

export default function TasksScreen() {
  const { user } = useAppState();
  const router = useRouter();
  const bottomSheetRef = useRef(null);

  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // 1. جلب المهام في الوقت الفعلي من Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const userProgressRef = doc(db, 'userProgress', user.uid);
    const unsubscribe = onSnapshot(userProgressRef, (snapshot) => {
      const fetchedTasks = snapshot.data()?.dailyTasks?.tasks || [];
      // فرز المهام: المثبتة أولاً، ثم المكتملة آخراً
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

  // 2. دالة لتحديث المهام في Firestore
  const updateTasksInFirestore = useCallback(async (newTasks) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'userProgress', user.uid), { 'dailyTasks.tasks': newTasks });
    } catch (error) {
      console.error("Failed to update tasks:", error);
      Alert.alert("Error", "Could not sync your changes.");
    }
  }, [user?.uid]);

  // 3. التعامل مع إضافة وتعديل المهام
  const handleTaskUpdate = (title, taskToEdit) => {
    let newTasks;
    if (taskToEdit) { // تعديل مهمة موجودة
      newTasks = tasks.map(t => t.id === taskToEdit.id ? { ...t, title } : t);
    } else { // إضافة مهمة جديدة
      const newTask = {
        id: `user_${Date.now()}`, // بادئة لتمييز مهام المستخدم
        title,
        type: 'study', // نوع افتراضي
        status: 'pending',
        isPinned: false,
        source: 'user', // مصدر المهمة
      };
      newTasks = [newTask, ...tasks];
    }
    updateTasksInFirestore(newTasks);
    setEditingTask(null);
  };

  // 4. التعامل مع حذف مهمة
  const handleDelete = (taskId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newTasks = tasks.filter(t => t.id !== taskId);
    updateTasksInFirestore(newTasks);
  };

  // 5. التعامل مع تغيير حالة المهمة (إكمالها)
  const handleToggleStatus = (taskId, newStatus) => {
    const newTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    updateTasksInFirestore(newTasks);
  };

  // 6. التعامل مع التثبيت
  const handlePinToggle = (task) => {
    const newTasks = tasks.map(t => t.id === task.id ? { ...t, isPinned: !t.isPinned } : t);
    updateTasksInFirestore(newTasks);
  };

  // 7. فتح ورقة التعديل/الإضافة
  const openAddTaskSheet = (task = null) => {
    setEditingTask(task);
    bottomSheetRef.current?.snapToIndex(0);
  };

  // 8. إنشاء خطة ذكية من الذكاء الاصطناعي
  const handleGeneratePlan = useCallback(async () => {
    if (!user?.uid) return;
    setIsGenerating(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/generate-daily-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, pathId: user.selectedPathId }),
      });
      if (!response.ok) throw new Error('Failed to generate tasks.');
      
      const result = await response.json();
      if (result.tasks && result.tasks.length > 0) {
        // دمج المهام الجديدة مع الحالية (مع تجنب التكرار)
        const existingIds = new Set(tasks.map(t => t.id));
        const newAiTasks = result.tasks.filter(t => !existingIds.has(t.id));
        updateTasksInFirestore([...tasks, ...newAiTasks]);
      }
    } catch (error) {
      console.error("Error generating plan:", error);
      Alert.alert("Error", "Couldn't generate a new plan right now.");
    } finally {
      setIsGenerating(false);
    }
  }, [user, tasks, updateTasksInFirestore]);

  // 9. حساب التقدم لعرضه في الهيدر
  const progress = useMemo(() => {
    const total = tasks.length;
    if (total === 0) return { completed: 0, total: 0, percent: 0 };
    const completed = tasks.filter(t => t.status === 'completed').length;
    return { completed, total, percent: total > 0 ? completed / total : 0 };
  }, [tasks]);

  // 10. تعريف إجراءات الزر العائم
  const fabActions = [
    { icon: 'plus', label: 'New Task', onPress: () => openAddTaskSheet() },
    { icon: 'magic', label: 'Generate Smart Plan', onPress: handleGeneratePlan },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <TasksHeader
        progress={progress.percent}
        completedCount={progress.completed}
        totalCount={progress.total}
      />
      
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing' }}
          >
            <TaskItem
              task={item}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              onLongPress={handlePinToggle} // أو أي إجراء آخر تريده
              onNavigate={() => { /* منطق الانتقال هنا */ }}
            />
          </MotiView>
        )}
        ListEmptyComponent={
          !isLoading && <EmptyTasksComponent isGenerating={isGenerating} onGenerate={handleGeneratePlan} />
        }
        contentContainerStyle={{ paddingBottom: 180 }}
      />
      
      <ExpandableFAB actions={fabActions} />
      
      <AddTaskBottomSheet
        ref={bottomSheetRef}
        editingTask={editingTask}
        onTaskUpdate={handleTaskUpdate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
});