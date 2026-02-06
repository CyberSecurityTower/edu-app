import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing, 
  withSequence,
  withDelay,
  interpolate,
  useAnimatedProps,
  withSpring
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const BUTTON_WIDTH = width * 0.85;

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ArenaEntryButton({ onPress, title = "ENTER ARENA" }) {
  // 1. قيم الأنيميشن
  const shimmerValue = useSharedValue(-1); // للضوء المتحرك
  const scaleValue = useSharedValue(1);    // لتأثير الضغط
  const floatY = useSharedValue(0);        // للطفو البسيط

  useEffect(() => {
    // أنيميشن اللمعان (Shimmer) يمر كل 3 ثواني
    shimmerValue.value = withRepeat(
      withDelay(2000, withTiming(1, { duration: 1500, easing: Easing.linear })),
      -1,
      false
    );

    // أنيميشن الطفو البسيط
    floatY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  // أنيميشن حركة اللمعان
  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerValue.value,
      [-1, 1],
      [-BUTTON_WIDTH, BUTTON_WIDTH]
    );
    return {
      transform: [{ translateX }, { skewX: '-20deg' }],
      opacity: interpolate(shimmerValue.value, [-1, -0.2, 0.2, 1], [0, 0.8, 0.8, 0]),
    };
  });

  // أنيميشن زر الضغط
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }, { translateY: floatY.value }],
  }));

  const handlePressIn = () => {
    scaleValue.value = withSpring(0.95);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePressOut = () => {
    scaleValue.value = withSpring(1);
  };

  return (
    <View style={styles.wrapper}>
      {/* تأثير توهج خلف الزر */}
      <Animated.View style={[styles.glowBackground, animatedContainerStyle]} />

      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.container, animatedContainerStyle]}
      >
        {/* الخلفية المتدرجة للزر */}
        <LinearGradient
          colors={['#4F46E5', '#7C3AED', '#DB2777']} // ألوان Cyberpunk (بنفسجي/وردي)
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* تأثير اللمعان المتحرك */}
          <AnimatedLinearGradient
            colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.shimmerOverlay, shimmerStyle]}
          />

          <View style={styles.contentRow}>
            {/* الأيقونة اليسرى */}
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="sword-cross" size={24} color="#FFF" />
            </View>

            {/* النصوص */}
            <View style={styles.textContainer}>
              <Text style={styles.mainText}>{title}</Text>
              <Text style={styles.subText}>PROVE YOUR SKILLS</Text>
            </View>

            {/* سهم الدخول */}
            <View style={styles.arrowContainer}>
              <FontAwesome5 name="chevron-right" size={16} color="rgba(255,255,255,0.8)" />
              <FontAwesome5 name="chevron-right" size={16} color="rgba(255,255,255,0.4)" style={{ marginLeft: -8 }} />
            </View>
          </View>
        </LinearGradient>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30, // مسافة من العناصر الأخرى
  },
  glowBackground: {
    position: 'absolute',
    width: BUTTON_WIDTH,
    height: 65,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    opacity: 0.4,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    transform: [{ scale: 0.95 }], // أصغر قليلاً من الزر ليكون كأنه ظل مضيء
  },
  container: {
    width: BUTTON_WIDTH,
    height: 70,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  gradient: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden', // مهم جداً عشان اللمعان ما يطلع برا الزر
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    zIndex: 10,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  mainText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 2,
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});