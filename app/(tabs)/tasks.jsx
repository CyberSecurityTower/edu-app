// app/(tabs)/tasks.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Toast from 'react-native-toast-message';
import { v4 as uuidv4 } from 'uuid';

import { useAppState } from '../../context/AppStateContext';
import { useFab } from '../../context/FabContext';
import { useEditMode } from '../../context/EditModeContext';

import TasksHeader from '../../components/TasksHeader';
import TaskItem from '../../components/TaskItem';
import EmptyTasksComponent from '../../components/EmptyTasksComponent';
import AddTaskBottomSheet from '../../components/AddTaskBottomSheet';
import RenameTaskModal from '../../components/RenameTaskModal'; // ✨ NEW: Import the rename modal
import ExpandableFAB from '../../components/ExpandableFAB';
import { API_CONFIG } from '../../config/appConfig';

export default function TasksScreen() {
  const { user } = useAppState();
  const router = useRouter();
  const { setFabActions, setIsSheetVisible, isSheetVisible } = useFab();
  const { isEditMode, setIsEditMode, selectedTasks, setSelectedTasks, setActions } = useEditMode();

  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // ✨ NEW: State for the rename functionality
  const [taskToRename, setTaskToRename] = useState(null);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);

  const bottomSheetRef = useRef(null);

  // Real-time listener for tasks
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
    }, (error) => {
      console.error("Error fetching tasks:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // FAB setup on screen focus
  useFocusEffect(
    useCallback(() => {
      if (isSheetVisible) {
        setFabActions(null);
        return;
      }

      const fabConfig = {
        component: ExpandableFAB,
        props: {
          actions: [
            { icon: 'plus', label: 'Add Task', onPress: () => bottomSheetRef.current?.expand() },
            { icon: 'edit', label: isEditMode ? 'Done' : 'Edit Tasks', onPress: () => setIsEditMode(!isEditMode) },
          ],
        },
      };
      setFabActions(fabConfig);

      return () => setFabActions(null);
    }, [isEditMode, isSheetVisible, setFabActions, setIsEditMode])
  );

  // Handlers for task actions
  const updateTasksInFirestore = async (updatedTasks) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, `userProgress/${user.uid}`), { 'dailyTasks.tasks': updatedTasks });
    } catch (error) {
      console.error("Failed to update tasks in Firestore:", error);
      Alert.alert("Error", "Could not sync your changes.");
      setTasks(tasks); // Revert optimistic update on failure
    }
  };

  const handleToggleTaskStatus = (taskId, newStatus) => {
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);
    updateTasksInFirestore(updatedTasks);
  };

  const handleDeleteTask = (taskId) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTasks);
    updateTasksInFirestore(updatedTasks);
  };

  // ✨ NEW: Handler to open the rename modal
  const handleLongPressTask = (task) => {
    setTaskToRename(task);
    setIsRenameModalVisible(true);
  };

  // ✨ NEW: Handler to perform the rename action
  const handleRenameTask = (newTitle) => {
    if (!taskToRename) return;
    const updatedTasks = tasks.map(t => t.id === taskToRename.id ? { ...t, title: newTitle } : t);
    setTasks(updatedTasks);
    updateTasksInFirestore(updatedTasks);
    setIsRenameModalVisible(false);
    setTaskToRename(null);
    Toast.show({ type: 'success', text1: 'Task renamed!' });
  };

  // ✨ MODIFIED: This now handles the new task data object
  const handleTaskUpdate = (taskData, editingTask) => {
    // Currently only supports adding new tasks
    if (!editingTask) {
      const newTask = {
        id: uuidv4(),
        title: taskData.title,
        status: 'pending',
        type: 'default', // You can enhance this later
        isPinned: false,
        relatedSubjectId: taskData.relatedSubjectId || null,
        relatedLessonId: taskData.relatedLessonId || null,
        createdAt: new Date().toISOString(),
      };
      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks);
      updateTasksInFirestore(updatedTasks);
      Toast.show({ type: 'success', text1: 'Task added!' });
    }
  };

  const handleGenerateTasks = async () => {
    if (!user?.uid) return;
    setIsGenerating(true);
    try {
      await fetch(`${API_CONFIG.BASE_URL}/generate-daily-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, pathId: user.selectedPathId }),
      });
    } catch (error) {
      console.error("Error generating tasks:", error);
      Alert.alert("Error", "Couldn't generate new tasks.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNavigateToTask = (task) => {
    if (task.relatedLessonId && user.selectedPathId && task.relatedSubjectId) {
      router.push({
        pathname: '/lesson-view',
        params: { 
          lessonId: task.relatedLessonId, 
          lessonTitle: task.title,
          pathId: user.selectedPathId,
          subjectId: task.relatedSubjectId,
        },
      });
    } else {
      Alert.alert("Info", "This task is not linked to a specific lesson.");
    }
  };

  const progressData = useMemo(() => {
    const totalCount = tasks.length;
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const progress = totalCount > 0 ? completedCount / totalCount : 0;
    return { totalCount, completedCount, progress };
  }, [tasks]);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TasksHeader {...progressData} />

      {tasks.length === 0 ? (
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
              onLongPress={handleLongPressTask} // ✨ Pass the long press handler
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

      <AddTaskBottomSheet
        ref={bottomSheetRef}
        onTaskUpdate={handleTaskUpdate}
        onVisibilityChange={setIsSheetVisible}
      />

      {/* ✨ NEW: Render the rename modal */}
      <RenameTaskModal
        isVisible={isRenameModalVisible}
        onClose={() => setIsRenameModalVisible(false)}
        onRename={handleRenameTask}
        task={taskToRename}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  listContent: { paddingBottom: 180 }, // Ensure space for FAB
});