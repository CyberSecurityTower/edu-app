
// components/gen-ui/GenFlashcards.jsx
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, LayoutAnimation } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  interpolate, 
  useAnimatedScrollHandler,
  Extrapolation,
  runOnJS
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// نستخدم عرضاً ثابتاً نسبياً للبطاقة لضمان ظهورها كاملة داخل أي فقاعة
// عرض 240 يعتبر مثالياً لأغلب الهواتف داخل فقاعة شات
const CARD_WIDTH = 240; 
const CARD_HEIGHT = 280;

const FlashcardItem = ({ item, index, x, total }) => {
  const rotateY = useSharedValue(0); 

  const rStyle = useAnimatedStyle(() => {
    // حساب المدى بناءً على عرض البطاقة الثابت
    const inputRange = [
      (index - 1) * CARD_WIDTH,
      index * CARD_WIDTH,
      (index + 1) * CARD_WIDTH,
    ];

    const rotateYScroll = interpolate(
      x.value,
      inputRange,
      [30, 0, -30], // زاوية دوران خفيفة
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      x.value,
      inputRange,
      [0.85, 1, 0.85],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      x.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { perspective: 800 }, 
        { translateX: interpolate(x.value, inputRange, [-20, 0, 20]) }, 
        { rotateY: `${rotateYScroll}deg` },
        { scale },
      ],
      opacity,
    };
  });

  const handleFlip = useCallback(() => {
    Haptics.selectionAsync();
    rotateY.value = withTiming(rotateY.value === 0 ? 180 : 0, { duration: 500 });
  }, []);

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotateY.value}deg` }],
    zIndex: rotateY.value <= 90 ? 1 : 0,
    backfaceVisibility: 'hidden',
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotateY.value + 180}deg` }],
    zIndex: rotateY.value > 90 ? 1 : 0,
    backfaceVisibility: 'hidden',
  }));

  return (
    <Animated.View style={[styles.cardContainer, rStyle]}>
      <Pressable onPress={handleFlip} style={styles.cardWrapper}>
        
        {/* --- الوجه الأمامي --- */}
        <Animated.View style={[styles.cardFace, styles.frontFace, frontAnimatedStyle]}>
          <LinearGradient
            colors={['#1e293b', '#0f172a']} 
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.headerRow}>
              <View style={styles.iconContainer}>
                 <MaterialCommunityIcons name="comment-question-outline" size={20} color="#38BDF8" />
              </View>
              <Text style={styles.indexText}>{index + 1} / {total}</Text>
            </View>

            <View style={styles.contentContainer}>
              <Text style={styles.questionText}>{item.front}</Text>
            </View>

            <View style={styles.footerRow}>
               <Text style={styles.tapHint}>اضغط لعرض الإجابة</Text>
            </View>
          </LinearGradient>
          <View style={styles.glossyEffect} />
        </Animated.View>

        {/* --- الوجه الخلفي --- */}
        <Animated.View style={[styles.cardFace, styles.backFace, backAnimatedStyle]}>
          <LinearGradient
            colors={['#14532d', '#052e16']} 
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.headerRow}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
                 <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color="#FBBF24" />
              </View>
              <Text style={[styles.indexText, { color: '#86EFAC' }]}>{index + 1} / {total}</Text>
            </View>

            <View style={styles.contentContainer}>
              <Text style={styles.answerText}>{item.back}</Text>
            </View>

            <View style={styles.footerRow}>
               <FontAwesome5 name="check" size={14} color="#4ADE80" />
            </View>
          </LinearGradient>
           <View style={styles.glossyEffect} />
        </Animated.View>

      </Pressable>
    </Animated.View>
  );
};

const GenFlashcards = ({ data }) => {
  const x = useSharedValue(0);
  // حالة لحفظ عرض الحاوية الفعلي
  const [containerWidth, setContainerWidth] = useState(0); 

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      x.value = event.contentOffset.x;
    },
  });

  // حساب الهامش الجانبي ديناميكياً لتوسيط البطاقة الأولى والأخيرة
  // إذا لم يتم حساب العرض بعد، نستخدم قيمة افتراضية صغيرة
  const spacerWidth = containerWidth > 0 ? (containerWidth - CARD_WIDTH) / 2 : 20;

  if (!data || data.length === 0) return null;

  return (
    <View 
      style={styles.container}
      // ✅ السحر هنا: نحسب العرض المتاح الحقيقي داخل الفقاعة
      onLayout={(e) => {
        const { width } = e.nativeEvent.layout;
        if (width > 0 && width !== containerWidth) {
          setContainerWidth(width);
        }
      }}
    >
      <Animated.FlatList
        data={data}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <FlashcardItem item={item} index={index} x={x} total={data.length} />
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        
        // إعدادات السناب
        snapToInterval={CARD_WIDTH} 
        snapToAlignment="start" // مع الـ padding الذي حسبناه، start سيعمل كـ center
        decelerationRate="fast"
        
        onScroll={onScroll}
        scrollEventThrottle={16}
        
        // تطبيق الهامش المحسوب
        contentContainerStyle={{
          paddingHorizontal: spacerWidth, 
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: CARD_HEIGHT + 20,
    width: '100%', // يأخذ عرض الأب (الفقاعة) بالكامل
    alignItems: 'center',
    marginVertical: 10,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    // overflow: 'visible' // السماح للظل بالظهور
  },
  cardWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cardFace: {
    width: '90%', 
    height: '96%',
    borderRadius: 20,
    position: 'absolute',
    alignSelf: 'center',
    top: '2%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backfaceVisibility: 'hidden', // مهم جداً
  },
  frontFace: {
    backgroundColor: '#1e293b',
  },
  backFace: {
    backgroundColor: '#064e3b',
  },
  gradient: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
  },
  glossyEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    transform: [{ scaleX: 1.2 }, { translateY: -10 }], 
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: {
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    fontSize: 12,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  questionText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 26,
  },
  answerText: {
    color: '#ecfdf5',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 25,
  },
  footerRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  }
});

export default React.memo(GenFlashcards);