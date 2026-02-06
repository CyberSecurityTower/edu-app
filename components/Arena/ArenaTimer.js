import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence, 
  withTiming, 
  withRepeat, 
  interpolateColor 
} from 'react-native-reanimated';
import { SoundManager } from '../../utils/SoundManager'; // تأكد من صحة المسار

export const ArenaTimer = ({ duration = 10, isRunning, onTimeout }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const endTimeRef = useRef(0);
  const timerScale = useSharedValue(1);
  
  // لضمان عدم استدعاء onTimeout عدة مرات
  const hasTriggeredTimeout = useRef(false);

  // 1. منطق العداد
  useEffect(() => {
    let interval;

    if (isRunning && timeLeft > 0) {
      // إذا كان هذا أول تشغيل أو استئناف، نحدد وقت النهاية المتوقع
      if (endTimeRef.current === 0) {
        endTimeRef.current = Date.now() + (timeLeft * 1000);
      }

      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.ceil((endTimeRef.current - now) / 1000);

        if (remaining <= 0) {
          clearInterval(interval);
          setTimeLeft(0);
          
          if (!hasTriggeredTimeout.current) {
            hasTriggeredTimeout.current = true;
            onTimeout(); // إبلاغ الأب بانتهاء الوقت
          }
        } else {
          setTimeLeft(remaining);
        }
      }, 200);
    } else if (!isRunning) {
      // عند الإيقاف المؤقت، نقوم بتصفير المرجع ليتم إعادة حسابه عند الاستئناف
      endTimeRef.current = 0;
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onTimeout]);

  // 2. منطق الأنيميشن والصوت (Ticking)
  useEffect(() => {
    if (timeLeft <= 3 && isRunning) {
      if (timeLeft > 0) SoundManager.playSound('tick');
      
      timerScale.value = withRepeat(
        withSequence(
            withTiming(1.2, { duration: 100 }), 
            withTiming(1, { duration: 100 })
        ), 
        2, 
        true
      );
    } else {
      timerScale.value = 1;
    }
  }, [timeLeft, isRunning]);

  // 3. Reanimated Styles
  const timerTextAnimatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(timeLeft, [0, 3, 10], ['#EF4444', '#F59E0B', '#E2E8F0']);
    return { color };
  });

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(timeLeft, [0, 3, 10], ['#EF4444', '#F59E0B', 'rgba(255,255,255,0.1)']);
    return { 
      borderColor, 
      transform: [{ scale: timerScale.value }] 
    };
  });

  return (
    <Animated.View style={[styles.timerCapsule, containerAnimatedStyle]}>
      <FontAwesome5 
        name="clock" 
        size={12} 
        color={timeLeft <= 3 ? "#EF4444" : "#94A3B8"} 
        style={{ marginRight: 8 }} 
      />
      <Animated.Text style={[styles.timerText, timerTextAnimatedStyle]}>
        00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  timerCapsule: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(30, 41, 59, 0.8)', 
    paddingHorizontal: 16, 
    paddingVertical: 6, 
    borderRadius: 20, 
    borderWidth: 1, 
    minWidth: 90, 
    justifyContent: 'center' 
  },
  timerText: { 
    fontFamily: 'monospace', 
    fontWeight: '800', 
    fontSize: 14 
  },
});