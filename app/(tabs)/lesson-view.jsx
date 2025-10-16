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
  
  // --- التغيير هنا ---
  // هذه الحالة ستمنعنا من إرسال تحديثات متكررة إلى قاعدة البيانات
  const [completionFired, setCompletionFired] = useState(false);

  useEffect(() => {
    const loadLesson = async () => {
      if (!user) return;
      setIsLoading(true);
      
      const contentData = await getLessonContent(lessonId);
      if (contentData) {
        setLessonContent(contentData.content);
      }
      
      // تحديث حالة الدرس إلى "قيد القراءة" عند فتحه
      await updateLessonProgress(user.uid, pathId, subjectId, lessonId, 'current', parseInt(totalLessons, 10));
      setIsLoading(false);
    };

    loadLesson();
  }, [lessonId, user]);

  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }) => {
    // نعتبر أن المستخدم وصل للنهاية إذا كان على بعد 30 بكسل منها
    const paddingToBottom = 30;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  // --- التغيير هنا ---
  // جعلنا هذه الدالة أكثر أمانًا
        const handleCompleteLesson = async () => {
          if (isCompleted || isUpdating || !user) return; // منع الاستدعاءات المتعددة
          
          setIsUpdating(true); // بدء التحديث
          console.log('Lesson completed!');
          await updateLessonProgress(user.uid, pathId, subjectId, lessonId, 'completed', parseInt(totalLessons, 10));
          setIsCompleted(true); // تمييز الدرس كمكتمل في هذه الجلسة
          setIsUpdating(false); // انتهاء التحديث
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
            // عند كل حركة سكرول، تحقق إذا كان المستخدم قريبًا من النهاية
            if (isCloseToBottom(nativeEvent)) {
              handleCompleteLesson();
            }
          }}
          scrollEventThrottle={400} // استدعاء onScroll كل 400ms كحد أقصى لتحسين الأداء
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

// الأنماط تبقى كما هي
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
  heading1: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginBottom: 15, borderBottomWidth: 1, borderColor: '#334155', paddingBottom: 10, textAlign: 'right' },
  heading2: { color: '#E5E7EB', fontSize: 22, fontWeight: '600', marginBottom: 10, marginTop: 15, textAlign: 'right' },
  body: { color: '#D1D5DB', fontSize: 17, lineHeight: 28, textAlign: 'right' },
  strong: { fontWeight: 'bold', color: '#10B981' },
  list_item: { color: '#D1D5DB', fontSize: 16, lineHeight: 26, marginBottom: 8, flexDirection: 'row-reverse', textAlign: 'right' },
  bullet_list: { marginBottom: 10 },
});
