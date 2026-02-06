// components/minichat/NeuralTypingIndicator.jsx
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation
} from 'react-native-reanimated';

const Dot = ({ index }) => {
  // نبدأ بشفافية منخفضة (باهت)
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    // تأخير محسوب بدقة لخلق تأثير الموجة (Wave)
    // النقطة الأولى تبدأ فوراً، الثانية بعد 200ms، الثالثة بعد 400ms
    const delay = index * 200; 

    opacity.value = withDelay(
      delay,
      withRepeat(
        // تتحول الشفافية إلى 1 (ساطع) خلال 600ms
        withTiming(1, { 
          duration: 600, 
          // استخدام easing بسيط وناعم جداً
          easing: Easing.inOut(Easing.ease) 
        }),
        -1,   // تكرار لا نهائي
        true  // Reverse: نعم (يعود للوضع الباهت تلقائياً)
      )
    );

    return () => {
       cancelAnimation(opacity);
    };
  }, []);

  // ربط القيمة بالستايل
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

const NeuralTypingIndicator = () => {
  return (
    <View style={styles.container}>
      <Dot index={0} />
      <Dot index={1} />
      <Dot index={2} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 20, // ارتفاع ثابت وصغير
    gap: 6,     // مسافة مريحة بين النقاط
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4, // دائرة كاملة
    backgroundColor: '#64748B', // لون رمادي احترافي
  },
});

// React.memo يمنع إعادة الرسم غير الضرورية عند تحديث الأب
export default React.memo(NeuralTypingIndicator);