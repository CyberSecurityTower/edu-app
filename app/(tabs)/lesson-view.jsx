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
  
  // --- FIX: DECLARE THE MISSING STATE VARIABLES ---
  const [isCompleted, setIsCompleted] = useState(false); // Tracks if the lesson was completed in this session
  const [isUpdating, setIsUpdating] = useState(false);   // Prevents multiple update calls

  useEffect(() => {
    const loadLesson = async () => {
      if (!user) return;
      setIsLoading(true);
      
      const contentData = await getLessonContent(lessonId);
      if (contentData) {
        setLessonContent(contentData.content);
      }
      
      // We still mark it as 'current' when the lesson loads
      await updateLessonProgress(user.uid, pathId, subjectId, lessonId, 'current', parseInt(totalLessons, 10));
      setIsLoading(false);
    };

    loadLesson();
  }, [lessonId, user]);

  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }) => {
    const paddingToBottom = 30;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  // --- FIX: UPDATED LOGIC USING THE NEW STATE VARIABLES ---
  const handleCompleteLesson = async () => {
    // Now this check works because 'isCompleted' and 'isUpdating' are defined
    if (isCompleted || isUpdating || !user) return;
    
    setIsUpdating(true); // Lock the function to prevent re-entry
    console.log(`Lesson ${lessonId} completed! Sending update to Firestore.`);
    
    try {
      await updateLessonProgress(user.uid, pathId, subjectId, lessonId, 'completed', parseInt(totalLessons, 10));
      setIsCompleted(true); // Mark as completed for this session
      console.log('Update successful.');
    } catch (error) {
      console.error("Failed to update lesson progress:", error);
    } finally {
      setIsUpdating(false); // Unlock the function
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <FontAwesome5 name="arrow-left" size={22} color="white" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{lessonTitle || 'Lesson'}</Text>
        </View>
        <View style={styles.headerIcon} />
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.contentContainer}
          onScroll={({ nativeEvent }) => {
            if (isCloseToBottom(nativeEvent)) {
              handleCompleteLesson();
            }
          }}
          scrollEventThrottle={400} // Check scroll position roughly 2-3 times per second
        >
          <View style={{ writingDirection: 'rtl' }}>
            <Markdown style={markdownStyles}>
              {lessonContent || 'No content available.'}
            </Markdown>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// --- STYLES (No changes needed here) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, minHeight: 60, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerIcon: { width: 50, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentContainer: { padding: 20 },
});

const markdownStyles = StyleSheet.create({
  // ... styles remain the same
  heading1: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginBottom: 15, borderBottomWidth: 1, borderColor: '#334155', paddingBottom: 10, textAlign: 'right' },
  heading2: { color: '#E5E7EB', fontSize: 22, fontWeight: '600', marginBottom: 10, marginTop: 15, textAlign: 'right' },
  body: { color: '#D1D5DB', fontSize: 17, lineHeight: 28, textAlign: 'right' },
  strong: { fontWeight: 'bold', color: '#10B981' },
  list_item: { color: '#D1D5DB', fontSize: 16, lineHeight: 26, marginBottom: 8, flexDirection: 'row-reverse', textAlign: 'right' },
  bullet_list: { marginBottom: 10 }
});