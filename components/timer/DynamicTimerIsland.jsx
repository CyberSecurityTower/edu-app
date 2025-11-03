
// components/timer/DynamicTimerIsland.jsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, AccessibilityInfo, Dimensions } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppState } from '../../context/AppStateContext';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import MiniCircularProgress from './MiniCircularProgress';
import ActionButton from './ActionButton';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { audioService } from '../../services/audioService';

const { height: screenHeight } = Dimensions.get('window');
const ANIMATION_CONFIG = { mainSpring: { damping: 22, stiffness: 350 }, pressSpring: { damping: 15, stiffness: 500, mass: 0.5 }, longPressDuration: 300 };
const CONSTANTS = { COMPACT_HEIGHT: 50, EXPANDED_HEIGHT: 92, SAFE_AREA_TOP_MARGIN: 10 };

// ✅ NEW: Expanded ICONS object with new colors and a 'finished' state.
const ICONS = {
  focus: { name: 'brain', color: '#34D399' }, // Green
  shortBreak: { name: 'coffee', color: '#60A5FA' }, // Blue
  longBreak: { name: 'couch', color: '#FBBF24' }, // Yellow
  finished: { name: 'check-circle', color: '#A78BFA' }, // Purple
  default: { name: 'brain', color: '#34D399' }
};

const TimerDisplay = React.memo(React.forwardRef(({ timeLeft, status, reduceMotion, isExpanded, isFlashing, showDoneMessage }, ref) => {
  // ✅ NEW: Logic for the "finished" state display
  if (status === 'finished') {
    if (showDoneMessage) {
      return <Text style={styles.doneText}>You're done!</Text>;
    }
    return <Text style={[isExpanded ? styles.expandedTimerText : styles.timerText, { opacity: isFlashing ? 1 : 0.4 }]}>00:00</Text>;
  }

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');
  const textStyle = isExpanded ? styles.expandedTimerText : styles.timerText;
  
  return (
    <View style={isExpanded ? styles.expandedRight : styles.timerContainer}>
      <Text style={textStyle} selectable={false}>{minutes}:{seconds}</Text>
      {status === 'paused'
        ? <FontAwesome5 name="pause-circle" size={isExpanded ? 30 : 24} color="#F59E0B" style={isExpanded ? styles.pauseIconExpanded : styles.pauseIcon} />
        : (!reduceMotion && <LottieView ref={ref} source={require('../../assets/images/clock-running.json')} autoPlay loop style={isExpanded ? styles.lottieClockExpanded : styles.lottieClock} />)
      }
    </View>
  );
}));
TimerDisplay.displayName = 'TimerDisplay';


function DynamicTimerIslandInner() {
  const router = useRouter();
  const { timerSession, timeLeft, pauseTimer, resumeTimer, endTimer } = useAppState();
  const insets = useSafeAreaInsets();

  const [isExpanded, setIsExpanded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // ✅ NEW: State for the "finished" animation
  const [isFlashing, setIsFlashing] = useState(true);
  const [showDoneMessage, setShowDoneMessage] = useState(false);

  const compactLottieRef = useRef(null);
  const expandedLottieRef = useRef(null);
  const expansion = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const transitionProgress = useSharedValue(0);

  const { duration, taskTitle, status, sessionType, currentCycle } = timerSession || {};

  // ✅ NEW: Effect to handle the "finished" state animation
  useEffect(() => {
    let flashInterval;
    let doneMessageTimeout;
    let endTimerTimeout;

    if (status === 'finished') {
      setIsExpanded(true); // Force expand to show the animation
      // 1. Start flashing
      flashInterval = setInterval(() => {
        setIsFlashing(prev => !prev);
      }, 500);

      // 2. After 4 seconds, stop flashing and show "You're done"
      doneMessageTimeout = setTimeout(() => {
        clearInterval(flashInterval);
        setIsFlashing(false);
        setShowDoneMessage(true);
      }, 4000);

      // 3. After 5 seconds total, call endTimer to reset and hide the island
      endTimerTimeout = setTimeout(() => {
        endTimer();
      }, 5000);
    }

    // Cleanup function
    return () => {
      clearInterval(flashInterval);
      clearTimeout(doneMessageTimeout);
      clearTimeout(endTimerTimeout);
      // Reset animation state if status changes from 'finished'
      if (status === 'finished') {
        setIsFlashing(true);
        setShowDoneMessage(false);
      }
    };
  }, [status, endTimer]);


  useEffect(() => { expansion.value = withSpring(isExpanded ? 1 : 0, ANIMATION_CONFIG.mainSpring); }, [isExpanded]);
  useEffect(() => {
    const checkReduceMotion = (v) => setReduceMotion(!!v);
    AccessibilityInfo.isReduceMotionEnabled?.().then(checkReduceMotion);
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', checkReduceMotion);
    return () => subscription?.remove();
  }, []);
  useEffect(() => {
    if (status === 'active' && !reduceMotion) {
      compactLottieRef.current?.play();
      expandedLottieRef.current?.play();
    } else {
      compactLottieRef.current?.reset();
      expandedLottieRef.current?.reset();
    }
  }, [status, reduceMotion]);

  const triggerHaptic = useCallback((style = Haptics.ImpactFeedbackStyle.Light) => { if (!reduceMotion) Haptics.impactAsync(style).catch(() => {}); }, [reduceMotion]);

  const handlePress = useCallback(() => {
    if (isTransitioning || status === 'finished') return;
    if (!isExpanded) triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setIsExpanded((p) => !p);
  }, [isExpanded, isTransitioning, triggerHaptic, status]);

  const handleLongPress = useCallback(() => {
    if (isTransitioning || status === 'finished') return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    setIsTransitioning(true);
    transitionProgress.value = withTiming(1, { duration: ANIMATION_CONFIG.longPressDuration, easing: Easing.inOut(Easing.ease) });
    setTimeout(() => {
      router.push({ pathname: '/(modals)/study-timer' });
      setTimeout(() => {
        transitionProgress.value = 0;
        setIsTransitioning(false);
      }, 240);
    }, ANIMATION_CONFIG.longPressDuration);
  }, [router, transitionProgress, triggerHaptic, isTransitioning, status]);

  const handleTogglePause = useCallback(() => { triggerHaptic(); if (status === 'active') pauseTimer(); else if (status === 'paused') resumeTimer(); }, [status, triggerHaptic, pauseTimer, resumeTimer]);
  const handleEndSession = useCallback(() => { triggerHaptic(); setIsExpanded(false); setTimeout(endTimer, 260); }, [triggerHaptic, endTimer]);
  
  const progress = useMemo(() => {
    if (status === 'finished') return 1; // Full circle when finished
    return duration > 0 ? (duration - timeLeft) / duration : 0;
  }, [duration, timeLeft, status]);
  
  const iconConfig = useMemo(() => ICONS[status === 'finished' ? 'finished' : sessionType] || ICONS.default, [sessionType, status]);
  const SAFE_TOP = Math.max(8, insets.top || 0) + CONSTANTS.SAFE_AREA_TOP_MARGIN;

  const animatedContainerStyle = useAnimatedStyle(() => ({ height: CONSTANTS.COMPACT_HEIGHT + expansion.value * (CONSTANTS.EXPANDED_HEIGHT - CONSTANTS.COMPACT_HEIGHT), transform: [{ scale: pressScale.value }], width: `${94 + (100 - 94) * transitionProgress.value}%` }), []);
  const animatedTransitionStyle = useAnimatedStyle(() => { const currentIslandHeight = CONSTANTS.COMPACT_HEIGHT + expansion.value * (CONSTANTS.EXPANDED_HEIGHT - CONSTANTS.COMPACT_HEIGHT); return { top: SAFE_TOP - (SAFE_TOP * transitionProgress.value), height: currentIslandHeight + (screenHeight - currentIslandHeight) * transitionProgress.value }; }, [SAFE_TOP]);
  const animatedInnerContainerStyle = useAnimatedStyle(() => ({ borderRadius: 50 * (1 - transitionProgress.value) }), []);
  const animatedCompactStyle = useAnimatedStyle(() => ({ opacity: 1 - expansion.value, transform: [{ translateY: -expansion.value * 6 }] }), []);
  const animatedExpandedStyle = useAnimatedStyle(() => ({ opacity: expansion.value, transform: [{ translateY: (1 - expansion.value) * 4 }] }), []);
  const onPressIn = useCallback(() => { pressScale.value = withSpring(0.97, ANIMATION_CONFIG.pressSpring); }, []);
  const onPressOut = useCallback(() => { pressScale.value = withSpring(1, ANIMATION_CONFIG.pressSpring); }, []);
  
  useEffect(() => {
    const soundId = timerSession?.selectedSound || null;
    if (status === 'active') audioService.resumeSessionSound?.() ?? audioService.playSessionSound?.(soundId);
    else if (status === 'paused') audioService.pauseSessionSound?.();
    else if (status === 'idle' || status === 'finished') audioService.stopSessionSound?.();
  }, [status, timerSession?.selectedSound]);

  const displayTitle = status === 'finished' ? 'Cycle Complete!' : (sessionType === 'focus' ? (taskTitle || 'Focus') : (sessionType === 'shortBreak' ? 'Short Break' : 'Long Break'));

  // ✅ THE FIX: Using a key to force re-animation on session change.
  return (
    <MotiView 
      key={`${sessionType}-${currentCycle}-${status}`}
      style={styles.mainContainer} 
      pointerEvents="box-none" 
      from={{ opacity: 0, scale: 0.9, translateY: -20 }} 
      animate={{ opacity: 1, scale: 1, translateY: 0 }} 
      exit={{ opacity: 0, scale: 0.85, translateY: -30 }}
      transition={{ type: 'spring', duration: 400 }}
    >
      <AnimatePresence>{isExpanded && !isTransitioning && (<MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={StyleSheet.absoluteFill}><Pressable style={StyleSheet.absoluteFill} onPress={handlePress}><BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} /></Pressable></MotiView>)}</AnimatePresence>
      <Animated.View style={[styles.contentPositioner, animatedTransitionStyle]} pointerEvents="box-none">
        <Animated.View style={[styles.container, animatedContainerStyle, animatedInnerContainerStyle]}>
          <Pressable onPress={handlePress} onLongPress={handleLongPress} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.pressableArea} disabled={isTransitioning}>
            <Animated.View style={[styles.contentWrapper, animatedCompactStyle]} pointerEvents={isExpanded ? 'none' : 'auto'}>
              <View style={styles.compactView}>
                <MiniCircularProgress progress={progress} size={28} strokeWidth={3} progressColor={iconConfig.color} iconName={iconConfig.name} iconColor="white" iconSize={14} animationDuration={1000} />
                <Text style={styles.taskText} numberOfLines={1}>{displayTitle}</Text>
                <TimerDisplay ref={compactLottieRef} timeLeft={timeLeft} status={status} reduceMotion={reduceMotion} isExpanded={false} isFlashing={isFlashing} showDoneMessage={showDoneMessage} />
              </View>
            </Animated.View>
            <Animated.View style={[styles.contentWrapper, animatedExpandedStyle]} pointerEvents={isExpanded ? 'auto' : 'none'}>
              <View style={styles.expandedView}>
                <View style={styles.expandedLeft}><Text style={styles.expandedTaskText} numberOfLines={1}>{displayTitle}</Text></View>
                <View style={styles.expandedRightContainer}>
                  <MiniCircularProgress progress={progress} progressColor={iconConfig.color} iconName={iconConfig.name} iconColor="white" iconSize={16} />
                  <TimerDisplay ref={expandedLottieRef} timeLeft={timeLeft} status={status} reduceMotion={reduceMotion} isExpanded={true} isFlashing={isFlashing} showDoneMessage={showDoneMessage} />
                </View>
              </View>
            </Animated.View>
          </Pressable>
        </Animated.View>
        <AnimatePresence>{isExpanded && !isTransitioning && status !== 'finished' && (<MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} exit={{ opacity: 0, translateY: 10 }} style={styles.externalControlsContainer}><ActionButton onPress={handleEndSession} iconName="stop" iconSize={18} iconColor="#F87171" /><ActionButton onPress={handleTogglePause} iconName={status === 'paused' ? 'play' : 'pause'} iconSize={24} iconColor="white" style={styles.mainExternalControlButton} /><ActionButton onPress={() => {}} iconName="forward" iconSize={18} iconColor="#38BDF8" /></MotiView>)}</AnimatePresence>
      </Animated.View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  contentPositioner: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  container: { backgroundColor: '#1C1C1E', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 15, width: '94%', alignSelf: 'center', overflow: 'hidden' },
  pressableArea: { flex: 1, justifyContent: 'center' },
  contentWrapper: { ...StyleSheet.absoluteFillObject, justifyContent: 'center' },
  compactView: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  taskText: { flex: 1, color: 'white', fontSize: 15, fontWeight: '600', marginLeft: 12, marginRight: 8 },
  timerText: { color: 'white', fontSize: 16, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  expandedView: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  expandedLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  expandedTaskText: { color: 'white', fontSize: 18, fontWeight: '700', flexShrink: 1 },
  expandedRightContainer: { flexDirection: 'row', alignItems: 'center' },
  expandedRight: { flexDirection: 'row', alignItems: 'center' },
  expandedTimerText: { color: 'white', fontSize: 20, fontWeight: 'bold', fontVariant: ['tabular-nums'], marginLeft: 12 },
  externalControlsContainer: { flexDirection: 'row', marginTop: 16, gap: 12, alignItems: 'center' },
  mainExternalControlButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#007AFF' },
  timerContainer: { flexDirection: 'row', alignItems: 'center' },
  lottieClock: { width: 34, height: 34, marginLeft: 6 },
  lottieClockExpanded: { width: 44, height: 44, marginLeft: 8 },
  pauseIcon: { marginLeft: 8 },
  pauseIconExpanded: { marginLeft: 12 },
  doneText: { color: '#A78BFA', fontSize: 18, fontWeight: 'bold' },
});

const DynamicTimerIsland = React.memo(DynamicTimerIslandInner);
DynamicTimerIsland.displayName = 'DynamicTimerIsland';
export default DynamicTimerIsland;