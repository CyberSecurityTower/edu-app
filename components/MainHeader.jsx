
// components/MainHeader.jsx

import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import NotificationBell from '../components/NotificationBell';
import { useAppState } from '../context/AppStateContext';

const MainHeader = ({ 
  title, 
  points = 0, 
  isCompact = false, 
  hideNotifications = false 
}) => {
  const { unreadCount, latestNotification } = useAppState();
  // قمنا بإزالة استخدام isRTL لضمان ثبات الاتجاه
  const router = useRouter();

  const bellRotation = useSharedValue(0);
  const bellScale = useSharedValue(1);
  const scoreScale = useSharedValue(1);
  const scoreColorProgress = useSharedValue(0);
  const prevPoints = useRef(points);

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
      { flexDirection: 'row' } // ✅ تم تثبيت الاتجاه
    ]}>
      
      {/* القسم الأيسر */}
      <View style={styles.leftContainer}>
        {title ? (
          <Text 
            style={[
              styles.headerTitle, 
              isCompact && styles.compactHeaderTitle,
              { textAlign: 'left' } // ✅ تم تثبيت المحاذاة لليسار
            ]} 
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : (
             <Image 
                source={require('../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
             />
        )}
      </View>

      {/* القسم الأيمن */}
      <View style={[
        styles.rightContainer, 
        { flexDirection: 'row' } // ✅ تم تثبيت ترتيب العناصر
      ]}>
          
          <Pressable 
            onPress={() => {
                Haptics.selectionAsync();
                router.push('/store');
            }}
            style={({ pressed }) => [
                styles.storeButton,
                pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }
            ]}
          >
            <LinearGradient
                colors={['#5164f3', '#0650d9']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <FontAwesome5 name="store" size={13} color="white" />
          </Pressable>

          <Animated.View style={[styles.scoreBadge, scoreAnimatedStyle]}>
            <FontAwesome5 name="coins" size={13} color="#FFD700" solid />
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
    paddingTop: 5, 
    paddingBottom: 10,
    paddingHorizontal: 8,
    height: 80, 
  },
  compactHeaderContainer: {
    paddingTop: 5,
    paddingBottom: 5,
    height: 60,
  },
  leftContainer: {
    justifyContent: 'center',
    marginLeft: -15, 
  },
  
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  compactHeaderTitle: {
    fontSize: 18,
  },

  logoImage: {
    width: 170, 
    height: 100, 
    resizeMode: 'contain',
    marginTop: 12
  },

  rightContainer: {
    flex: 1, 
    justifyContent: 'flex-end', 
    alignItems: 'center',
    gap: 8, 
    paddingBottom: 5
  },
  
  storeButton: {
    width: 36, 
    height: 36, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)', 
    borderColor: 'rgba(255, 215, 0, 0.6)', 
    borderWidth: 1,
    paddingHorizontal: 8, 
    borderRadius: 20, 
    gap: 6,
    height: 34,
  },
  scoreText: {
    color: '#FFD700', 
    fontSize: 13,
    fontWeight: '900', 
  },
});

export default MainHeader;