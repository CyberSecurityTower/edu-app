
import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ScreenCapture from 'expo-screen-capture';
import { useRouter } from 'expo-router';
import { SoundManager } from '../utils/SoundManager';
// 👇 استيراد أداة الأمان الجديدة
import { ArenaSecurity } from '../utils/ArenaSecurity';
import { ArenaService } from '../services/ArenaService';
import { useLanguage } from '../context/LanguageContext';
import { ARENA_TEXTS } from '../data/ArenaTranslations';
import { ArenaScoringSystem } from '../utils/ArenaScoringSystem'; 

export const GAME_STATE = {
  LOBBY: 'LOBBY',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  ANALYZING: 'ANALYZING',
  FINISHED: 'FINISHED'
};

export const useArenaGame = (externalData = null) => {
  const router = useRouter();
  const { language } = useLanguage();
  
  useEffect(() => {
    return () => { SoundManager.stopAllSounds(); };
  }, []);

  // --- Data Parsing ---
  const examData = externalData || {};
  const rawQuestions = examData.questions || [];
  
  const questions = rawQuestions
    .filter(q => q.type !== 'FILL_BLANKS' && q.widget_type !== 'FILL_BLANKS')
    .map(q => {
         const content = q.content || {}; 
      
      return {
          id: q.id,
          type: q.type || q.widget_type, // توحيد التسمية
          points: q.points || 10,
          
          // النصوص الأساسية
          text: content.text || q.text || "Question Text Missing",
          image: content.image || q.image || null,
          ghost_text: content.ghost_text || null,
          
          // 🔥 استخراج الشرح (Essential for the Modal)
          explanation: content.explanation || q.explanation || "No explanation provided.",

          // 🔥 الهاش الأمني (Essential for Validation)
          secure_hash: content.secure_hash || q.secure_hash,

          // بيانات الـ Widgets المختلفة
          options: content.options || [], // MCQ, MCM
          items: content.items || [],     // ORDERING
          left_items: content.left_items || [], // MATCHING
          right_items: content.right_items || [], // MATCHING
      };
  });

  const lessonId = examData.lessonId || examData.examId; 

  // ... (نفس الـ States السابقة) ...
  const [gameState, setGameState] = useState(GAME_STATE.LOBBY);
  const [countdown, setCountdown] = useState(3);
  const [currentIndex, setCurrentIndex] = useState(0);
  const userAnswersRef = useRef([]); 
  const [serverResult, setServerResult] = useState(null);
  const [correctCount, setCorrectCount] = useState(0); 
  const maxPossibleScore = useRef(0);
  
  useEffect(() => {
    if (questions.length > 0) {
      maxPossibleScore.current = questions.reduce((acc, q) => acc + (q.points || 10), 0);
    }
  }, [questions]);

  const [isDisqualified, setIsDisqualified] = useState(false);
  const [disqualificationReason, setDisqualificationReason] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationData, setExplanationData] = useState({});
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const isProcessing = useRef(false);
  const submitPromiseRef = useRef(null); 
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);

  useEffect(() => {
    const prepareGame = async () => {
        try { await SoundManager.loadSounds(); setIsAssetsLoaded(true); } catch (e) { setIsAssetsLoaded(true); }
    };
    prepareGame();
  }, []);

  const startGame = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setGameState(GAME_STATE.COUNTDOWN);
    setCountdown(3); 
    const timer = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount <= 1) {
          clearInterval(timer);
          setGameState(GAME_STATE.PLAYING);
          return 0;
        }
        Haptics.selectionAsync(); 
        return prevCount - 1;
      });
    }, 1000);
  };

  const manualStopTimer = useCallback(() => { setIsTimerPaused(true); }, []); 

  // 🔥🔥🔥 The Updated Handler Logic 🔥🔥🔥
  const handleAnswer = (userAnswer, isTimeout = false) => {
    // 1. شروط الخروج المبكر
    if (gameState === GAME_STATE.FINISHED || isDisqualified) return;
    if (!currentQuestion) return; 
    
    // منع الإجابات المتعددة السريعة (Debounce)
    if (isProcessing.current && !isTimeout) return;
    
    // 2. إيقاف العداد والصوت فوراً
    SoundManager.stopSound('tick');
    if (!isTimeout) isProcessing.current = true;

    // 3. التحقق من الإجابة محلياً
    let isCorrect = false;

    if (isTimeout) {
        // انتهى الوقت = خطأ دائماً
        isCorrect = false;
    } else {
        // التحقق عبر التشفير
        isCorrect = ArenaSecurity.validateAnswer(
            userAnswer, 
            currentQuestion.secure_hash, 
            currentQuestion.type
        );
    }

    // 4. تسجيل النتيجة
    // إضافة الإجابة للمصفوفة للإرسال لاحقاً
    userAnswersRef.current.push({
        questionId: currentQuestion.id,
        answer: userAnswer
    });

    if (isCorrect) {
        setCorrectCount(prev => prev + 1); 
    }

    // 5. التعامل مع التفاعل (Feedback)
    // هنا نفصل المسارين تماماً: إما صح وإما خطأ
    if (isCorrect) {
        // ✅ مسار الإجابة الصحيحة
        if (!isTimeout) {
            // تشغيل صوت النجاح فقط
            SoundManager.playSound('correct_tone');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // الانتقال للسؤال التالي
        const isLast = currentIndex === totalQuestions - 1;
        if (isLast) submitExamInBackground();

        setTimeout(() => {
            if (isLast) finalizeGame(); 
            else moveToNextQuestion();
        }, 800);

    } else {
        // ❌ مسار الإجابة الخاطئة
        if (!isTimeout) {
            // تشغيل صوت الخطأ فقط
            SoundManager.playSound('error_tone');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
// 🔥 الخطوة الحاسمة: فك التشفير هنا للحصول على الإجابة الصحيحة الخام
        const decryptedCorrectAnswer = ArenaSecurity.decryptAnswer(currentQuestion.secure_hash);

        setExplanationData({
            type: currentQuestion.type,
            
            explanation: currentQuestion.explanation, 
            
            correct: ArenaScoringSystem.getCorrectAnswerText(
                currentQuestion, 
                decryptedCorrectAnswer,
                language
            ),
            
            // إجابة المستخدم
            userChoice: ArenaScoringSystem.getUserAnswerText(
                currentQuestion, 
                userAnswer, 
                language
            )
        });
        
        setShowExplanation(true);
    }
  };

  const submitExamInBackground = () => {
      if (submitPromiseRef.current) return; 
      const payload = { lessonId: lessonId, answers: userAnswersRef.current };
      submitPromiseRef.current = ArenaService.submitExam(payload)
          .then(data => data.result ? data.result : data)
          .catch(err => ({ error: true, msg: err.message }));
  };

  const moveToNextQuestion = () => {
    setShowExplanation(false);
    setIsTimerPaused(false);
    if (currentIndex < totalQuestions - 1) {
      isProcessing.current = false; 
      setCurrentIndex(prev => prev + 1);
    } else {
      finalizeGame();
    }
  };

  const finalizeGame = async () => {
      SoundManager.stopSound('tick');
      setShowExplanation(false);
      setGameState(GAME_STATE.ANALYZING); 

      if (!submitPromiseRef.current) submitExamInBackground();

     
      try {
          const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 8000));
          const result = await Promise.race([submitPromiseRef.current, timeoutPromise]);

          if (result.timeout) {
              console.warn("Submit Timed Out - Using Local Results");
              
              // 🔥 حساب النتيجة المحلية من 20
              let localScore = 0;
              if (totalQuestions > 0) {
                  localScore = (correctCount / totalQuestions) * 20;
              }
              // تقريب لأقرب 0.5
              localScore = Math.round(localScore * 2) / 2;

              setServerResult({
                  score: localScore, 
                  maxScore: 20, // دائماً 20
                  percentage: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
              });
              setGameState(GAME_STATE.FINISHED);

          } else if (result && !result.error) {
              // النتيجة جاءت من السيرفر سليمة
              setServerResult(result);
              setGameState(GAME_STATE.FINISHED);
          } else {
              // حالة خطأ من السيرفر - نستخدم الحساب المحلي
              let localScore = 0;
              if (totalQuestions > 0) {
                  localScore = (correctCount / totalQuestions) * 20;
              }
              localScore = Math.round(localScore * 2) / 2;

              setServerResult({
                  score: localScore,
                  maxScore: 20,
                  percentage: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
              });
              setGameState(GAME_STATE.FINISHED);
          }
      } catch (e) {
          // حالة خطأ شامل - نستخدم الحساب المحلي
          let localScore = 0;
          if (totalQuestions > 0) {
              localScore = (correctCount / totalQuestions) * 20;
          }
          localScore = Math.round(localScore * 2) / 2;

          setServerResult({
             score: localScore,
             maxScore: 20,
             percentage: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
          });
          setGameState(GAME_STATE.FINISHED);
      }
      
      await ScreenCapture.allowScreenCaptureAsync();
  };
  const quitGame = () => {
      SoundManager.stopAllSounds();
      router.back();
  };

  const retryGame = async () => {
    await SoundManager.stopAllSounds();
    setGameState(GAME_STATE.LOBBY);
    setCurrentIndex(0);
    setCorrectCount(0);
    userAnswersRef.current = []; 
    submitPromiseRef.current = null;
    setServerResult(null);
    setIsDisqualified(false);
    setDisqualificationReason(null);
    isProcessing.current = false;
    setIsTimerPaused(false);
    setShowExplanation(false);
  };

  return {
    gameState, countdown, currentIndex, currentQuestion, totalQuestions,
    correctCount, isDisqualified, disqualificationReason,
    showExplanation, explanationData, showExitWarning, setShowExitWarning,
    maxPossibleScore: maxPossibleScore.current, 
    isTimerPaused, isAssetsLoaded, serverResult, 
    isProcessing: isProcessing.current || isTimerPaused,
    startGame, handleAnswer, manualStopTimer,
    moveToNextQuestion, retryGame, quitGame, updateTempAnswer: () => {}
  };
};