import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { LinearGradient } from 'expo-linear-gradient'; // Import LinearGradient

// Import our new function
import { getLessonContent, updateLessonProgress, getStudyKit } from '../services/firestoreService';
import { useAppState } from './_layout';

// --- A simple placeholder for the Study Kit Tabs ---
// We will build the real component in the next step.
const StudyKitTabsPlaceholder = ({ data }) => (
  <View style={styles.kitContainer}>
    <Text style={styles.kitTitle}>Study Kit</Text>
    <View style={styles.kitContent}>
      <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Smart Summary:</Text>
      <Text style={{ color: '#d1d5db', marginTop: 5 }}>{data.summary}</Text>
      <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: 20 }}>Quiz has {data.quiz.length} questions.</Text>
      <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: 10 }}>Flashcards have {data.flashcards.length} cards.</Text>
    </View>
  </View>
);


export default function LessonViewScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAppState();
  const { lessonId, lessonTitle, subjectId, pathId, totalLessons } = params;

  const [lessonContent, setLessonContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // --- NEW STATES FOR THE STUDY KIT ---
  const [kitData, setKitData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isKitVisible, setIsKitVisible] = useState(false);
  
  // This state is for the lesson completion logic
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const loadLesson = async () => {
      if (!user) return;
      setIsLoading(true);
      const contentData = await getLessonContent(lessonId);
      if (contentData) {
        setLessonContent(contentData.content);
      }
      await updateLessonProgress(user.uid, pathId, subjectId, lessonId, 'current', parseInt(totalLessons, 10));
      setIsLoading(false);
    };
    loadLesson();
  }, [lessonId, user]);

  // --- NEW FUNCTION TO HANDLE KIT GENERATION ---
  const handleGenerateKit = async () => {
    setIsGenerating(true);
    
    // We use Promise.all to run the fake delay and data fetching simultaneously
    const [kitResult] = await Promise.all([
      getStudyKit(lessonId),
      new Promise(resolve => setTimeout(resolve, 4000)) // Fake 4-second loading
    ]);

    if (kitResult) {
      setKitData(kitResult);
      setIsKitVisible(true); // This will hide the button and show the tabs
    } else {
      alert("Sorry, the Study Kit for this lesson could not be found.");
    }
    
    setIsGenerating(false);
  };

  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }) => {
    const paddingToBottom = 30;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
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
            onScroll={({ nativeEvent }) => { if (isCloseToBottom(nativeEvent)) { handleCompleteLesson(); }}}
            scrollEventThrottle={400}
          >
            <View style={{ writingDirection: 'rtl' }}>
              <Markdown style={markdownStyles}>{lessonContent || 'No content available.'}</Markdown>
            </View>
            
            {/* --- NEW: Conditionally render the Study Kit Tabs Placeholder --- */}
            {isKitVisible && kitData && <StudyKitTabsPlaceholder data={kitData} />}

          </ScrollView>

          {/* --- NEW: Conditionally render the Floating Generate Button --- */}
          {!isKitVisible && (
            <Pressable style={styles.fabContainer} onPress={handleGenerateKit} disabled={isGenerating}>
              <LinearGradient colors={['#10B981', '#34D399']} style={styles.fab}>
                {isGenerating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <FontAwesome5 name="magic" size={20} color="white" />
                    <Text style={styles.fabText}>Generate Study Kit</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

// --- STYLES (with new additions) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerIcon: { width: 50, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentContainer: { padding: 20, paddingBottom: 120 }, // Added paddingBottom to avoid FAB overlap

  // --- NEW STYLES for the Floating Action Button ---
  fabContainer: { position: 'absolute', bottom: 40, alignSelf: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },
  fab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 25, borderRadius: 30 },
  fabText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },

  // --- NEW STYLES for the Study Kit Placeholder ---
  kitContainer: { marginTop: 40, backgroundColor: '#1E293B', borderRadius: 16, padding: 20 },
  kitTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  kitContent: { /* Add styles for the content inside the kit if needed */ },
});

// --- MARKDOWN STYLES (Unchanged) ---
const markdownStyles = StyleSheet.create({
  heading1: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginBottom: 15, borderBottomWidth: 1, borderColor: '#334155', paddingBottom: 10, textAlign: 'right' },
  heading2: { color: '#E5E7EB', fontSize: 22, fontWeight: '600', marginBottom: 10, marginTop: 15, textAlign: 'right' },
  body: { color: '#D1D5DB', fontSize: 17, lineHeight: 28, textAlign: 'right' },
  strong: { fontWeight: 'bold', color: '#10B981' },
  list_item: { color: '#D1D5DB', fontSize: 16, lineHeight: 26, marginBottom: 8, flexDirection: 'row-reverse', textAlign: 'right' },
  bullet_list: { marginBottom: 10 },
});