import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming, 
  runOnJS,
  interpolate,
  useDerivedValue
} from 'react-native-reanimated';
import { MotiView } from 'moti';
import LottieView from 'lottie-react-native';
import ChatFab from './ChatFab';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FAB_SIZE = 65; 
const MARGIN = 20; 

const DraggableChatFab = ({ onPress, isLoading, isHidden }) => {
  // --- قيم الحركة (الموقع) ---
  const translateX = useSharedValue(SCREEN_WIDTH - FAB_SIZE - MARGIN);
  const translateY = useSharedValue(SCREEN_HEIGHT - 180);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  // --- قيم الظهور والاختفاء (Scale/Opacity) ---
  // 1 = ظاهر، 0 = مختفي (عندما يكون الشات مفتوحاً)
  const visibilityProgress = useSharedValue(1);

  useEffect(() => {
    // إذا كان مخفياً (الشات مفتوح)، صغر الحجم لـ 0
    visibilityProgress.value = withSpring(isHidden ? 0 : 1, { damping: 12 });
  }, [isHidden]);

  // --- إيماءة السحب (Pan) ---
  const pan = Gesture.Pan()
    .enabled(!isLoading && !isHidden) // تعطيل السحب أثناء التحميل أو الاختفاء
    .onStart(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = contextX.value + event.translationX;
      translateY.value = contextY.value + event.translationY;
    })
    .onEnd(() => {
      // الالتصاق بالحواف
      const targetX = translateX.value + (FAB_SIZE / 2) < SCREEN_WIDTH / 2 
        ? MARGIN 
        : SCREEN_WIDTH - FAB_SIZE - MARGIN;

      let targetY = translateY.value;
      if (targetY < 100) targetY = 100;
      if (targetY > SCREEN_HEIGHT - 100) targetY = SCREEN_HEIGHT - 100;

      translateX.value = withSpring(targetX, { damping: 15, stiffness: 200 });
      translateY.value = withSpring(targetY, { damping: 15, stiffness: 200 });
    });

  // --- إيماءة النقر (Tap) ---
  const tap = Gesture.Tap()
    .enabled(!isLoading && !isHidden)
    .onEnd(() => {
      runOnJS(onPress)();
    });

  const gesture = Gesture.Race(pan, tap);

  // ستايل الحاوية الرئيسية (يتحرك ويختفي)
  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: visibilityProgress.value } // تأثير الاختفاء عند فتح الشات
      ],
      opacity: visibilityProgress.value, // شفافية أيضاً للنعومة
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.fabContainer, containerStyle]}>
        
        {/* الحالة 1: الزر العادي (يظهر فقط إذا لم يكن يحمل) */}
        <MotiView
          animate={{ opacity: isLoading ? 0 : 1, scale: isLoading ? 0.8 : 1 }}
          transition={{ type: 'timing', duration: 300 }}
          style={StyleSheet.absoluteFill}
        >
          <View pointerEvents="none">
             <ChatFab onPress={() => {}} />
          </View>
        </MotiView>

        {/* الحالة 2: اللوتي (يظهر فقط عند التحميل) */}
        {isLoading && (
          <MotiView
            from={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.5 }} // تكبير اللوتي قليلاً ليغطي المكان
            transition={{ type: 'spring', damping: 15 }}
            style={[StyleSheet.absoluteFill, styles.lottieWrapper]}
          >
            <LottieView
              // تأكد من المسار الصحيح لملف اللوتي
              source={require('../assets/images/circle_fab.json')} 
              autoPlay
              loop={true}
              style={{ width: 100, height: 100 }} // حجم أكبر قليلاً من الزر للتأثير
              resizeMode="cover"
            />
          </MotiView>
        )}

      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FAB_SIZE,  // أبعاد ثابتة للحاوية
    height: FAB_SIZE,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    // الظل موجود في الحاوية ليتحرك مع أي محتوى
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  lottieWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    // إزالة الخلفية والظل لضمان ظهور اللوتي فقط بشكل نظيف
    backgroundColor: 'transparent', 
  }
});

export default DraggableChatFab;