import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';

import { getLessonContent, updateLessonProgress, getStudyKit } from '../services/firestoreService';
import { useAppState } from './_layout';

// Import our new components
import GenerateKitButton from '../components/GenerateKitButton';
import StudyKitTabs from '../components/StudyKitTabs';

export default function LessonViewScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAppState();
  const { lessonId, lessonTitle, subjectId, pathId, totalLessons } = params;

  const [lessonContent, setLessonContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [kitData, setKitData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isKitVisible, setIsKitVisible] = useState(false);
  
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

  const handleGenerateKit = async () => {
    setIsGenerating(true);
    const [kitResult] = await Promise.all([
      getStudyKit(lessonId),
      new Promise(resolve => setTimeout(resolve, 4000))
    ]);
    if (kitResult) {
      setKitData(kitResult);
      setIsKitVisible(true);
    } else {
      alert("Sorry, the Study Kit for this lesson could not be found.");
    }
    setIsGenerating(false);
  };

  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }) => {
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - 30;
  };

  const handleCompleteLesson = async () => {
    if (isCompleted || !user) return;
    setIsCompleted(true);
    await updateLessonProgress(user.uid, pathId, subjectId, lessonId, 'completed', parseInt(totalLessons, 10));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}><FontAwesome5 name="arrow-left" size={22} color="white" /></Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{lessonTitle || 'Lesson'}</Text>
        <View style={{ width: 50 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContent}><ActivityIndicator size="large" color="#10B981" /></View>
      ) : (
        <>
          <ScrollView 
            contentContainerStyle={styles.contentContainer}
            onScroll={({ nativeEvent }) => { if (isCloseToBottom(nativeEvent)) handleCompleteLesson(); }}
            scrollEventThrottle={400}
          >
            {/* The new Study Kit Tabs will appear here when visible */}
            {isKitVisible && kitData && <StudyKitTabs data={kitData} />}

            <View style={{ writingDirection: 'rtl' }}>
              <Markdown style={markdownStyles}>{lessonContent || 'No content available.'}</Markdown>
            </View>
          </ScrollView>

          {/* The new circular FAB will appear here when the kit is NOT visible */}
          {!isKitVisible && (
            <GenerateKitButton 
              onPress={handleGenerateKit} 
              isGenerating={isGenerating} 
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerIcon: { width: 50, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentContainer: { padding: 20, paddingBottom: 100 },
});

const markdownStyles = StyleSheet.create({
  heading1: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginBottom: 15, borderBottomWidth: 1, borderColor: '#334155', paddingBottom: 10, textAlign: 'right' },
  body: { color: '#D1D5DB', fontSize: 17, lineHeight: 28, textAlign: 'right' },
  strong: { fontWeight: 'bold', color: '#10B981' },
  list_item: { color: '#D1D5DB', fontSize: 16, lineHeight: 26, marginBottom: 8, flexDirection: 'row-reverse', textAlign: 'right' },
});