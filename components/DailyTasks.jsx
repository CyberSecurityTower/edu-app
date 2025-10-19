import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { db } from '../firebase'; 
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAppState } from '../context/AppStateContext';
import { useRouter } from 'expo-router';
import AnimatedGradientButton from './AnimatedGradientButton'; // سنحتاجه للزر

const RENDER_PROXY_URL = 'https://eduserver-1.onrender.com'; // Your Render URL

// مكون المهمة الفردية (مع تعديلات طفيفة)
const TaskItem = ({ task, onToggleStatus, onNavigate }) => {
  const isCompleted = task.status === 'completed';

  return (
    <View style={styles.taskCard}>
      <Pressable onPress={() => onToggleStatus(task.id, isCompleted ? 'pending' : 'completed')}>
        <FontAwesome5
          name={isCompleted ? 'check-circle' : 'circle'}
          size={22}
          color={isCompleted ? '#10B981' : '#8A94A4'}
          solid={isCompleted}
        />
      </Pressable>
      <Pressable style={{ flex: 1 }} onPress={() => onNavigate(task)}>
        <Text style={[styles.taskText, isCompleted && styles.taskTextCompleted]}>
          {task.title}
        </Text>
      </Pressable>
    </View>
  );
};


const DailyTasks = () => {
  const { user } = useAppState();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false); // حالة لزر الإنشاء

  useEffect(() => {
    if (!user?.uid) {
        setIsLoading(false);
        return;
    };

    const userProgressRef = doc(db, 'userProgress', user.uid);

    const unsubscribe = onSnapshot(
      userProgressRef,
      (snapshot) => {
        const data = snapshot.data();
        const fetchedTasks = data?.dailyTasks?.tasks || [];
        setTasks(fetchedTasks);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching daily tasks:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // دالة لإنشاء المهام
  const handleGenerateTasks = async () => {
    if (!user?.uid) return;
    setIsGenerating(true);
    try {
      await fetch(`${RENDER_PROXY_URL}/generate-daily-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      // لا حاجة لـ fetchTasks، onSnapshot سيتكفل بالتحديث!
    } catch (error) {
      console.error("Error generating tasks:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // دالة لتغيير حالة المهمة
  const handleToggleTaskStatus = async (taskId, newStatus) => {
    if (!user?.uid) return;
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    const progressRef = doc(db, `userProgress/${user.uid}`);
    await updateDoc(progressRef, { 'dailyTasks.tasks': updatedTasks });
  };

  // دالة للانتقال إلى الدرس
  const handleNavigateToTask = (task) => {
    if (task.relatedLessonId) {
      const pathname = task.type === 'quiz' ? '/study-kit' : '/lesson-view';
      router.push({
        pathname: pathname,
        params: { 
          lessonId: task.relatedLessonId, 
          lessonTitle: task.title,
          pathId: user.selectedPathId,
          subjectId: task.relatedSubjectId,
        },
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#10B981" />
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text style={styles.emptyTitle}>Ready to plan your day?</Text>
        <Text style={styles.emptySubtitle}>Let EduAI create a personalized study plan for you.</Text>
        {isGenerating ? (
          <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 20 }}/>
        ) : (
          <AnimatedGradientButton
            text="Generate My Plan"
            onPress={handleGenerateTasks}
            buttonWidth={220}
            buttonHeight={45}
          />
        )}
      </View>
    );
  }
  
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Daily Plan</Text>
        <Text style={styles.progressText}>{completedCount}/{totalCount} Done</Text>
      </View>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id || Math.random().toString()}
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
  container: {
    backgroundColor: '#0f1724',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 12,
    marginBottom: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressText: {
    color: '#a7adb8ff',
    fontSize: 14,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  taskText: {
    color: 'white',
    marginLeft: 15,
    fontSize: 16,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#a7adb8ff',
    fontSize: 15,
    textAlign: 'center',
    marginVertical: 15,
  },
});

export default DailyTasks;