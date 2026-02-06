// components/MainHeader.jsx
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  interpolateColor
} from 'react-native-reanimated';

// Components and Context
import NotificationBell from '../components/NotificationBell';
import { useAppState } from '../context/AppStateContext';
import { useLanguage } from '../context/LanguageContext';

const MainHeader = ({ 
  title, 
  points = 0, 
  user, 
  isCompact = false, 
  hideNotifications = false 
}) => {
  const { unreadCount, latestNotification } = useAppState();
  const { t, isRTL } = useLanguage();

  // --- 🔔 Notification Animation Values ---
  const bellRotation = useSharedValue(0);
  const bellScale = useSharedValue(1);

  // --- ⭐ Score Animation Values ---
  const scoreScale = useSharedValue(1);
  const scoreColorProgress = useSharedValue(0);
  const prevPoints = useRef(points);

  // --- 🕒 Greeting Logic ---
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greetingMorning') || 'Good Morning';
    if (hour < 18) return t('greetingAfternoon') || 'Good Afternoon';
    return t('greetingEvening') || 'Good Evening';
  };

  // ✅ التعديل هنا:
  // 1. جلب الترحيب.
  // 2. حذف الفاصلة (، أو ,) والمسافات من نهاية النص لأننا لن نضع اسماً بعدها.
  const rawGreeting = getGreeting();
  const cleanGreeting = rawGreeting.replace(/[,،]\s*$/, ''); 

  // عرض العنوان الممرر (إن وجد) أو الترحيب النظيف فقط
  const displayTitle = title ? title : cleanGreeting;

  // --- 🎬 Animations Logic ---
  useEffect(() => {
    if (latestNotification && unreadCount > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      bellRotation.value = withSequence(
        withTiming(-15, { duration: 50 }),
        withRepeat(withTiming(15, { duration: 100 }), 4, true),
        withTiming(0, { duration: 50 })
      );
      bellScale.value = withSequence(
        withTiming(1.1, { duration: 100 }),
        withSpring(1)
      );
    }
  }, [latestNotification, unreadCount]);

  useEffect(() => {
    if (points > prevPoints.current) {
      scoreScale.value = withSequence(
        withSpring(1.4, { damping: 10 }), 
        withSpring(1)
      );
      scoreColorProgress.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 500 })
      );
    }
    prevPoints.current = points;
  }, [points]);

  const bellAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellRotation.value}deg` }, { scale: bellScale.value }],
  }));

  const scoreAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      scoreColorProgress.value,
      [0, 1],
      ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.5)']
    );
    const borderColor = interpolateColor(
      scoreColorProgress.value,
      [0, 1],
      ['rgba(255, 215, 0, 0.6)', 'rgba(255, 255, 255, 1)']
    );

    return {
      transform: [{ scale: scoreScale.value }],
      backgroundColor,
      borderColor
    };
  });

  return (
    <View style={[
      styles.headerContainer, 
      isCompact && styles.compactHeaderContainer,
      { flexDirection: isRTL ? 'row-reverse' : 'row' }
    ]}>
      
      {/* Title Section */}
      <View style={[styles.leftContainer, isRTL && { alignItems: 'flex-end' }]}>
        <Text 
          style={[
            styles.headerTitle, 
            isCompact && styles.compactHeaderTitle,
            { textAlign: isRTL ? 'right' : 'left' }
          ]} 
          // لا نستخدم numberOfLines للسماح بالنزول للسطر التالي إذا لزم الأمر
        >
          {displayTitle}
        </Text>
      </View>

      {/* Right: Score + Bell */}
      <View style={[styles.rightContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        
        <Animated.View style={[styles.scoreBadge, scoreAnimatedStyle]}>
          <FontAwesome5 name="star" size={14} color="#FFD700" solid />
          <Text style={styles.scoreText}>{points}</Text>
        </Animated.View>

        {!hideNotifications && (
          <Animated.View style={bellAnimatedStyle}>
             <NotificationBell />
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  compactHeaderContainer: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  leftContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24, // حجم مناسب (ليس كبيراً جداً)
    fontWeight: 'bold',
    lineHeight: 32,
  },
  compactHeaderTitle: {
    fontSize: 20,
  },
  rightContainer: {
    alignItems: 'center',
    gap: 12,
    marginLeft: 10,
  },
  
  // --- 🔥 Golden Glass Style ---
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)', 
    borderColor: 'rgba(255, 215, 0, 0.6)', 
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20, 
    gap: 8,
    height: 42,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5, 
  },
  scoreText: {
    color: '#FFD700', 
    fontSize: 15,
    fontWeight: '900', 
    textShadowColor: 'rgba(255, 215, 0, 0.5)', 
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});

export default MainHeader;