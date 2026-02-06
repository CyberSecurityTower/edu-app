
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, StatusBar, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, FadeOut, ZoomIn, SlideInDown
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

// --- Logic ---
import { useArenaGame, GAME_STATE } from '../../hooks/useArenaGame';
import { ArenaService } from '../../services/ArenaService';
import { useLanguage } from '../../context/LanguageContext';
import { ARENA_TEXTS } from '../../data/ArenaTranslations';

// --- Widgets (تم حذف FillBlanks) ---
import { MCMWidget } from '../../components/ArenaWidgets/MCMWidget';
import { OrderingWidget } from '../../components/ArenaWidgets/OrderingWidget';
import { GhostText } from '../../components/ArenaWidgets/GhostText';
import { MCQWidget } from '../../components/ArenaWidgets/MCQWidget';
import { TrueFalseWidget } from '../../components/ArenaWidgets/TrueFalseWidget';
import { MatchingWidget } from '../../components/ArenaWidgets/MatchingWidget';
import { SoundManager } from '../../utils/SoundManager';

// --- Components ---
import { ArenaRules } from '../../components/Arena/ArenaRules';
import ExitWarningModal from '../../components/Arena/ExitWarningModal';
import ArenaLobby from '../../components/Arena/ArenaLobby';
import { ArenaResultScreen } from '../../components/Arena/ArenaResultScreen';
import { ExplanationModal } from '../../components/Arena/ExplanationModal';
import { ArenaTimer } from '../../components/Arena/ArenaTimer';

const SCREEN_PHASE = {
  RULES: 'RULES',
  LOADING: 'LOADING',
  ERROR: 'ERROR',
  GAME: 'GAME'
};

const TacticalImageView = ({ uri }) => {
  const [loading, setLoading] = useState(true);
  return (
    <Animated.View entering={ZoomIn.duration(500)} style={styles.imageWrapper}>
      <BlurView intensity={20} tint="dark" style={styles.imageGlass}>
        {loading && (
          <View style={styles.imageLoader}>
            <ActivityIndicator color="#38BDF8" size="small" />
          </View>
        )}
        <Image source={{ uri }} style={styles.tacticalImage} resizeMode="cover" onLoadEnd={() => setLoading(false)} />
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
      </BlurView>
    </Animated.View>
  );
};

export default function ArenaScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { language, isRTL } = useLanguage();
  const t = ARENA_TEXTS[language] || ARENA_TEXTS.en;

  const [screenPhase, setScreenPhase] = useState(SCREEN_PHASE.RULES);
  const [loadingError, setLoadingError] = useState(null);
  const [fetchedExamData, setFetchedExamData] = useState(null);
  const isIntentionalExit = useRef(false);

  const fadeAnim = useSharedValue(1); 
  useEffect(() => { fadeAnim.value = withTiming(0, { duration: 1500 }); }, []);
  const fadeOverlayStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));

  const {
    gameState, countdown, currentIndex, currentQuestion, totalQuestions,
    correctCount, isDisqualified, showExplanation, explanationData,
    showExitWarning, setShowExitWarning, isProcessing, updateTempAnswer,
    startGame, handleAnswer, moveToNextQuestion,
    retryGame, quitGame, manualStopTimer, isTimerPaused, maxPossibleScore, serverResult 
  } = useArenaGame(fetchedExamData);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (
        screenPhase === SCREEN_PHASE.RULES ||
        screenPhase === SCREEN_PHASE.ERROR ||
        gameState === GAME_STATE.LOBBY ||
        gameState === GAME_STATE.FINISHED ||
        isIntentionalExit.current === true
      ) {
        return;
      }
      e.preventDefault();
      setShowExitWarning(true);
    });
    return unsubscribe;
  }, [navigation, gameState, setShowExitWarning, screenPhase]);

  const progress = useSharedValue(0);
  const progressAnimatedStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  useEffect(() => {
    if (gameState === GAME_STATE.LOBBY) {
      progress.value = 0;
    } else {
      const total = totalQuestions || 1;
      progress.value = withTiming(((currentIndex + 1) / total) * 100);
    }
  }, [currentIndex, totalQuestions, gameState]);
 // 👇 تعديل دالة إعادة المحاولة لتجلب البيانات من جديد
  const handleRetryFull = async () => {
    // 1. تنظيف الحالة الداخلية للعبة
    await retryGame(); 
    
    // 2. مسح البيانات القديمة وإظهار شاشة التحميل
    setFetchedExamData(null);
    setScreenPhase(SCREEN_PHASE.LOADING);
    
    // 3. طلب البيانات من السيرفر مجدداً (امتحان جديد)
    handleRulesAccepted(); 
  };

  // 👇 دالة الانتقال لصفحة تفاصيل المادة
  
    const handleNextLesson = () => {
    SoundManager.stopAllSounds();

    // السيناريو: نحن في Arena، وقبلها LessonView، وقبلها SubjectDetails.
    // نريد العودة إلى SubjectDetails.
    // router.dismiss(2) سيقوم بإغلاق Arena (1) و LessonView (2).
    
    if (router.canDismiss()) {
        router.dismiss(2); 
    } else {
        // كحل احتياطي في حال كان الستاك غير مرتب كما نتوقع
        // نستخدم navigate للذهاب للمادة، وهذا في Expo Router غالباً 
        // يعيدنا للشاشة الموجودة في الخلفية بدلاً من فتح واحدة جديدة
        const targetSubjectId = fetchedExamData?.subjectId || params.subjectId;
        if (targetSubjectId) {
            router.navigate({
                pathname: '/subject-details',
                params: { id: targetSubjectId }
            });
        } else {
            router.replace('/'); // العودة للرئيسية كحل أخير
        }
    }
  };

  const handleRulesAccepted = async () => {
    setScreenPhase(SCREEN_PHASE.LOADING);
    setLoadingError(null);
    try {
      const data = await ArenaService.fetchExamSession(params.lessonId);
      console.log("📥 Fetched Exam Data:", data); 
      setFetchedExamData(data);
      setTimeout(() => { setScreenPhase(SCREEN_PHASE.GAME); }, 800);
    } catch (error) {
      let msg = "Connection lost. Tactical link failed.";
      if (error.message === "TIMEOUT_EXCEEDED") msg = "Server unresponsive. Check connection.";
      setLoadingError(msg);
      setScreenPhase(SCREEN_PHASE.ERROR);
    }
  };

  const handleConfirmQuit = () => {
    isIntentionalExit.current = true;
    quitGame();
  };

  const renderGameArea = () => {
    if (!currentQuestion) return null;
    const duration = fetchedExamData?.time_limit_per_question || 15;

    return (
      <SafeAreaView style={styles.gameContainer}>
        {/* Header */}
        <View style={[styles.gameHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity onPress={() => setShowExitWarning(true)} style={styles.closeButtonSmall}>
            <FontAwesome5 name="times" size={16} color="#64748B" />
          </TouchableOpacity>
          <ArenaTimer
            key={currentIndex}
            duration={duration}
            isRunning={!showExplanation && !showExitWarning && !isDisqualified && !isProcessing && !isTimerPaused}
            onTimeout={() => handleAnswer(null, true)}
          />
          <View style={[styles.streakContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.streakText}>{(currentIndex + 1)}/{totalQuestions}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
        </View>

        <View style={styles.questionArea}>
          <Animated.View
            key={currentIndex}
            entering={SlideInDown.springify().damping(20).mass(0.8)}
            style={{ flex: 1 }}
          >
            {/* 🔥 تعديل: إزالة الـ XP Tag */}
            <View style={[styles.qMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.qCount}>{t.game.question_label} {currentIndex + 1}</Text>
              {/* تم حذف عنصر الـ XP من هنا */}
            </View>

            {currentQuestion.image && <TacticalImageView uri={currentQuestion.image} />}
            
            {/* عرض النص فقط إذا كان موجوداً */}
            {currentQuestion.text ? (
                <Text style={[styles.qText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {currentQuestion.text}
                </Text>
            ) : null}

            <GhostText text={currentQuestion.ghost_text} />

            <View style={styles.widgetWrapper}>
               {/* ... (نفس الويدجت السابقة) ... */}
               {currentQuestion.type === 'MCQ' && (
                <MCQWidget question={currentQuestion} onAnswer={handleAnswer} />
              )}
              {(currentQuestion.type === 'TRUE_FALSE' || currentQuestion.type === 'YES_NO') && (
                <TrueFalseWidget question={currentQuestion} questionType={currentQuestion.type} onAnswer={handleAnswer} />
              )}
              {currentQuestion.type === 'MCM' && (
                <MCMWidget question={currentQuestion} onAnswer={handleAnswer} />
              )}
              {currentQuestion.type === 'ORDERING' && (
                <OrderingWidget question={currentQuestion} onAnswer={handleAnswer} />
              )}
              {currentQuestion.type === 'MATCHING' && (
                <MatchingWidget
                  question={currentQuestion}
                  onAnswer={handleAnswer}
                  onUpdate={updateTempAnswer}
                  onStopTimer={manualStopTimer}
                />
              )}
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {screenPhase === SCREEN_PHASE.RULES && (
        <ArenaRules onAccept={handleRulesAccepted} onCancel={() => router.back()} />
      )}

      {screenPhase === SCREEN_PHASE.LOADING && (
          <View style={[styles.fullScreen, styles.centerContent]}>
            <View style={{ width: 150, height: 150 }}>
              <LottieView source={require('../../assets/images/get_exam.json')} autoPlay loop style={{ flex: 1 }} />
            </View>
            <Text style={styles.loadingText}>{t.status.loading_title}</Text>
          </View>
      )}

      {screenPhase === SCREEN_PHASE.ERROR && (
          <View style={[styles.fullScreen, styles.centerContent]}>
            <FontAwesome5 name="wifi" size={40} color="#EF4444" style={{ marginBottom: 20 }} />
            <Text style={styles.errorText}>{t.status.error_title}</Text>
            <Text style={styles.errorSubText}>{loadingError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRulesAccepted}>
               <Text style={styles.retryText}>{t.status.btn_retry_connection}</Text>
            </TouchableOpacity>
          </View>
      )}

      {screenPhase === SCREEN_PHASE.GAME && fetchedExamData && (
        <>
          {gameState === GAME_STATE.LOBBY && (
            <ArenaLobby 
                title={fetchedExamData.title || "TACTICAL ARENA"} 
                questionDuration={fetchedExamData.time_limit_per_question || 15}
                onStart={startGame} 
                onBack={() => router.back()} 
            />
          )}

          {gameState === GAME_STATE.COUNTDOWN && (
            <View style={[styles.fullScreen, styles.centerContent]}>
              <Animated.Text entering={ZoomIn.springify()} exiting={FadeOut} style={styles.countdownText}>
                {countdown}
              </Animated.Text>
              <Text style={styles.countdownLabel}>{t.game.get_ready}</Text>
            </View>
          )}

          {gameState === GAME_STATE.PLAYING && (
            <>
              {renderGameArea()}
              <ExplanationModal
                visible={showExplanation}
                type={explanationData.type}
                userAnswer={explanationData.userChoice}
                correctAnswer={explanationData.correct}
                explanation={explanationData.explanation} 
                onNext={moveToNextQuestion}
              />
            </>
          )}

          {gameState === GAME_STATE.ANALYZING && (
              <View style={[styles.fullScreen, styles.centerContent]}>
                <LottieView source={require('../../assets/images/exam_analyzing.json')} autoPlay loop style={{ width: 200, height: 200 }} />
                <Text style={styles.loadingText}>ANALYZING...</Text>
              </View>
          )}

              {gameState === GAME_STATE.FINISHED && (
            <ArenaResultScreen
              serverData={serverResult} 
              score={serverResult ? serverResult.score : correctCount}
              maxScore={serverResult ? serverResult.maxScore : maxPossibleScore} 
              isDisqualified={isDisqualified}
              onRetry={handleRetryFull}   
              onReturn={() => router.back()}
              onNextLesson={handleNextLesson}
            />
          )}

          <ExitWarningModal
            visible={showExitWarning}
            onCancel={() => setShowExitWarning(false)}
            onConfirm={handleConfirmQuit}
          />
        </>
      )}
      
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'black', zIndex: 10000 }, fadeOverlayStyle]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  fullScreen: { flex: 1, backgroundColor: '#0B1220' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#38BDF8', fontSize: 16, fontWeight: '800', letterSpacing: 2, marginTop: 20 },
  errorText: { color: '#EF4444', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  errorSubText: { color: '#94A3B8', marginTop: 8, marginBottom: 30 },
  retryBtn: { alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: 'white', fontWeight: '700' },
  
  gameContainer: { flex: 1, backgroundColor: '#0B1220' },
  gameHeader: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  closeButtonSmall: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  streakContainer: { alignItems: 'center' },
  streakText: { color: '#94A3B8', fontWeight: 'bold' },
  progressTrack: { height: 4, backgroundColor: '#1E293B', marginTop: 10 },
  progressFill: { height: '100%', backgroundColor: '#38BDF8' },

  // 🔥 تعديل: إضافة paddingTop لإنزال الأسئلة للأسفل
  questionArea: { flex: 1, padding: 24, paddingTop: 90 }, 
  
  qMetaRow: { justifyContent: 'space-between', marginBottom: 16 },
  qCount: { color: '#64748B', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  qText: { color: '#F1F5F9', fontSize: 22, fontWeight: '600', lineHeight: 32, marginBottom: 20 },
  widgetWrapper: { flex: 1, justifyContent: 'center' },

  countdownText: { fontSize: 100, color: '#38BDF8', fontWeight: '900' },
  countdownLabel: { color: '#64748B', letterSpacing: 4, marginTop: 20, fontSize: 14 },
  imageWrapper: { width: '100%', height: 200, marginBottom: 24, borderRadius: 16, overflow: 'hidden', borderColor: 'rgba(56, 189, 248, 0.2)', borderWidth: 1 },
  imageGlass: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  tacticalImage: { width: '100%', height: '100%', borderRadius: 16 },
  imageLoader: { position: 'absolute', zIndex: 1 },
  corner: { position: 'absolute', width: 15, height: 15, borderColor: '#38BDF8', borderWidth: 2, opacity: 0.8 },
  tl: { top: 10, left: 10, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 10, right: 10, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 10, left: 10, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 10, right: 10, borderLeftWidth: 0, borderTopWidth: 0 },
});