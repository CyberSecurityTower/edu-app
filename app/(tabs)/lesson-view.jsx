import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { getLessonContent, updateLessonProgress } from '../../services/firestoreService';
import { useAppState } from '../_layout';

export default function LessonViewScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAppState();
  const { lessonId, lessonTitle, subjectId, pathId, totalLessons } = params;

  const [lessonContent, setLessonContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const loadLesson = async () => {
      setIsLoading(true);
      
      // Fetch lesson content
      const contentData = await getLessonContent(lessonId);
      if (contentData) {
        setLessonContent(contentData.content);
      }
      
      // Mark lesson as 'current' when the user opens it
      await updateLessonProgress(user.uid, pathId, subjectId, lessonId, 'current', parseInt(totalLessons));
      
      setIsLoading(false);
    };

    loadLesson();
  }, [lessonId]);

  // Function to check if user has scrolled to the bottom
  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }) => {
    const paddingToBottom = 30;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  // Function to mark lesson as complete
  const handleCompleteLesson = async () => {
    if (isCompleted) return; // Prevent multiple calls
    
    console.log('Lesson completed!');
    setIsCompleted(true);
    await updateLessonProgress(user.uid, pathId, subjectId, lessonId, 'completed', parseInt(totalLessons));
    // Optionally, show a success message or animation here
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ... (Header remains the same) ... */}

      {isLoading ? (
        <View style={styles.centerContent}><ActivityIndicator size="large" color="#10B981" /></View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.contentContainer}
          onScroll={({ nativeEvent }) => {
            if (isCloseToBottom(nativeEvent)) {
              handleCompleteLesson();
            }
          }}
          scrollEventThrottle={400} // Check scroll position roughly twice a second
        >
          <Markdown style={markdownStyles}>
            {lessonContent}
          </Markdown>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, minHeight: 60, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerIcon: { width: 50, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentContainer: { padding: 20 },
});

// --- MARKDOWN STYLES ---
// This object allows us to style the rendered Markdown content
const markdownStyles = StyleSheet.create({
  heading1: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#334155',
    paddingBottom: 10,
  },
  heading2: {
    color: '#E5E7EB',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 15,
  },
  body: {
    color: '#D1D5DB',
    fontSize: 17,
    lineHeight: 28, // For better readability
  },
  strong: {
    fontWeight: 'bold',
    color: '#10B981', // Highlight important text
  },
  list_item: {
    color: '#D1D5DB',
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 8,
  },
});