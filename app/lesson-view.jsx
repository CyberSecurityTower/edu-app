import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';

import { getLessonContent, updateLessonProgress } from '../services/firestoreService';
import { useAppState } from './_layout';

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
      if (!user) return;
      setIsLoading(true);
      const contentData = await getLessonContent(lessonId);
      if (contentData) setLessonContent(contentData.content);
      await updateLessonProgress(user.uid, pathId, subjectId, lessonId, 'current', parseInt(totalLessons, 10));
      setIsLoading(false);
    };
    loadLesson();
  }, [lessonId, user]);

  const handleCompleteLesson = async () => {
    if (isCompleted || !user) return;
    setIsCompleted(true);
    await updateLessonProgress(user.uid, pathId, subjectId, lessonId, 'completed', parseInt(totalLessons, 10));
  };

  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }) => {
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - 30;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <FontAwesome5 name="arrow-left" size={22} color="white" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{lessonTitle || 'Lesson'}</Text>
        {/* --- THE NEW BUTTON IS HERE --- */}
        <Pressable 
          style={styles.headerIcon} 
          onPress={() => router.push({ pathname: '/study-kit', params: { lessonId, lessonTitle }})}
        >
          <FontAwesome5 name="magic" size={22} color="#10B981" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerContent}><ActivityIndicator size="large" color="#10B981" /></View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.contentContainer}
          onScroll={({ nativeEvent }) => { if (isCloseToBottom(nativeEvent)) handleCompleteLesson(); }}
          scrollEventThrottle={400}
        >
          <View style={{ writingDirection: 'rtl' }}>
            <Markdown style={markdownStyles}>{lessonContent || 'No content available.'}</Markdown>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerIcon: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentContainer: { padding: 20 },
});

const markdownStyles = StyleSheet.create({
  heading1: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginBottom: 15, borderBottomWidth: 1, borderColor: '#334155', paddingBottom: 10, textAlign: 'right' },
  body: { color: '#D1D5DB', fontSize: 17, lineHeight: 28, textAlign: 'right' },
  strong: { fontWeight: 'bold', color: '#10B981' },
});