// app/(tabs)/tasks.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Alert, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { v4 as uuidv4 } from 'uuid';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useAppState } from '../../context/AppStateContext';
import { useFab } from '../../context/FabContext';
import { useEditMode } from '../../context/EditModeContext';

import TasksHeader from '../../components/TasksHeader';
import TaskItem from '../../components/TaskItem';
import EmptyTasksComponent from '../../components/EmptyTasksComponent';
import AddTaskBottomSheet from '../../components/AddTaskBottomSheet';
import RenameTaskModal from '../../components/RenameTaskModal';
import ExpandableFAB from '../../components/ExpandableFAB';

const EditModeToolbar = ({ onPin, onDelete, onCancel, hasSelection }) => (
  <MotiView
    from={{ translateY: 100 }}
    animate={{ translateY: 0 }}
    exit={{ translateY: 100 }}
    transition={{ type: 'timing', duration: 300 }}
    style={styles.toolbarContainer}
  >
    <Pressable style={[styles.toolbarButton, !hasSelection && styles.disabledButton]} onPress={onPin} disabled={!hasSelection}>
      <FontAwesome5 name="thumbtack" size={20} color={hasSelection ? "#60A5FA" : "#4B5563"} />
      <Text style={[styles.toolbarButtonText, !hasSelection && styles.disabledText]}>Pin</Text>
    </Pressable>
    <Pressable style={[styles.toolbarButton, !hasSelection && styles.disabledButton]} onPress={onDelete} disabled={!hasSelection}>
      <FontAwesome5 name="trash" size={20} color={hasSelection ? "#EF4444" : "#4B5563"} />
      <Text style={[styles.toolbarButtonText, !hasSelection && styles.disabledText]}>Delete</Text>
    </Pressable>
    <Pressable style={styles.toolbarButton} onPress={onCancel}>
      <FontAwesome5 name="times" size={20} color="white" />
      <Text style={styles.toolbarButtonText}>Cancel</Text>
    </Pressable>
  </MotiView>
);

export default function TasksScreen() {
  const { user } = useAppState();
  const { setFabConfig, setIsSheetVisible } = useFab(); // ✨ --- الإصلاح هنا --- ✨
  const { isEditMode, setIsEditMode, selectedTasks, setSelectedTasks } = useEditMode();

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

  useFocusEffect(
    useCallback(() => {
      if (isEditMode) {
        setFabConfig(null);
        return;
      }
      
      // ✨ --- والإصلاح هنا أيضًا: استخدم setFabConfig مع كائن الإعدادات الكامل --- ✨
      setFabConfig({
        component: ExpandableFAB,
        props: {
          actions: [
            { icon: 'plus', label: 'Add Task', onPress: () => bottomSheetRef.current?.expand() },
            { icon: 'edit', label: 'Edit Tasks', onPress: () => setIsEditMode(true) },
          ],
        },
      });

      return () => {
        setFabConfig(null);
        setIsEditMode(false);
        setSelectedTasks(new Set());
      };
    }, [isEditMode, setFabConfig, setIsEditMode, setSelectedTasks])
  );

  const updateTasksInFirestore = async (updatedTasks) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, `userProgress/${user.uid}`), { 'dailyTasks.tasks': updatedTasks });
    } catch (error) {
      console.error("Firestore update failed:", error);
      Alert.alert("Error", "Could not sync changes.");
    }
  };

  const handlePinSelectedTasks = () => {
    const updatedTasks = tasks.map(task => 
      selectedTasks.has(task.id) ? { ...task, isPinned: !task.isPinned } : task
    );
    setTasks(updatedTasks);
    updateTasksInFirestore(updatedTasks);
    setSelectedTasks(new Set());
    setIsEditMode(false);
  };

  const handleDeleteSelectedTasks = () => {
    const updatedTasks = tasks.filter(task => !selectedTasks.has(task.id));
    setTasks(updatedTasks);
    updateTasksInFirestore(updatedTasks);
    setSelectedTasks(new Set());
    setIsEditMode(false);
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

  const handleLongPressTask = (task) => {
    setTaskToRename(task);
    setIsRenameModalVisible(true);
  };

  const handleRenameTask = (newTitle) => {
    if (!taskToRename) return;
    const updatedTasks = tasks.map(t => t.id === taskToRename.id ? { ...t, title: newTitle } : t);
    setTasks(updatedTasks);
    updateTasksInFirestore(updatedTasks);
    setIsRenameModalVisible(false);
    setTaskToRename(null);
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
    setTasks(updatedTasks);
    updateTasksInFirestore(updatedTasks);
  };

  const handleGenerateTasks = async () => { /* ... (implementation) ... */ };
  const handleNavigateToTask = (task) => { /* ... (implementation) ... */ };

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
      
      {isEditMode && (
        <EditModeToolbar
          onPin={handlePinSelectedTasks}
          onDelete={handleDeleteSelectedTasks}
          onCancel={() => {
            setIsEditMode(false);
            setSelectedTasks(new Set());
          }}
          hasSelection={selectedTasks.size > 0}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  listContent: { paddingBottom: 180 },
  toolbarContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, backgroundColor: '#1E293B', borderTopWidth: 1, borderTopColor: '#334155', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 20 },
  toolbarButton: { alignItems: 'center' },
  toolbarButtonText: { color: 'white', marginTop: 5, fontWeight: '600' },
  disabledButton: { opacity: 0.5 },
  disabledText: { color: '#4B5563' },
});