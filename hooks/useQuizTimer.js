import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AnalyticsService from '../services/AnalyticsService';

export const useQuizTimer = (quizId, userId, questionCount, difficultyLevel = 'normal') => {
  // مراجع لحفظ التوقيت دون إعادة تصيير المكون
  const startTime = useRef(Date.now());
  const appState = useRef(AppState.currentState);
  
  // متغيرات تتبع "الخروج من التطبيق"
  const focusLostCount = useRef(0);
  const totalBackgroundDuration = useRef(0);
  const lastBackgroundEntryTime = useRef(null);

  useEffect(() => {
    // 1. تسجيل لحظة البدء
    startTime.current = Date.now();
    // AnalyticsService.logEvent('quiz_start', userId, { quiz_id: quizId }); // اختياري

    // 2. مراقبة حالة التطبيق (هل خرج الطالب؟)
    const subscription = AppState.addEventListener('change', nextAppState => {
      
      // أ) الطالب خرج من التطبيق (ذهب للخلفية)
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        focusLostCount.current += 1;
        lastBackgroundEntryTime.current = Date.now();
        console.log("⚠️ Quiz Monitor: Focus Lost (User left app)");
      } 
      
      // ب) الطالب عاد للتطبيق
      else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (lastBackgroundEntryTime.current) {
          const timeAway = Date.now() - lastBackgroundEntryTime.current;
          totalBackgroundDuration.current += timeAway;
          lastBackgroundEntryTime.current = null;
          console.log(`🔙 Quiz Monitor: User returned. Time away: ${timeAway}ms`);
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [quizId]);

  // 3. دالة التسليم (تستدعى عند إنهاء الكويز)
  const submitMetrics = (score, relatedLessonId) => {
    const endTime = Date.now();
    const totalSessionTime = endTime - startTime.current;
    
    // المعادلة: الوقت الفعلي = الوقت الكلي - وقت الغياب
    // إذا كان الناتج بالسالب (خطأ تقني نادر)، نجعله صفر
    const activeTime = Math.max(0, totalSessionTime - totalBackgroundDuration.current);

    // إرسال البيانات للباك أند
    AnalyticsService.logEvent(
      'ai_quiz_session_complete',
      userId,
      {
        quiz_id: quizId || 'generated_quiz',
        related_lesson_id: relatedLessonId,
        question_count: questionCount,
        difficulty_level: difficultyLevel,
        
        // البيانات الجوهرية للـ AI
        total_active_time_ms: activeTime,         
        focus_lost_duration_ms: totalBackgroundDuration.current, 
        focus_lost_count: focusLostCount.current, 
        
        avg_time_per_q_ms: Math.round(activeTime / (questionCount || 1)),
        score_percentage: score,
      },
      'critical' // أولوية قصوى: يرسل فوراً
    );
  };

  return { submitMetrics };
};