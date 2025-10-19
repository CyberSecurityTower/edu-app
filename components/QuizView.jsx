// components/QuizView.jsx
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

import AnimatedGradientButton from './AnimatedGradientButton';
import {
  updateLessonMasteryScore,
  updateUserPoints,
  getUserProgressDocument
} from '../services/firestoreService';
import { POINTS_CONFIG } from '../config/points';
import { useAppState } from '../context/AppStateContext';

// --- CONFIGURATION ---
const RENDER_PROXY_URL = 'https://eduserver-1.onrender.com';

// --- OPTION ITEM (sub-component) ---
const OptionItem = ({
  option,
  index,
  onPress,
  disabled,
  showCorrect,
  isCorrect,
  isSelected,
  shakeIdx,
  shakeValue
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    if (shakeIdx.value === index) {
      return {
        transform: [{ translateX: shakeValue.value }],
      };
    }
    return { transform: [{ translateX: 0 }] };
  });

  let baseStyle = styles.optionButton;
  if (showCorrect && isCorrect) baseStyle = [styles.optionButton, styles.correctOption];
  else if (showCorrect && isSelected && !isCorrect) baseStyle = [styles.optionButton, styles.incorrectOption];

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => onPress(option, index)}
        disabled={disabled}
        style={baseStyle}
      >
        <Text style={styles.optionText}>{option}</Text>
        {showCorrect && isCorrect && <FontAwesome5 name="check-circle" size={20} color="white" />}
      </Pressable>
    </Animated.View>
  );
};

// --- QUIZ VIEW COMPONENT ---
const QuizView = ({ quizData = [], lessonTitle, lessonId, pathId, subjectId }) => {
  const { user, refreshPoints } = useAppState();

  // Guard: ensure quizData exists
  if (!quizData || quizData.length === 0) {
    return (
      <View style={styles.centerAnalyzing}>
        <Text style={styles.analysisText}>⚠️ لا توجد أسئلة متاحة لهذا الدرس.</Text>
      </View>
    );
  }

  // --- STATE ---
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState(new Array(quizData.length).fill(null));
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Shared values for shake animation
  const shakeValue = useSharedValue(0);
  const shakeIdx = useSharedValue(-1);

  const currentQuestion = quizData[currentQuestionIndex];

  // Prepare data for AI (memoized)
  const quizQuestionsData = useMemo(() => quizData.map(q => ({
    question: q.question,
    correctAnswer: q.correctAnswer,
    options: q.options,
  })), [quizData]);

  // Helper to trigger shake on a given option index
  const triggerShake = useCallback((index) => {
    shakeIdx.value = index;
    shakeValue.value = withSequence(
      withTiming(-10, { duration: 60, easing: Easing.linear }),
      withTiming(10, { duration: 60, easing: Easing.linear }),
      withTiming(-6, { duration: 50, easing: Easing.linear }),
      withTiming(6, { duration: 50, easing: Easing.linear }),
      withTiming(0, { duration: 40, easing: Easing.linear })
    );

    // reset index after approx duration
    setTimeout(() => {
      shakeIdx.value = -1;
    }, 270);
  }, [shakeIdx, shakeValue]);

  // Handle answer
  const handleAnswerPress = useCallback(async (option, index) => {
    if (isAnswered || !user) return;

    setSelectedAnswer(option);
    setIsAnswered(true);

    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = option;
    setUserAnswers(newAnswers);

    let points = 0;
    if (option === currentQuestion.correctAnswer) {
      setScore(prev => prev + 1);
      points = POINTS_CONFIG.QUIZ_CORRECT_ANSWER;
      Toast.show({
        type: 'points',
        text1: `+${points} نقاط!`,
        position: 'bottom',
        visibilityTime: 1500,
      });
    } else {
      triggerShake(index);
      points = POINTS_CONFIG.QUIZ_INCORRECT_ANSWER;
    }

    try {
      await updateUserPoints(user.uid, points);
      if (refreshPoints) refreshPoints();
    } catch (err) {
      console.error("updateUserPoints failed:", err);
    }
  }, [isAnswered, user, currentQuestion, currentQuestionIndex, userAnswers, triggerShake, refreshPoints]);

  // AI analysis + Firestore update
  const analyzeAndFinishQuiz = useCallback(async () => {
    setIsAnalyzing(true);

    // Safety check for required IDs
    if (!user || !pathId || !subjectId || !lessonId) {
      Alert.alert("خطأ البيانات", "بيانات المادة أو المسار مفقودة. لا يمكن حفظ النتيجة.");
      setIsAnalyzing(false);
      setAnalysisData({
        newMasteryScore: Math.round((score / quizData.length) * 100),
        feedbackSummary: "لا يمكن إجراء حفظ تلقائي للنتيجة بسبب نقص البيانات. لكنك حققت أداءً جيداً.",
        suggestedNextStep: "تأكد من إعداد المسار والموضوع قبل المحاولة مرة أخرى."
      });
      setIsQuizFinished(true);
      return;
    }

    try {
      const analysisResponse = await fetch(`${RENDER_PROXY_URL}/analyze-quiz-fail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          lessonTitle: lessonTitle || 'Lesson Quiz',
          quizQuestions: quizQuestionsData,
          userAnswers,
          totalScore: score,
        }),
      });

      if (!analysisResponse.ok) throw new Error("AI Analysis Server Error");

      const data = await analysisResponse.json();
      setAnalysisData(data);

      // Save results in Firestore
      try {
        await updateLessonMasteryScore(
          user.uid,
          pathId,
          subjectId,
          lessonId,
          data.newMasteryScore,
          data.suggestedNextStep
        );
      } catch (err) {
        console.error("updateLessonMasteryScore failed:", err);
      }

    } catch (error) {
      console.error("AI Analysis Failed:", error);
      setAnalysisData({
        newMasteryScore: Math.round((score / quizData.length) * 100),
        feedbackSummary: "لم نتمكن من إجراء تحليل مفصل، لكنك حققت نتائج جيدة.",
        suggestedNextStep: "يمكنك مراجعة الدروس التي وجدت صعوبة فيها."
      });
    } finally {
      setIsAnalyzing(false);
      setIsQuizFinished(true);
    }
  }, [quizQuestionsData, user, userAnswers, score, lessonId, lessonTitle, pathId, subjectId, quizData.length]);

  // Next or finish
  const handleNext = useCallback(() => {
    if (currentQuestionIndex === quizData.length - 1) {
      analyzeAndFinishQuiz();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  }, [currentQuestionIndex, quizData.length, analyzeAndFinishQuiz]);

  // Retry quiz
  const handleRestart = useCallback(async () => {
    if (!user) return;

    try {
      const progressDoc = await getUserProgressDocument(user.uid);
      const currentPoints = progressDoc?.stats?.points || 0;
      const cost = Math.abs(POINTS_CONFIG.QUIZ_RETRY);

      if (currentPoints < cost) {
        Alert.alert("نقاط غير كافية", `تحتاج ${cost} نقاط لإعادة المحاولة.`);
        return;
      }

      await updateUserPoints(user.uid, POINTS_CONFIG.QUIZ_RETRY);
      if (refreshPoints) refreshPoints();

      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setUserAnswers(new Array(quizData.length).fill(null));
      setIsQuizFinished(false);
      setAnalysisData(null);
    } catch (err) {
      console.error("handleRestart failed:", err);
    }
  }, [user, refreshPoints, quizData.length]);

  // UI states
  if (isAnalyzing) {
    return (
      <View style={styles.centerAnalyzing}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.analysisText}>جاري تحليل نتائجك باستخدام EduAI...</Text>
      </View>
    );
  }

  if (isQuizFinished) {
    const totalQuestions = quizData.length;
    const finalMasteryScore = analysisData?.newMasteryScore ?? Math.round((score / totalQuestions) * 100);

    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1E293B', '#334155']} style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>🎉 تم إتمام التحليل!</Text>
          <Text style={styles.resultsText}>
            نتيجتك: <Text style={{ color: '#10B981', fontWeight: 'bold' }}>{score}</Text>/{totalQuestions}
          </Text>

          <View style={styles.masteryRow}>
            <AnimatedCircularProgress
              size={120}
              width={12}
              fill={finalMasteryScore}
              tintColor={finalMasteryScore >= 70 ? "#10B981" : "#F59E0B"}
              backgroundColor="#0f1724"
            >
              {() => <Text style={styles.masteryScoreValue}>{finalMasteryScore}%</Text>}
            </AnimatedCircularProgress>

            <View style={styles.masteryInfo}>
              <Text style={styles.masteryScoreText}>درجة الإتقان</Text>
              <Text style={styles.analysisSummaryText}>{analysisData?.feedbackSummary}</Text>
            </View>
          </View>

          <Text style={styles.analysisSummaryTitle}>اقتراح الخطوة التالية:</Text>
          <Text style={styles.analysisNextStepText}>{analysisData?.suggestedNextStep}</Text>

          <AnimatedGradientButton
            text={`إعادة المحاولة (-${Math.abs(POINTS_CONFIG.QUIZ_RETRY)} نقاط)`}
            onPress={handleRestart}
            buttonWidth={240}
            buttonHeight={50}
            fontSize={16}
            borderRadius={25}
          />
        </LinearGradient>
      </View>
    );
  }

  // Regular quiz screen
  return (
    <View style={styles.container}>
      <Text style={styles.progressText}>السؤال {currentQuestionIndex + 1}/{quizData.length}</Text>

      <Animated.View style={{ marginBottom: 20 }}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
      </Animated.View>

      <View style={styles.optionsContainer}>
        {currentQuestion.options.map((option, idx) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = currentQuestion.correctAnswer === option;

          return (
            <OptionItem
              key={idx}
              option={option}
              index={idx}
              onPress={handleAnswerPress}
              disabled={isAnswered}
              showCorrect={isAnswered}
              isCorrect={isCorrect}
              isSelected={isSelected}
              shakeIdx={shakeIdx}
              shakeValue={shakeValue}
            />
          );
        })}
      </View>

      {isAnswered && (
        <Pressable style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentQuestionIndex === quizData.length - 1 ? 'إنهاء الاختبار' : 'السؤال التالي'}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: { paddingVertical: 10 },
  progressText: { color: '#a7adb8ff', fontSize: 14, textAlign: 'center', marginBottom: 15 },
  questionText: { color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  optionsContainer: { marginBottom: 20, paddingHorizontal: 10 },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#334155',
    padding: 18,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  correctOption: { backgroundColor: '#10B981', borderColor: '#34D399' },
  incorrectOption: { backgroundColor: '#EF4444', borderColor: '#F87171' },
  optionText: { color: 'white', fontSize: 16, flex: 1 },
  nextButton: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center' },
  nextButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  centerAnalyzing: { justifyContent: 'center', alignItems: 'center', minHeight: 250 },
  analysisText: { color: '#a7adb8ff', fontSize: 16, marginTop: 15, textAlign: 'center' },
  resultsCard: { alignItems: 'center', padding: 30, borderRadius: 16 },
  resultsTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  resultsText: { color: '#d1d5db', fontSize: 18, marginBottom: 15 },
  masteryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  masteryBadgeContainer: { alignItems: 'center', marginVertical: 15, paddingHorizontal: 25, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15 },
  masteryScoreText: { color: '#d1d5db', fontSize: 14, marginBottom: 5 },
  masteryScoreValue: { fontSize: 28, fontWeight: '900', color: 'white' },
  masteryInfo: { paddingLeft: 16, flex: 1 },
  analysisSummaryTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 5, textAlign: 'center' },
  analysisSummaryText: { color: '#d1d5db', fontSize: 15, textAlign: 'center', marginBottom: 15, lineHeight: 24 },
  analysisNextStepText: { color: '#34D399', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 25 },
});

export default QuizView;
