import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

// 1. أزلنا 'export default' من هنا
const AnimatedGradientButton = ({ text, onPress, withGlow = false, buttonWidth = 240 }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (withGlow) { // نشغل الأنيميشن فقط إذا كان التوهج مطلوبًا
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false, // useNativeDriver: true لا يعمل مع الألوان أو التدرجات
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [animatedValue, withGlow]);

  const startX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-0.5, 1.5],
  });

  const endX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 2.5],
  });

  // 2. تحسين الأنماط الديناميكية لتكون نسبية (أفضل للتجاوب)
  const dynamicStyles = {
    button: {
      width: buttonWidth,
      height: buttonWidth * 0.25, // الارتفاع = ربع العرض (للحفاظ على النسبة)
      borderRadius: buttonWidth * 0.125, // نصف الارتفاع
    },
    glow: {
      width: buttonWidth,
      height: buttonWidth * 0.29, // نسبة عرض إلى ارتفاع مختلفة قليلاً للتوهج
      borderRadius: buttonWidth * 0.145,
      backgroundColor: '#10B981', // يمكنك تمرير اللون كـ prop أيضًا
      opacity: 0.4,
    },
    text: {
      fontSize: buttonWidth * 0.08, // حجم الخط يعتمد على عرض الزر
    }
  };

  const glowScale = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1], // يكبر ثم يصغر
  });

  return (
    <View style={styles.container}>
      {withGlow && (
        <View style={styles.glowWrapper}>
          <Animated.View
            style={[
              dynamicStyles.glow,
              { transform: [{ scale: glowScale }] },
            ]}
          />
        </View>
      )}
      <Pressable onPress={onPress}>
        <AnimatedGradient
          colors={['rgba(86, 7, 255, 1)', '#10B981']}
          start={{ x: startX, y: 0.5 }}
          end={{ x: endX, y: 0.5 }}
          style={[styles.button, dynamicStyles.button]}
        >
          <Text style={[styles.text, dynamicStyles.text]}>{text}</Text>
        </AnimatedGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    // 3. أزلنا الهامش السفلي (marginBottom) من هنا
    // من الأفضل أن يتحكم المكون الأب في هوامش الزر
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
  },
});
export default AnimatedGradientButton; 