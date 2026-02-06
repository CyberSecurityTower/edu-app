import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  useWindowDimensions, 
  Pressable, 
  StatusBar,
  Image
} from 'react-native';

import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { 
  useSharedValue, 
  useAnimatedScrollHandler, 
  useAnimatedStyle, 
  interpolate, 
  Extrapolation,
  withRepeat,
  withTiming,
  Easing,
  FadeInUp
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppState } from '../context/AppStateContext'; // 👈 تأكد من المسار الصحيح
// --- البيانات ---
const SLIDES = [
  {
    id: '1',
    title: 'Your Personal AI\nAcademic Manager',
    description: 'Stop guessing. EduApp analyzes your schedule, mood, and weaknesses to build the perfect strategy.',
    image: require('../assets/images/info2.png'),
    color: '#38BDF8' 
  },
  {
    id: '2',
    title: 'Meet Your\n"Ghost Teacher"',
    description: 'Stuck on a complex lesson? Your AI companion explains it instantly in simple terms.',
    image: require('../assets/images/info1.png'),
    color: '#818CF8' 
  },
  {
    id: '3',
    title: 'Master Your Curriculum.\nOwn Your Future.',
    description: 'Turn chaos into grades. Track your progress, crush your exams, and level up your academic life.',
    image: require('../assets/images/info3.png'),
    color: '#F472B6' 
  },
];

// --- مكون الإضاءة الخلفية ---
const Backlight = ({ color }) => {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1, true
    );
  }, []);

  const style = useAnimatedStyle(() => {
    return { 
      transform: [{ scale: pulse.value }]
    };
  });

  return (
    <Animated.View style={[styles.backlight, { backgroundColor: color }, style]} />
  );
};

// --- الشريحة (Slide) ---
const SlideItem = ({ item, index, x }) => {
  const { width, height } = useWindowDimensions();
  
  const SIZE = width * 0.85; 

  const contentStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const scale = interpolate(x.value, inputRange, [0.8, 1, 0.8], Extrapolation.CLAMP);
    const opacity = interpolate(x.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View style={[styles.slideContainer, { width }]}>
      
      <View style={[styles.visualContainer, { height: height * 0.55 }]}>
        
        <Animated.View style={[styles.centeredContent, { width: SIZE, height: SIZE }, contentStyle]}>
            <Backlight color={item.color} />
            
            <Animated.Image 
              source={item.image} 
              style={styles.image} 
              resizeMode="contain" 
            />
        </Animated.View>

      </View>
      
      <View style={{ height: height * 0.45 }} />
    </View>
  );
};

// --- النصوص ---
const TextContent = ({ data, x, currentIndex }) => {
  const { width } = useWindowDimensions();

  return (
    <View style={styles.textWrapper}>
      {data.map((item, index) => {
        const animatedStyle = useAnimatedStyle(() => {
          const inputRange = [(index - 0.5) * width, index * width, (index + 0.5) * width];
          const opacity = interpolate(x.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
          const translateY = interpolate(x.value, inputRange, [20, 0, 20], Extrapolation.CLAMP);
          
          return {
            opacity,
            transform: [{ translateY }],
            zIndex: index === currentIndex ? 1 : 0 
          };
        });

        return (
          <Animated.View key={index} style={[styles.textContent, animatedStyle]} pointerEvents="none">
            <LinearGradient
                colors={['rgba(30, 41, 59, 0.9)', 'rgba(15, 23, 42, 0.98)']}
                style={styles.glassCard}
            >
                <Text style={styles.title}>{item.title}</Text>
                <View style={styles.divider} />
                <Text style={styles.description}>{item.description}</Text>
            </LinearGradient>
          </Animated.View>
        );
      })}
    </View>
  );
};

// --- المكون الرئيسي ---
const Paginator = ({ data, x }) => {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.paginatorContainer}>
      {data.map((_, i) => {
        const animatedDotStyle = useAnimatedStyle(() => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = interpolate(x.value, inputRange, [8, 30, 8], Extrapolation.CLAMP);
          const opacity = interpolate(x.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP);
          return { width: dotWidth, opacity, backgroundColor: data[i].color };
        });
        return <Animated.View key={i} style={[styles.dot, animatedDotStyle]} />;
      })}
    </View>
  );
};

export default function OnboardingScreen() {
  const router = useRouter();
  const x = useSharedValue(0);
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const { setHasCompletedOnboarding } = useAppState(); 

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => { x.value = event.contentOffset.x; },
  });

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0] && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  // ✅ تم التعديل هنا: التوجيه لصفحة إنشاء الحساب
   const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      // 1. الحفظ في الهاتف (للمرات القادمة)
      await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
      
      // 2. ✅ تحديث الحالة فوراً في التطبيق (لمنع الطرد)
      setHasCompletedOnboarding(true); 

      // 3. الانتقال
      router.replace('/(auth)/create-account');
    }
  };

  const handleSkip = async () => {
    // 1. الحفظ في الهاتف
    await AsyncStorage.setItem('@hasCompletedOnboarding', 'true');
    
    // 2. ✅ تحديث الحالة فوراً
    setHasCompletedOnboarding(true);

    // 3. الانتقال
    router.replace('/(auth)/create-account');
  };
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={StyleSheet.absoluteFill} backgroundColor="#020617" />
      
      <Pressable style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <SlideItem item={item} index={index} x={x} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
      />

      <TextContent data={SLIDES} x={x} currentIndex={currentIndex} />

      <View style={styles.footer}>
        <Paginator data={SLIDES} x={x} />
        <Pressable onPress={handleNext}>
            <Animated.View entering={FadeInUp.delay(300)} style={styles.nextBtn}>
                <LinearGradient
                    colors={currentIndex === 2 ? ['#F472B6', '#DB2777'] : ['#38BDF8', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.btnGradient}
                >
                    <Text style={styles.btnText}>
                        {currentIndex === SLIDES.length - 1 ? 'Start' : 'Next'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                </LinearGradient>
            </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  skipBtn: {
    position: 'absolute',
    top: 60,
    right: 30,
    zIndex: 50,
    padding: 10,
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  visualContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80, 
    zIndex: 2,
  },
  centeredContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backlight: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 9999, 
    opacity: 0.3,
  },
  image: {
    width: '95%', 
    height: '95%', 
    zIndex: 3,
  },
  textWrapper: {
    position: 'absolute',
    bottom: 110, 
    left: 0,
    right: 0,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  textContent: {
    position: 'absolute',
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  glassCard: {
    width: '100%',
    padding: 25,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  divider: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginBottom: 15,
  },
  description: {
    fontSize: 15,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 20,
  },
  paginatorContainer: {
    flexDirection: 'row',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  nextBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 8,
  },
  btnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});