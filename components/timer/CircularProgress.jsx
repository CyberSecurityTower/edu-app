
// components/timer/CircularProgress.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CIRCLE_DIAMETER = 280;
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_DIAMETER - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ✅ MODIFIED: Removed props for cycle indicators (currentCycle, totalCycles)
const CircularProgress = ({ duration, timeLeft, sessionType }) => {
  // Ensure progress is always between 0 and 1
  const progress = duration > 0 ? Math.max(0, Math.min(1, (duration - timeLeft) / duration)) : 0;
  
  const animatedProgress = useSharedValue(progress);
  // Use a shorter duration for smoother visual updates when timeLeft changes rapidly
  animatedProgress.value = withTiming(progress, { duration: 900 });

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - animatedProgress.value),
  }));

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  const gradientId = sessionType === 'focus' ? 'focusGradient' : 'breakGradient';
  const sessionDisplayName = sessionType === 'focus' ? 'Focus Session' : (sessionType === 'shortBreak' ? 'Short Break' : 'Long Break');

  return (
    <View style={styles.container}>
      <Svg width={CIRCLE_DIAMETER} height={CIRCLE_DIAMETER} viewBox={`0 0 ${CIRCLE_DIAMETER} ${CIRCLE_DIAMETER}`}>
        <Defs>
          <LinearGradient id="focusGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#10B981" />
            <Stop offset="100%" stopColor="#34D399" />
          </LinearGradient>
          <LinearGradient id="breakGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#3B82F6" />
            <Stop offset="100%" stopColor="#60A5FA" />
          </LinearGradient>
        </Defs>

        <Circle
          cx={CIRCLE_DIAMETER / 2}
          cy={CIRCLE_DIAMETER / 2}
          r={RADIUS}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={STROKE_WIDTH}
        />
        
        <AnimatedCircle
          cx={CIRCLE_DIAMETER / 2}
          cy={CIRCLE_DIAMETER / 2}
          r={RADIUS}
          stroke={`url(#${gradientId})`}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${CIRCLE_DIAMETER / 2} ${CIRCLE_DIAMETER / 2})`}
        />
      </Svg>
      <View style={styles.textContainer}>
        <Text style={styles.timerText}>{minutes}:{seconds}</Text>
        {/* ✅ REMOVED: The CycleIndicator component is now gone */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CIRCLE_DIAMETER,
    height: CIRCLE_DIAMETER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  timerText: {
    color: 'white',
    fontSize: 72, // Slightly larger for more impact
    fontWeight: '200', // Even lighter for a more elegant look
    fontVariant: ['tabular-nums'],
  },
});

export default CircularProgress;
