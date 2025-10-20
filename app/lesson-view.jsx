// app/lesson-view.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import Toast from 'react-native-toast-message';

import FloatingActionButton from '../components/FloatingActionButton';
import { getLessonContent, updateLessonProgress, getUserProgressDocument, updateUserPoints } from '../services/firestoreService';
import { useAppState } from '../context/AppStateContext';
import GenerateKitButton from '../components/GenerateKitButton';
import { POINTS_CONFIG } from '../config/points';

export default function LessonViewScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAppState();
  
  const { 
    lessonId, 
    lessonTitle, 
    subjectId, 
    pathId, 
    totalLessons 
  } = params || {};

  const [lessonContent, setLessonContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadLesson = async () => {
      // استخدم user.uid هنا للتحقق
      if (!user?.uid || !lessonId || !subjectId || !pathId) {
        if (mounted) {
            Alert.alert("خطأ", "بيانات الدرس ناقصة. لا يمكن المتابعة.");
            setIsLoading(false);
        }
        return;
      }
      
      setIsLoading(true);
      const contentData = await getLessonContent(lessonId);
      if (mounted) {
        if (contentData) setLessonContent(contentData.content);
        const total = parseInt(totalLessons, 10) || 1;
        // استخدم user.uid هنا للتحديث
        await updateLessonProgress(user.uid, pathId, subjectId, lessonId, 'current', total);
        setIsLoading(false);
      }
    };
    loadLesson();
    return () => { mounted = false; };
  }, [lessonId, user?.uid, subjectId, pathId, totalLessons]); // <--- الإصلاح الحاسم هنا

  const handleCompleteLesson = async () => {
    // استخدم user.uid هنا
    if (isCompleted || !user?.uid) return;
    setIsCompleted(true);

    try {
      if (!user.uid || !lessonId || !subjectId || !pathId) {
          throw new Error("Missing IDs for completion update.");
      }
      
      const progressDoc = await getUserProgressDocument(user.uid);
      const lessonProgress = progressDoc?.pathProgress?.[pathId]?.subjects?.[subjectId]?.lessons?.[lessonId];
      // تحقق مما إذا كان الدرس قد تم إكماله بالفعل
      const wasAlreadyCompleted = lessonProgress?.status === 'completed';

      const total = parseInt(totalLessons, 10) || 1;
      await updateLessonProgress(user.uid, pathId, subjectId, lessonId, 'completed', total);

      // امنح النقاط فقط إذا لم يكن الدرس مكتملاً من قبل
      if (!wasAlreadyCompleted) {
        const points = POINTS_CONFIG.LESSON_COMPLETE_FIRST_TIME;
        await updateUserPoints(user.uid, points);
        
        Toast.show({
          type: 'points',
          text1: `+${points} Points!`,
          position: 'bottom',
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error("Error in handleCompleteLesson:", error);
      setIsCompleted(false);
    }
  };

  // ... (بقية الكود يبقى كما هو)

  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }) => {
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - 30;
  };
  
  if (isLoading && (!lessonId || !subjectId || !pathId)) {
      return (
        <SafeAreaView style={styles.centerContent}>
            <Text style={styles.errorText}>يرجى العودة والبدء من شاشة المادة.</Text>
        </SafeAreaView>
      );
  }


  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <FontAwesome5 name="arrow-left" size={22} color="white" />
        </Pressable>
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
            <View style={{ writingDirection: 'rtl' }}>
              <Markdown style={markdownStyles}>{lessonContent || 'No content available.'}</Markdown>
            </View>
          </ScrollView>
          
          <GenerateKitButton 
            onPress={() => router.push({ 
                pathname: '/study-kit', 
                params: { 
                    lessonId, 
                    lessonTitle, 
                    subjectId, 
                    pathId     
                }
            })}
          />
             <View style={{ position: 'absolute', bottom: 120, right: 25 }}>
             <FloatingActionButton 
                onPress={() => router.push({ 
                    pathname: '/(modal)/ai-chatbot', 
                    params: { 
                        contextLessonId: lessonId, 
                        contextLessonTitle: `About: ${lessonTitle}` 
                    }
                })}
             />
          </View>
        </>
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
  contentContainer: { padding: 20, paddingBottom: 120 },
  errorText: { color: '#EF4444', fontSize: 18, textAlign: 'center' },
});

const markdownStyles = StyleSheet.create({
  heading1: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginBottom: 15, borderBottomWidth: 1, borderColor: '#334155', paddingBottom: 10, textAlign: 'right' },
  body: { color: '#D1D5DB', fontSize: 17, lineHeight: 28, textAlign: 'right' },
  strong: { fontWeight: 'bold', color: '#10B981' },
});