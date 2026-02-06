import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

// 1. Shimmer Component (Robust & Error-Free)
const ShimmerPlaceholder = ({ width, height, borderRadius = 4, style }) => {
  const [layoutWidth, setLayoutWidth] = useState(0); // نخزن العرض الحقيقي بالبكسل
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // لا نبدأ الأنيميشن إلا إذا تم حساب العرض لتجنب الوميض
    if (layoutWidth > 0) {
      animatedValue.setValue(0);
      Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true, // الآن يعمل بأمان لأننا نستخدم أرقاماً
        })
      ).start();
    }
  }, [layoutWidth]); // يعيد التشغيل إذا تغير حجم العنصر

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    // نحرك من سالب العرض إلى موجب العرض (بكسلات حقيقية)
    outputRange: [-layoutWidth, layoutWidth], 
  });

  return (
    <View
      // نستخدم onLayout لقياس العرض الحقيقي سواء كان مدخلاً كرقم أو نسبة مئوية
      onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
      style={[
        { width, height, borderRadius, overflow: 'hidden', backgroundColor: '#1E293B' },
        style,
      ]}
    >
      {/* نظهر الشيمر فقط بعد حساب العرض لتجنب الأخطاء */}
      {layoutWidth > 0 && (
        <Animated.View style={{ width: '100%', height: '100%', transform: [{ translateX }] }}>
          <LinearGradient
            colors={['transparent', 'rgba(255, 255, 255, 0.1)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>
      )}
    </View>
  );
};

// 2. Timeline Item Skeleton
const LessonSkeletonItem = ({ isLast }) => {
  return (
    <View style={styles.lessonRow}>
      {/* Timeline Left */}
      <View style={styles.timelineContainer}>
        {!isLast && <View style={styles.timelineLine} />}
        <ShimmerPlaceholder width={30} height={30} borderRadius={15} style={styles.nodeCircle} />
      </View>

      {/* Lesson Card */}
      <View style={styles.cardContainer}>
        <View style={styles.cardContent}>
            {/* Title Small */}
            <ShimmerPlaceholder width={60} height={10} style={{ marginBottom: 10 }} />
            {/* Title Large - يعمل الآن بأمان مع النسبة المئوية */}
            <ShimmerPlaceholder width="80%" height={16} style={{ marginBottom: 14 }} />
            
            {/* Footer */}
            <View style={styles.cardFooter}>
                <ShimmerPlaceholder width={40} height={10} />
                <ShimmerPlaceholder width={24} height={24} borderRadius={6} />
            </View>
        </View>
      </View>
    </View>
  );
};

// 3. Main Skeleton Screen
export default function SubjectDetailsSkeleton({ isRTL = false }) {
  const directionStyle = isRTL ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      
      {/* Header Skeleton */}
      <View style={[styles.header, directionStyle]}>
        <ShimmerPlaceholder width={40} height={40} borderRadius={12} />
        
        <View style={{ alignItems: 'center' }}>
            <ShimmerPlaceholder width={140} height={20} borderRadius={4} style={{ marginBottom: 6 }} />
            <ShimmerPlaceholder width={70} height={12} borderRadius={10} />
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Progress Bar Skeleton */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressLabels, directionStyle]}>
          <ShimmerPlaceholder width={80} height={12} />
          <ShimmerPlaceholder width={30} height={12} />
        </View>
        {/* شريط التقدم بنسبة 100% */}
        <ShimmerPlaceholder width="100%" height={6} borderRadius={3} style={{ marginTop: 10 }} />
      </View>

      {/* Timeline List Skeleton */}
      <View style={styles.listContainer}>
        {[1, 2, 3, 4, 5].map((item, index) => (
          <View key={item} style={directionStyle}>
              <LessonSkeletonItem isLast={index === 4} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  listContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  // Timeline
  lessonRow: {
    flex: 1,
    flexDirection: 'inherit',
    minHeight: 110,
  },
  timelineContainer: {
    width: 50,
    alignItems: 'center',
  },
  timelineLine: {
    position: 'absolute',
    top: 30,
    bottom: -10,
    width: 2,
    backgroundColor: '#1E293B',
    zIndex: 0,
  },
  nodeCircle: {
    zIndex: 1,
    borderWidth: 4,
    borderColor: '#0B1220',
  },
  cardContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  cardContent: {
    width: '100%',
    height: 100,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    justifyContent: 'center',
  },
  cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6
  }
});