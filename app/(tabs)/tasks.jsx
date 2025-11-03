
// app/(tabs)/tasks.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { v4 as uuidv4 } from 'uuid';

import { useAppState } from '../../context/AppStateContext';
import { useFab } from '../../context/FabContext';
import { useEditMode } from '../../context/EditModeContext';

import TasksHeader from '../../components/TasksHeader';
import TaskItem from '../../components/TaskItem';
import EmptyTasksComponent from '../../components/EmptyTasksComponent';
import AddTaskBottomSheet from '../../components/AddTaskBottomSheet';
import RenameTaskModal from '../../components/RenameTaskModal';
import ExpandableFAB from '../../components/ExpandableFAB';
import CustomAlert from '../../components/CustomAlert'; // Import CustomAlert

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
  const [alertInfo, setAlertInfo] = useState({ isVisible: false }); // State for custom alert

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
      setAlertInfo({ isVisible: true, title: 'Error', message: 'Could not sync changes with the server.', buttons: [{ text: 'OK' }] });
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
    setAlertInfo({
      isVisible: true,
      title: 'Delete Tasks',
      message: `Are you sure you want to delete ${selectedTasks.size} selected tasks?`,
      buttons: [
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
    });
  }, [tasks, selectedTasks, updateTasksInFirestore, setSelectedTasks, setIsEditMode]);

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
      onRename: handleRenameSelectedTask,
    });
    return () => setActions({ onPin: () => {}, onDelete: () => {}, onRename: () => {} });
  }, [setActions, handlePinSelectedTasks, handleDeleteSelectedTasks, handleRenameSelectedTask]);

  useFocusEffect(
    useCallback(() => {
      const fabConfig = {
        component: ExpandableFAB,
        props: {
          actions: [
            { icon: 'robot', label: 'Ask EduAI', onPress: () => router.push('/ai-chatbot') },
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

  const handleNavigateToTask = (task) => {
    if (!user.selectedPathId) {
      setAlertInfo({ isVisible: true, title: 'No Path Selected', message: 'Please complete your profile setup to navigate to tasks.', buttons: [{ text: 'OK' }] });
      return;
    }

    if (task.relatedLessonId && task.relatedSubjectId) {
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
    } else if (task.relatedSubjectId) {
      router.push({
        pathname: '/subject-details',
        params: { id: task.relatedSubjectId },
      });
    }
  };

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
      <CustomAlert 
        isVisible={alertInfo.isVisible}
        onClose={() => setAlertInfo({ isVisible: false })}
        title={alertInfo.title}
        message={alertInfo.message}
        buttons={alertInfo.buttons}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  listContent: { paddingBottom: 180 },
});