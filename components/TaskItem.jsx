import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { getLessonContent } from '../services/firestoreService'; // Assuming you have a way to get lesson details

const ICONS = {
  review: { name: 'book-reader', color: '#3B82F6' },
  quiz: { name: 'puzzle-piece', color: '#F59E0B' },
  new_lesson: { name: 'lightbulb', color: '#10B981' },
  default: { name: 'tasks', color: '#9CA3AF' },
};

const TaskItem = ({ task, onToggleStatus, pathId, subjectId }) => {
  const router = useRouter();
  const isCompleted = task.status === 'completed';
  
  // Reanimated shared values for animations
  const scale = useSharedValue(isCompleted ? 1 : 0);
  const textOpacity = useSharedValue(isCompleted ? 0.5 : 1);
  const textLineThrough = useSharedValue(isCompleted ? 1 : 0);

  // Update animations instantly if the prop changes
  useEffect(() => {
    scale.value = withSpring(isCompleted ? 1 : 0);
    textOpacity.value = withTiming(isCompleted ? 0.5 : 1);
    textLineThrough.value = withTiming(isCompleted ? 1 : 0);
  }, [isCompleted]);

  const animatedCheckmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));
  
  const animatedLineStyle = useAnimatedStyle(() => ({
      width: `${textLineThrough.value * 100}%`,
  }));

  const handleToggle = () => {
    const newStatus = isCompleted ? 'pending' : 'completed';
    // The parent component's state update will trigger the useEffect
    onToggleStatus(task.id, newStatus);
  };

  const handlePress = () => {
    if (task.relatedLessonId) {
      // Navigate to the appropriate screen based on task type
      const pathname = task.type === 'quiz' ? '/study-kit' : '/lesson-view';
      router.push({
        pathname: pathname,
        params: { 
          lessonId: task.relatedLessonId, 
          lessonTitle: task.title,
          // Pass path and subject IDs for context
          pathId: pathId,
          subjectId: subjectId,
        },
      });
    }
  };

  const icon = ICONS[task.type] || ICONS.default;

  return (
    <Animated.View style={styles.container}>
      <Pressable style={styles.mainContent} onPress={handlePress}>
        <FontAwesome5 name={icon.name} size={22} color={icon.color} style={styles.icon} />
        <View style={styles.textContainer}>
          <Animated.Text style={[styles.title, animatedTextStyle]}>{task.title}</Animated.Text>
          <Animated.View style={[styles.lineThrough, animatedLineStyle]}/>
        </View>
      </Pressable>
      <Pressable style={styles.checkbox} onPress={handleToggle}>
        <Animated.View style={[styles.checkmark, animatedCheckmarkStyle]}>
          <FontAwesome5 name="check" size={14} color="white" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, marginBottom: 10 },
  mainContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingLeft: 15 },
  icon: { marginRight: 15, width: 25, textAlign: 'center' },
  textContainer: { flex: 1, justifyContent: 'center' },
  title: { color: 'white', fontSize: 16 },
  lineThrough: { position: 'absolute', top: '50%', height: 1.5, backgroundColor: '#9CA3AF' },
  checkbox: { width: 48, height: '100%', justifyContent: 'center', alignItems: 'center' },
  checkmark: { width: 28, height: 28, backgroundColor: '#10B981', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
});

export default TaskItem;