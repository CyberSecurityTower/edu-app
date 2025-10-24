// components/TasksHeader.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { MotiView, MotiText } from 'moti';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const TasksHeader = ({ progress, completedCount, totalCount }) => {
  const CIRCLE_LENGTH = 300; // 2 * Math.PI * 50
  const R = CIRCLE_LENGTH / (2 * Math.PI);

  const animatedProgress = useSharedValue(progress);
  animatedProgress.value = withTiming(progress, { duration: 700 });
  
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCLE_LENGTH * (1 - animatedProgress.value),
  }));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning!";
    if (hour < 18) return "Good Afternoon!";
    return "Good Evening!";
  };
  
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <MotiText from={{ opacity: 0, translateX: -20 }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: 'timing', duration: 400 }} style={styles.greeting}>{getGreeting()}</MotiText>
        <MotiText from={{ opacity: 0, translateX: -20 }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: 'timing', duration: 400, delay: 100 }} style={styles.date}>{today}</MotiText>
        <MotiText from={{ opacity: 0, translateX: -20 }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: 'timing', duration: 400, delay: 200 }} style={styles.progressText}>
          {totalCount > 0 ? `Completed ${completedCount} of ${totalCount} tasks` : 'Let\'s be productive!'}
        </MotiText>
      </View>
      <MotiView from={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 500 }} style={styles.progressContainer}>
        <Svg width="120" height="120" viewBox="0 0 120 120">
          <Circle cx="60" cy="60" r={R} stroke="#374151" strokeWidth="10" />
          <AnimatedCircle cx="60" cy="60" r={R} stroke="#34D399" strokeWidth="10" strokeDasharray={CIRCLE_LENGTH} animatedProps={animatedProps} strokeLinecap="round" transform="rotate(-90 60 60)" />
        </Svg>
        <Text style={styles.progressPercentage}>{`${Math.round(progress * 100)}%`}</Text>
      </MotiView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 70, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, },
  textContainer: { flex: 1, },
  greeting: { color: '#E5E7EB', fontSize: 28, fontWeight: 'bold', },
  date: { color: '#9CA3AF', fontSize: 16, marginTop: 4, },
  progressText: { color: '#D1D5DB', fontSize: 16, marginTop: 12, fontWeight: '500', },
  progressContainer: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center', },
  progressPercentage: { position: 'absolute', color: 'white', fontSize: 22, fontWeight: 'bold', },
});

export default React.memo(TasksHeader);