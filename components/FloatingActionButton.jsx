import React, { useState } from 'react';
import { Pressable, StyleSheet, View, Text, TextInput } from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { MotiView, AnimatePresence } from 'moti'; // Moti ممتاز للرسوم المتحركة البسيطة والظهور والاختفاء

const FloatingActionButton = ({ contextLessonTitle, onPress }) => { // ✨ [MODIFIED] سنستقبل عنوان الدرس مباشرة
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withRepeat(
      withSequence(withTiming(-5, { duration: 1500 }), withTiming(5, { duration: 1500 })),
      -1, true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handlePress = () => {
    // ✨ [MODIFIED] الآن الضغطة تفتح النافذة بدلاً من الانتقال لشاشة أخرى
    if (onPress) {
      onPress(); // هذا سينفذ الكود الذي نمرره من شاشة الدرس
    }
  };

  return (
    <>
      {/* 
        هذا هو الروبوت الذي يطفو دائمًا.
        لقد فصلناه عن لوحة الدردشة التي ستظهر وتختفي.
      */}
      <Animated.View style={[styles.fabContainer, animatedStyle]}>
        <Pressable onPress={handlePress}>
          <LottieView
            source={require('../assets/images/robot.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
        </Pressable>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 120,
    right: 25,
    width: 80,
    height: 80,
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 12,
  },
  lottie: {
    width: 120,
    height: 110,
  },
  // ✨ [REMOVED] أزلنا كل الأنماط الخاصة بلوحة الدردشة من هنا
  // لأننا سنديرها مباشرة من شاشة الدرس للتحكم الكامل.
});

export default FloatingActionButton;