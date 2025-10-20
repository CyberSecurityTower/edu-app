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
import { useAppState } from '../context/AppStateContext';

// --- CONFIGURATION CONSTANTS ---
// All component-specific configurations are now centralized here.
const RENDER_PROXY_URL = 'https://eduserver-1.onrender.com';
const POINTS_CONFIG = {
  QUIZ_CORRECT_ANSWER: 10,
  QUIZ_INCORRECT_ANSWER: 0,
  QUIZ_RETRY: -50,
};

// --- OPTION ITEM (Sub-component for quiz choices) ---
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
      return { transform: [{ translateX: shakeValue.value }] };
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

// --- MAIN QUIZ VIEW COMPONENT ---
const QuizView = ({ quizData = [], lessonTitle, lessonId, pathId, subjectId }) => {
  const { user, refreshPoints } = useAppState();

  // Guard: Ensure quizData exists and is not empty.
  if (!quizData || quizData.length === 0) {
    return (
      <View style={styles.centerAnalyzing}>
        <Text style={styles.analysisText}>⚠️ لا توجد أسئلة متاحة لهذا الدرس.</Text>
      </View>
    );
  }

  // --- STATE MANAGEMENT ---
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState(new Array(quizData.length).fill(null));
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- REANIMATED SHARED VALUES ---
  const shakeValue = useSharedValue(0);
  const shakeIdx = useSharedValue(-1);

  const currentQuestion = quizData[currentQuestionIndex];

  // Memoize data for AI analysis to prevent re-computation on every render.
  const quizQuestionsData = useMemo(() => quizData.map(q => ({
    question: q.question,
    correctAnswer: q.correctAnswer,
    options: q.options,
  })), [quizData]);

  // --- ANIMATION & LOGIC CALLBACKS ---
  const triggerShake = useCallback((index) => {
    shakeIdx.value = index;
    shakeValue.value = withSequence(
      withTiming(-10, { duration: 60, easing: Easing.linear }),
      withTiming(10, { duration: 60, easing: Easing.linear }),
      withTiming(0, { duration: 50, easing: Easing.linear })
    );
    setTimeout(() => { shakeIdx.value = -1; }, 200);
  }, [shakeIdx, shakeValue]);

  const handleAnswerPress = useCallback(async (option, index) => {
    if (isAnswered || !user) return;

    setIsAnswered(true);
    setSelectedAnswer(option);
    
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = option;
    setUserAnswers(newAnswers);

    let pointsAwarded = 0;
    if (option === currentQuestion.correctAnswer) {
      setScore(prev => prev + 1);
      pointsAwarded = POINTS_CONFIG.QUIZ_CORRECT_ANSWER;
      Toast.show({ type: 'points', text1: `+${pointsAwarded} نقاط!` });
    } else {
      triggerShake(index);
      pointsAwarded = POINTS_CONFIG.QUIZ_INCORRECT_ANSWER;
    }

    if (pointsAwarded !== 0) {
      try {
        await updateUserPoints(user.uid, pointsAwarded);
        refreshPoints?.();
      } catch (err) {
        console.error("Failed to update user points:", err);
      }
    }
  }, [isAnswered, user, currentQuestion, currentQuestionIndex, userAnswers, triggerShake, refreshPoints]);

  const analyzeAndFinishQuiz = useCallback(async () => {
    setIsAnalyzing(true);

    // Enhanced Guard: Stricter check for data integrity before making an API call.
    if (!user?.uid || !pathId || !subjectId || !lessonId) {
      Alert.alert("خطأ في البيانات", "لا يمكن حفظ النتيجة بسبب نقص بيانات المسار أو المادة. سيتم عرض نتيجتك محلياً فقط.");
      setIsAnalyzing(false);
      setIsQuizFinished(true);
      setAnalysisData({
        newMasteryScore: Math.round((score / quizData.length) * 100),
        feedbackSummary: "أداء جيد، لكن لم نتمكن من حفظ النتيجة تلقائياً.",
        suggestedNextStep: "تأكد من أن المسار التعليمي والمادة محددين بشكل صحيح."
      });
      return;
    }

    try {
      const response = await fetch(`${RENDER_PROXY_URL}/analyze-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          lessonTitle,
          quizQuestions: quizQuestionsData,
          userAnswers,
          totalScore: score,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`AI Analysis Server Error (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      setAnalysisData(data);

      await updateLessonMasteryScore(
        user.uid, pathId, subjectId, lessonId,
        data.newMasteryScore, data.suggestedNextStep
      );

    } catch (error) {
      console.error("AI Analysis or Firestore update failed:", error);
      setAnalysisData({
        newMasteryScore: Math.round((score / quizData.length) * 100),
        feedbackSummary: "لم نتمكن من الحصول على تحليل مفصل، لكنك قمت بعمل رائع!",
        suggestedNextStep: "يمكنك مراجعة الدروس التي واجهت فيها صعوبة."
      });
    } finally {
      setIsAnalyzing(false);
      setIsQuizFinished(true);
    }
  }, [quizQuestionsData, user, userAnswers, score, lessonId, lessonTitle, pathId, subjectId, quizData.length]);

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < quizData.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      analyzeAndFinishQuiz();
    }
  }, [currentQuestionIndex, quizData.length, analyzeAndFinishQuiz]);

  const handleRestart = useCallback(async () => {
    if (!user) return;
    try {
      const progressDoc = await getUserProgressDocument(user.uid);
      const currentPoints = progressDoc?.stats?.points || 0;
      const cost = Math.abs(POINTS_CONFIG.QUIZ_RETRY);

      if (currentPoints < cost) {
        Alert.alert("نقاط غير كافية", `تحتاج إلى ${cost} نقطة على الأقل لإعادة المحاولة.`);
        return;
      }

      await updateUserPoints(user.uid, POINTS_CONFIG.QUIZ_RETRY);
      refreshPoints?.();

      // Reset all states to start the quiz over
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setUserAnswers(new Array(quizData.length).fill(null));
      setIsQuizFinished(false);
      setAnalysisData(null);
    } catch (err) {
      console.error("Failed to process quiz restart:", err);
      Alert.alert("خطأ", "حدث خطأ أثناء محاولة إعادة الاختبار.");
    }
  }, [user, refreshPoints, quizData.length]);

  // --- UI RENDERING ---
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
              rotation={0}
              lineCap="round"
            >
              {() => <Text style={styles.masteryScoreValue}>{finalMasteryScore}%</Text>}
            </AnimatedCircularProgress>
            <View style={styles.masteryInfo}>
              <Text style={styles.masteryScoreText}>درجة الإتقان</Text>
              <Text style={styles.analysisSummaryText}>{analysisData?.feedbackSummary}</Text>
            </View>
          </View>

          <Text style={styles.analysisSummaryTitle}>الخطوة التالية المقترحة:</Text>
          <Text style={styles.analysisNextStepText}>{analysisData?.suggestedNextStep}</Text>

          <AnimatedGradientButton
            text={`إعادة المحاولة (${POINTS_CONFIG.QUIZ_RETRY} نقطة)`}
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

  return (
    <View style={styles.container}>
      <Text style={styles.progressText}>السؤال {currentQuestionIndex + 1}/{quizData.length}</Text>
      <Text style={styles.questionText}>{currentQuestion.question}</Text>

      <View style={styles.optionsContainer}>
        {currentQuestion.options.map((option, idx) => (
          <OptionItem
            key={idx}
            option={option}
            index={idx}
            onPress={handleAnswerPress}
            disabled={isAnswered}
            showCorrect={isAnswered}
            isCorrect={currentQuestion.correctAnswer === option}
            isSelected={selectedAnswer === option}
            shakeIdx={shakeIdx}
            shakeValue={shakeValue}
          />
        ))}
      </View>

      {isAnswered && (
        <AnimatedGradientButton
          text={currentQuestionIndex === quizData.length - 1 ? 'إنهاء وتحليل النتائج' : 'السؤال التالي'}
          onPress={handleNext}
          buttonWidth={'100%'}
          buttonHeight={55}
          fontSize={16}
        />
      )}
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: { padding: 10 },
  progressText: { color: '#a7adb8ff', fontSize: 14, textAlign: 'center', marginBottom: 15 },
  questionText: { color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
  optionsContainer: { marginBottom: 20 },
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
  centerAnalyzing: { justifyContent: 'center', alignItems: 'center', minHeight: 300 },
  analysisText: { color: '#a7adb8ff', fontSize: 16, marginTop: 15, textAlign: 'center' },
  resultsCard: { alignItems: 'center', padding: 25, borderRadius: 16 },
  resultsTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  resultsText: { color: '#d1d5db', fontSize: 18, marginBottom: 20 },
  masteryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, width: '100%' },
  masteryScoreValue: { fontSize: 28, fontWeight: '900', color: 'white' },
  masteryInfo: { paddingLeft: 20, flex: 1 },
  masteryScoreText: { color: '#d1d5db', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  analysisSummaryText: { color: '#d1d5db', fontSize: 14, lineHeight: 22 },
  analysisSummaryTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 8, alignSelf: 'flex-start' },
  analysisNextStepText: { color: '#34D399', fontSize: 15, fontWeight: '600', alignSelf: 'flex-start', marginBottom: 25 },
});

export default QuizView;