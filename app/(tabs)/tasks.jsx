// app/(tabs)/tasks.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';

import { db } from '../../firebase';
import { useAppState } from '../../context/AppStateContext';
import { useFab } from '../../context/FabContext';
import { API_CONFIG } from '../../config/appConfig';

import TasksHeader from '../../components/TasksHeader';
import TaskItem from '../../components/TaskItem';
import EmptyTasksComponent from '../../components/EmptyTasksComponent';
import AddTaskBottomSheet from '../../components/AddTaskBottomSheet';

export default function TasksScreen() {
  const { user } = useAppState();
  const router = useRouter();
  const { setFabActions } = useFab();
  const bottomSheetRef = useRef(null);

  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // ✨ 1. جلب وتحديث المهام في الوقت الفعلي من Firestore
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    const userProgressRef = doc(db, 'userProgress', user.uid);
    const unsubscribe = onSnapshot(userProgressRef, (snapshot) => {
      const fetchedTasks = snapshot.data()?.dailyTasks?.tasks || [];
      // فرز المهام: المثبتة أولاً، ثم المكتملة في النهاية
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
  
  // ✨ 2. دالة مركزية لتحديث المهام في Firestore
  const updateTasksInFirestore = useCallback(async (newTasks) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'userProgress', user.uid), { 'dailyTasks.tasks': newTasks });
    } catch (error) {
      console.error("Failed to update tasks:", error);
      Alert.alert("Error", "Could not sync your changes.");
    }
  }, [user?.uid]);

  // ✨ 3. التعامل مع إضافة وتعديل المهام من الـ BottomSheet
  const handleTaskUpdate = (title, taskToEdit) => {
    let newTasks;
    if (taskToEdit) { // تعديل مهمة
      newTasks = tasks.map(t => t.id === taskToEdit.id ? { ...t, title } : t);
    } else { // إضافة مهمة جديدة
      const newTask = {
        id: `user_${Date.now()}`,
        title,
        type: 'study',
        status: 'pending',
        isPinned: false,
        source: 'user',
      };
      newTasks = [newTask, ...tasks];
    }
    updateTasksInFirestore(newTasks);
    setEditingTask(null);
  };

  // ✨ 4. التعامل مع حذف، إكمال، وتثبيت المهام
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newTasks = tasks.map(t => t.id === task.id ? { ...t, isPinned: !t.isPinned } : t);
    updateTasksInFirestore(newTasks);
  };

  // ✨ 5. فتح ورقة الإضافة/التعديل
  const openAddTaskSheet = (task = null) => {
    setEditingTask(task);
    bottomSheetRef.current?.snapToIndex(0);
  };

  // ✨ 6. إنشاء خطة ذكية من الذكاء الاصطناعي
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
      if (!response.ok) throw new Error('Failed to generate tasks from server.');
    } catch (error) {
      console.error("Error generating plan:", error);
      Alert.alert("Error", "Couldn't generate a new plan right now.");
    } finally {
      setIsGenerating(false);
    }
  }, [user]);

  // ✨ 7. تحديد إجراءات الزر العائم (FAB) لهذه الشاشة تحديداً
  useFocusEffect(
    useCallback(() => {
      const actions = [
        { icon: 'plus', label: 'New Task', onPress: () => openAddTaskSheet() },
        { icon: 'magic', label: 'Generate Smart Plan', onPress: handleGeneratePlan },
        { icon: 'robot', label: 'Ask EduAI', onPress: () => router.push('/(modal)/ai-chatbot') },
      ];
      setFabActions(actions);

      // عند مغادرة الشاشة، قم بإزالة الأزرار لتجنب ظهورها في شاشات أخرى
      return () => setFabActions(null);
    }, [handleGeneratePlan, router, setFabActions])
  );

  // ✨ 8. حساب التقدم لعرضه في الهيدر باستخدام useMemo للأداء الأفضل
  const progress = useMemo(() => {
    const total = tasks.length;
    if (total === 0) return { completed: 0, total: 0, percent: 0 };
    const completed = tasks.filter(t => t.status === 'completed').length;
    return { completed, total, percent: completed / total };
  }, [tasks]);

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
            from={{ opacity: 0, scale: 0.9, translateY: 10 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
          >
            <TaskItem
              task={item}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              onLongPress={() => openAddTaskSheet(item)} // الضغط المطول يفتح وضع التعديل
              onNavigate={() => { /* يمكنك هنا الانتقال للدرس المرتبط */ }}
            />
          </MotiView>
        )}
        ListEmptyComponent={
          !isLoading && <EmptyTasksComponent isGenerating={isGenerating} onGenerate={handleGeneratePlan} />
        }
        contentContainerStyle={{ paddingBottom: 200 }} // مساحة إضافية في الأسفل
      />
      
      {/* الزر العائم أصبح الآن في ملف (tabs)/_layout.jsx، لذلك نزيله من هنا */}
      
      <AddTaskBottomSheet
        ref={bottomSheetRef}
        editingTask={editingTask}
        onTaskUpdate={handleTaskUpdate}
        onVisibilityChange={() => {}} // يمكنك استخدام هذا لاحقاً
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
});