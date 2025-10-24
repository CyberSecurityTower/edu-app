import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { v4 as uuidv4 } from 'uuid'; // سيعمل الآن بشكل صحيح بعد تثبيت المكتبة الإضافية

import { useAppState } from '../../context/AppStateContext';
import { useFab } from '../../context/FabContext';
import { useEditMode } from '../../context/EditModeContext';

import TasksHeader from '../../components/TasksHeader';
import TaskItem from '../../components/TaskItem';
import EmptyTasksComponent from '../../components/EmptyTasksComponent';
import AddTaskBottomSheet from '../../components/AddTaskBottomSheet';
import RenameTaskModal from '../../components/RenameTaskModal';
import ExpandableFAB from '../../components/ExpandableFAB';

export default function TasksScreen() {
  const { user } = useAppState();
  const router = useRouter();
  const { setFabConfig, setIsSheetVisible } = useFab();
  const { isEditMode, setIsEditMode, selectedTasks, setSelectedTasks, setActions } = useEditMode();

  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskToRename, setTaskToRename] = useState(null);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);

  const bottomSheetRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) { setIsLoading(false); return; }
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

  const updateTasksInFirestore = useCallback(async (updatedTasks) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, `userProgress/${user.uid}`), { 'dailyTasks.tasks': updatedTasks });
    } catch (error) {
      console.error("Firestore update failed:", error);
      Alert.alert("Error", "Could not sync changes.");
    }
  }, [user?.uid]);

  const handlePinSelectedTasks = useCallback(() => {
    const updatedTasks = tasks.map(task => 
      selectedTasks.has(task.id) ? { ...task, isPinned: !task.isPinned } : task
    );
    updateTasksInFirestore(updatedTasks);
    setSelectedTasks(new Set());
    setIsEditMode(false);
  }, [tasks, selectedTasks, updateTasksInFirestore, setSelectedTasks, setIsEditMode]);

  const handleDeleteSelectedTasks = useCallback(() => {
    Alert.alert(
      "Delete Tasks",
      `Are you sure you want to delete ${selectedTasks.size} selected tasks?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedTasks = tasks.filter(task => !selectedTasks.has(task.id));
            updateTasksInFirestore(updatedTasks);
            setSelectedTasks(new Set());
            setIsEditMode(false);
          }
        }
      ]
    );
  }, [tasks, selectedTasks, updateTasksInFirestore, setSelectedTasks, setIsEditMode]);

  // ✨ --- دالة جديدة لفتح نافذة إعادة التسمية --- ✨
  const handleRenameSelectedTask = useCallback(() => {
    if (selectedTasks.size !== 1) return;
    const taskIdToRename = selectedTasks.values().next().value;
    const taskObject = tasks.find(t => t.id === taskIdToRename);
    if (taskObject) {
      setTaskToRename(taskObject);
      setIsRenameModalVisible(true);
    }
  }, [selectedTasks, tasks]);

  useEffect(() => {
    setActions({
      onPin: handlePinSelectedTasks,
      onDelete: handleDeleteSelectedTasks,
      onRename: handleRenameSelectedTask, // ✨ --- إضافة دالة إعادة التسمية للسياق
    });
    return () => setActions({ onPin: () => {}, onDelete: () => {}, onRename: () => {} });
  }, [setActions, handlePinSelectedTasks, handleDeleteSelectedTasks, handleRenameSelectedTask]);

  useFocusEffect(
    useCallback(() => {
      // ✨ --- هذا الجزء هو المسؤول عن إعداد الـ FAB وإلغاء وضع التعديل --- ✨
      const fabConfig = {
        component: ExpandableFAB,
        props: {
          actions: [
            { icon: 'robot', label: 'Ask EduAI', onPress: () => router.push('/(modal)/ai-chatbot') },
            { icon: 'plus', label: 'Add Task', onPress: () => bottomSheetRef.current?.expand() },
            { icon: 'edit', label: 'Edit Tasks', onPress: () => setIsEditMode(true) },
          ],
        },
      };

      if (!isEditMode) {
        setFabConfig(fabConfig);
      } else {
        setFabConfig(null);
      }

      // دالة التنظيف التي تعمل عند مغادرة الشاشة
      return () => {
        if (isEditMode) {
          setIsEditMode(false);
          setSelectedTasks(new Set());
        }
        setFabConfig(null);
      };
    }, [isEditMode, setFabConfig, setIsEditMode, setSelectedTasks, router])
  );

  const handleToggleTaskStatus = (taskId, newStatus) => {
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    updateTasksInFirestore(updatedTasks);
  };

  const handleDeleteTask = (taskId) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    updateTasksInFirestore(updatedTasks);
  };

  const handleLongPressTask = (task) => {
    setTaskToRename(task);
    setIsRenameModalVisible(true);
  };

  const handleRenameTask = (newTitle) => {
    const taskId = taskToRename.id;
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, title: newTitle } : t);
    updateTasksInFirestore(updatedTasks);
    
    // تنظيف بعد إعادة التسمية
    setIsRenameModalVisible(false);
    setTaskToRename(null);
    if (isEditMode) {
      setSelectedTasks(new Set());
      setIsEditMode(false);
    }
  };

  const handleTaskUpdate = (taskData) => {
    const newTask = { 
        id: uuidv4(), 
        title: taskData.title, 
        status: 'pending', 
        type: 'default', 
        isPinned: false, 
        createdAt: new Date().toISOString(),
        relatedSubjectId: taskData.relatedSubjectId || null,
        relatedLessonId: taskData.relatedLessonId || null,
    };
    const updatedTasks = [newTask, ...tasks];
    updateTasksInFirestore(updatedTasks);
  };

  const handleGenerateTasks = async () => { /* ... */ };
  const handleNavigateToTask = (task) => { /* ... */ };

  const progressData = useMemo(() => {
    const totalCount = tasks.length;
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const progress = totalCount > 0 ? completedCount / totalCount : 0;
    return { progress, completedCount, totalCount };
  }, [tasks]);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TasksHeader {...progressData} />

      {tasks.length === 0 && !isGenerating ? (
        <EmptyTasksComponent isGenerating={isGenerating} onGenerate={handleGenerateTasks} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onToggleStatus={handleToggleTaskStatus}
              onDelete={handleDeleteTask}
              onNavigate={handleNavigateToTask}
              onLongPress={handleLongPressTask}
              isEditMode={isEditMode}
              isSelected={selectedTasks.has(item.id)}
              onSelect={(taskId) => {
                const newSet = new Set(selectedTasks);
                newSet.has(taskId) ? newSet.delete(taskId) : newSet.add(taskId);
                setSelectedTasks(newSet);
              }}
            />
          )}
        />
      )}

      <AddTaskBottomSheet ref={bottomSheetRef} onTaskUpdate={handleTaskUpdate} onVisibilityChange={setIsSheetVisible} />
      <RenameTaskModal isVisible={isRenameModalVisible} onClose={() => setIsRenameModalVisible(false)} onRename={handleRenameTask} task={taskToRename} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  listContent: { paddingBottom: 180 },
});