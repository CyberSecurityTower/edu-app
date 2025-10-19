import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';

import { db } from '../firebase';
import { useAppState } from '../context/AppStateContext';
import { getUserDailyTasks } from '../services/firestoreService';
import TaskItem from './TaskItem'
import AnimatedGradientButton from './AnimatedGradientButton';

const RENDER_PROXY_URL = 'https://eduserver-1.onrender.com'; // Your Render URL

const DailyTasks = () => {
  const { user } = useAppState();
  const [taskData, setTaskData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    const tasks = await getUserDailyTasks(user.uid);
    setTaskData(tasks);
    setIsLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchTasks();
    }, [fetchTasks])
  );

  const handleGenerateTasks = async () => {
    if (!user?.uid) return;
    setIsGenerating(true);
    try {
      const response = await fetch(`${RENDER_PROXY_URL}/generate-daily-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (!response.ok) throw new Error('Failed to generate tasks');
      await fetchTasks(); // Re-fetch to get the new tasks
    } catch (error) {
      console.error("Error generating tasks:", error);
      // You can show a toast or alert here
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleTaskStatus = async (taskId, newStatus) => {
    if (!user?.uid || !taskData?.tasks) return;
    
    const updatedTasks = taskData.tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    
    setTaskData(prev => ({ ...prev, tasks: updatedTasks }));

    const progressRef = doc(db, `userProgress/${user.uid}`);
    await updateDoc(progressRef, { 'dailyTasks.tasks': updatedTasks });
  };

  if (isLoading) {
    return <ActivityIndicator size="large" color="#10B981" style={styles.container} />;
  }

  if (!taskData || !taskData.tasks || taskData.tasks.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text style={styles.emptyTitle}>Ready to plan your day?</Text>
        <Text style={styles.emptySubtitle}>Let EduAI create a personalized study plan for you based on your progress.</Text>
        {isGenerating ? (
          <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 20 }}/>
        ) : (
          <AnimatedGradientButton
            text="Generate My Plan"
            onPress={handleGenerateTasks}
            buttonWidth={240}
          />
        )}
      </View>
    );
  }

  const completedCount = taskData.tasks.filter(t => t.status === 'completed').length;
  const totalCount = taskData.tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Daily Plan</Text>
        <Text style={styles.progressText}>{completedCount}/{totalCount} Done</Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
      <FlatList
        data={taskData.tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskItem 
            task={item} 
            onToggleStatus={handleToggleTaskStatus}
            pathId={user.selectedPathId} // Pass down for navigation
            subjectId={item.relatedSubjectId || null} // Assuming you add this to your task object
          />
        )}
        scrollEnabled={false} // Important for FlatList inside ScrollView
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#0f1724', borderRadius: 16, padding: 20, marginHorizontal: 12, marginVertical: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  progressText: { color: '#a7adb8ff', fontSize: 14 },
  progressBarContainer: { height: 6, backgroundColor: '#1E293B', borderRadius: 3, marginBottom: 20, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#10B981' },
  emptyContainer: { paddingVertical: 30, alignItems: 'center' },
  emptyTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  emptySubtitle: { color: '#a7adb8ff', fontSize: 15, textAlign: 'center', marginVertical: 15, lineHeight: 22 },
});

export default DailyTasks;