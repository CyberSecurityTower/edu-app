// components/gen-ui/GenQuiz.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

// 🛑 ذاكرة خارجية لتخزين الكويزات المنتهية (يمنع الإعادة نهائياً في الجلسة)
const completedQuizzesCache = new Set();

const GenQuiz = ({ data, onAction, messageId }) => {
  // 1. استخراج ومعالجة البيانات
  const quizId = data.id || messageId || `quiz-${Date.now()}`;
  
  const questions = useMemo(() => {
    return data.questions || [];
  }, [data]);

  // التحقق مما إذا كان الكويز مكتمل مسبقاً
  const [isCompleted, setIsCompleted] = useState(completedQuizzesCache.has(quizId));
  
  // States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null); // الخيار المختار للسؤال الحالي
  const [isAnswered, setIsAnswered] = useState(false); // هل تم الإجابة على السؤال الحالي؟
  const [score, setScore] = useState(0);
  const [userReport, setUserReport] = useState([]); // لتخزين تفاصيل الإجابات لإرسالها للـ AI

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  // دالة لمعرفة الاندكس الصحيح (تحسباً لاختلاف النصوص)
  const getCorrectIndex = (q) => {
    return q.options.findIndex(opt => opt === q.correctAnswerText);
  };

  const handleOptionSelect = (index, optionText) => {
    if (isAnswered) return; // منع التغيير

    Haptics.selectionAsync();
    setSelectedOption(index);
    setIsAnswered(true);

    const correctIndex = getCorrectIndex(currentQuestion);
    const isCorrect = index === correctIndex;

    if (isCorrect) {
      setScore(s => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    // تسجيل الإجابة للتقرير
    setUserReport(prev => [...prev, {
      question: currentQuestion.text,
      userAnswer: optionText,
      isCorrect: isCorrect,
      correctAnswer: currentQuestion.correctAnswerText
    }]);
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      // الانتقال للسؤال التالي
      setCurrentIndex(p => p + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // إنهاء الكويز
      finishQuiz();
    }
  };

 const finishQuiz = () => {
    setIsCompleted(true);
    completedQuizzesCache.add(quizId); 
  // ✅ طباعة للتحقق مما إذا كانت الدالة موجودة أصلاً
    if (!onAction) {
        console.error("❌ ERROR: onAction prop is missing in GenQuiz!");
        return;
    }
    if (onAction) {
      // 1. تجهيز البرومبت الخفي (System Report)
      // نستخدم صيغة صارمة لضمان أن الـ AI يفهم المطلوب بدقة
      let hiddenPrompt = `
[SYSTEM_REPORT: QUIZ_RESULTS]
-----------------------------
👤 User Score: ${score} / ${totalQuestions}
📊 Performance Data:
`;

      userReport.forEach((item, i) => {
        hiddenPrompt += `
${i + 1}. Q: "${item.question}"
   - User Answer: ${item.userAnswer} ${item.isCorrect ? "✅ (Correct)" : "❌ (Wrong)"}
   ${!item.isCorrect ? `- Correct Answer: ${item.correctAnswer}` : ""}
`;
      });

      hiddenPrompt += `
-----------------------------
🚨 INSTRUCTION TO AI:
1. The user CANNOT see this report. This is background data.
2. Based on the mistakes above (if any), analyze the user's weaknesses.
3. Reply directly to the user in **Algerian Derja** (EduAI Persona).
4. Give specific advice on which "Atomic Elements" to review based on the wrong answers.
5. If the score is full mark, congratulate them enthusiastically (Sahbi style) and tell them they are ready for the Arena.
6. Keep it short and motivating.
`;

       console.log("🟢 GenQuiz: Triggering onAction now..."); // log للتحقق

    // 2. إرسال الحدث
    onAction({ 
        type: 'quiz_completed', 
        payload: { score, hiddenPrompt } 
    });
};};

  // --- واجهة التحليل (بعد الانتهاء) ---
  if (isCompleted) {
    return (
      <MotiView 
        from={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }}
        style={styles.analyzingContainer}
      >
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.1)', 'rgba(6, 78, 59, 0.2)']}
          style={StyleSheet.absoluteFill}
        />
        
        <MotiView
          from={{ rotate: '0deg' }}
          animate={{ rotate: '360deg' }}
          transition={{ type: 'timing', duration: 2000, loop: true }}
          style={styles.spinnerWrapper}
        >
          <View style={styles.spinnerRing} />
          <FontAwesome5 name="brain" size={24} color="#10B981" />
        </MotiView>

        <Text style={styles.analyzingText}>EduAI يحلل أدائك في الامتحان...</Text>
        <Text style={styles.scoreText}>النتيجة: {score} / {totalQuestions}</Text>
      </MotiView>
    );
  }

  if (!currentQuestion) return null;

  // --- واجهة الكويز ---
  return (
    <View style={styles.container}>
      {/* Header: Progress */}
      <View style={styles.header}>
        <Text style={styles.counterText}>سؤال {currentIndex + 1} من {totalQuestions}</Text>
        <View style={styles.progressBarBg}>
          <MotiView 
            animate={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            transition={{ type: 'timing', duration: 500 }}
            style={styles.progressBarFill} 
          />
        </View>
      </View>

      {/* Question */}
      <Text style={styles.questionText}>{currentQuestion.text}</Text>

      {/* Options */}
      <View style={styles.optionsList}>
        {currentQuestion.options.map((opt, idx) => {
          let bg = '#334155';
          let border = 'transparent';
          let icon = null;

          // منطق التلوين
          if (isAnswered) {
             const correctIdx = getCorrectIndex(currentQuestion);
             if (idx === correctIdx) {
               bg = 'rgba(16, 185, 129, 0.2)'; // أخضر
               border = '#10B981';
               icon = "check-circle";
             } else if (idx === selectedOption) {
               bg = 'rgba(239, 68, 68, 0.2)'; // أحمر
               border = '#EF4444';
               icon = "times-circle";
             } else {
               bg = '#1E293B'; // باهت
             }
          }

          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.8}
              disabled={isAnswered}
              onPress={() => handleOptionSelect(idx, opt)}
              style={[
                styles.optionBtn,
                { backgroundColor: bg, borderColor: border }
              ]}
            >
              <Text style={[
                styles.optionText, 
                isAnswered && idx === getCorrectIndex(currentQuestion) && { fontWeight: 'bold', color: '#10B981' }
              ]}>{opt}</Text>
              {icon && <FontAwesome5 name={icon} size={16} color={border} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Explanation & Next Button */}
      <AnimatePresence>
        {isAnswered && (
          <MotiView 
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={styles.feedbackContainer}
          >
            {/* شرح الإجابة */}
            <View style={styles.explanationBox}>
               <FontAwesome5 name="lightbulb" size={14} color="#FBBF24" style={{marginTop: 4}}/>
               <Text style={styles.explanationText}>
                 {currentQuestion.explanation || (selectedOption === getCorrectIndex(currentQuestion) ? "إجابة صحيحة!" : "للأسف إجابة خاطئة.")}
               </Text>
            </View>

            {/* زر التالي */}
            <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>
                {currentIndex < totalQuestions - 1 ? "السؤال التالي" : "إنهاء الاختبار"}
              </Text>
              <FontAwesome5 name={currentIndex < totalQuestions - 1 ? "arrow-left" : "check"} size={16} color="white" />
            </TouchableOpacity>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 10,
    width: '100%',
    overflow: 'hidden'
  },
  header: {
    marginBottom: 16,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  counterText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  progressBarBg: { width: '60%', height: 6, backgroundColor: '#0F172A', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#0EA5A4', borderRadius: 3 },
  
  questionText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 20,
    lineHeight: 26
  },
  optionsList: { gap: 10 },
  optionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  optionText: { color: '#E2E8F0', fontSize: 15, textAlign: 'right', flex: 1 },
  
  feedbackContainer: { marginTop: 20 },
  explanationBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row-reverse',
    gap: 8
  },
  explanationText: { color: '#FCD34D', fontSize: 13, textAlign: 'right', flex: 1, lineHeight: 20 },
  
  nextBtn: {
    backgroundColor: '#0EA5A4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#0EA5A4",
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4
  },
  nextBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  // Analyzing State Styles
  analyzingContainer: {
    width: '100%',
    padding: 40,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    overflow: 'hidden'
  },
  spinnerWrapper: {
    width: 80, height: 80, justifyContent: 'center', alignItems: 'center', marginBottom: 20
  },
  spinnerRing: {
    position: 'absolute', width: '100%', height: '100%', borderRadius: 40, borderWidth: 3, borderColor: '#10B981', borderStyle: 'dashed', opacity: 0.5
  },
  analyzingText: { color: '#10B981', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  scoreText: { color: '#94A3B8', fontSize: 13 }
});

export default GenQuiz;