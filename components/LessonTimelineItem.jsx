import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  withSpring
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';

// ---------------------------------------------------------
// 🎨 Internal Component: Timeline Node (Updated)
// ---------------------------------------------------------
const TimelineNode = ({ status, masteryScore, isLast, isFirst }) => {
  // قيم الأنيميشن للنبض (Active State)
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (status === 'active') {
      scale.value = withRepeat(
        withSequence(withTiming(1.15, { duration: 1500 }), withTiming(1, { duration: 1500 })),
        -1, true
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.8, { duration: 1500 }), withTiming(0.4, { duration: 1500 })),
        -1, true
      );
    } else {
        scale.value = 1;
        glowOpacity.value = 0;
    }
  }, [status]);

  const animatedNodeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: scale.value }]
  }));

  // تحديد اللون بناءً على النسبة
  const getScoreColor = (score) => {
    if (score >= 99) return '#F59E0B'; // ذهبي
    if (score >= 80) return '#10B981'; // أخضر
    if (score >= 50) return '#38BDF8'; // أزرق فاتح
    return '#64748B'; // رمادي
  };

  const scoreColor = getScoreColor(masteryScore);

  return (
    <View style={styles.nodeContainer}>
      {/* الخط العلوي */}
      {!isFirst && <View style={[styles.line, styles.lineTop, (status !== 'locked') && { backgroundColor: '#38BDF8' }]} />}
      
      {/* العقدة المركزية */}
      <View style={styles.nodeWrapper}>
        
        {/* تأثير التوهج للدرس النشط */}
        {status === 'active' && (
             <Animated.View style={[styles.activeGlow, animatedGlowStyle]} />
        )}

        {/* جسم الدائرة */}
        <Animated.View style={[
            styles.circleBase,
            status === 'locked' && styles.circleLocked,
            status === 'active' && styles.circleActive,
            status === 'completed' && { borderColor: scoreColor, borderWidth: 2 },
            animatedNodeStyle
        ]}>
            {status === 'locked' ? (
                <FontAwesome5 name="lock" size={12} color="#475569" />
            ) : (
                <Text style={[
                    styles.scoreText, 
                    { color: status === 'active' ? 'white' : scoreColor }
                ]}>
                    {Math.round(masteryScore)}%
                </Text>
            )}
        </Animated.View>

      </View>

      {/* الخط السفلي (يكون ملوناً إذا كان الدرس الحالي مكتملاً) */}
      {!isLast && <View style={[styles.line, styles.lineBottom, status === 'completed' && { backgroundColor: '#38BDF8' }]} />}
    </View>
  );
};

// ---------------------------------------------------------
// 🎴 Main Export: LessonTimelineItem
// ---------------------------------------------------------
const LessonTimelineItem = memo(({ item, index, isFirst, isLast, subjectId, pathId, totalLessons }) => {
  const { isRTL, language } = useLanguage();
  const router = useRouter();

  const isLocked = item.status === 'locked';
  const isActive = item.status === 'active'; // الدرس الحالي الذي يدرسه الطالب
  const isMastered = item.masteryScore >= 99; // 99-100%

  const handlePress = () => {
    if (isLocked) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
    }
    Haptics.selectionAsync();
    router.push({
      pathname: '/lesson-view',
      params: { lessonId: item.id, lessonTitle: item.title, subjectId, pathId, totalLessons },
    });
  };

  // النصوص المترجمة
  const lessonLabel = language === 'ar' ? `الدرس ${index + 1}` : `Lesson ${index + 1}`;
  let statusText = "";
  if (isActive) statusText = language === 'ar' ? "جاري التعلم" : "Active";
  if (isMastered) statusText = language === 'ar' ? "أسطوري ✨" : "Mastered ✨";

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).springify()} 
      style={[
        styles.rowContainer, 
        { flexDirection: isRTL ? 'row-reverse' : 'row' }
      ]}
    >
      {/* 1. عمود التايم لاين */}
      <View style={styles.timelineColumn}>
        <TimelineNode 
            status={item.status} 
            masteryScore={item.masteryScore || 0} 
            isFirst={isFirst} 
            isLast={isLast} 
        />
      </View>

      {/* 2. عمود البطاقة */}
      <Pressable 
        onPress={handlePress} 
        style={[styles.cardContainer, { opacity: isLocked ? 0.5 : 1 }]}
        disabled={isLocked}
      >
        <BlurView 
            intensity={isActive ? 20 : 5} 
            tint="dark" 
            style={[
                styles.cardGlass,
                isActive && styles.cardActiveBorder,
                isMastered && styles.cardMasteredBorder, // بوردر ذهبي للمتقنين
                { flexDirection: isRTL ? 'row-reverse' : 'row' }
            ]}
        >
            <View style={{flex: 1}}>
                <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.lessonOrder}>{lessonLabel}</Text>
                    
                    {/* التاج الخاص (Badge) */}
                    {(isActive || isMastered) && (
                        <View style={[
                            styles.badge, 
                            isActive && styles.badgeActive,
                            isMastered && styles.badgeMastered
                        ]}>
                             <Text style={[
                                 styles.badgeText,
                                 isActive && { color: '#38BDF8' },
                                 isMastered && { color: '#F59E0B' }
                             ]}>{statusText}</Text>
                        </View>
                    )}
                </View>

                <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {item.title}
                </Text>
                
                <Text style={[styles.cardFooter, { textAlign: isRTL ? 'right' : 'left' }]}>
                   {item.duration || '15 min'} • {item.xpReward || 50} XP
                </Text>
            </View>

            {/* أيقونة الحالة */}
            <View style={[styles.iconBox, isRTL ? { marginRight: 12 } : { marginLeft: 12 }]}>
                {isLocked ? (
                    <FontAwesome5 name="lock" size={16} color="#475569" />
                ) : isMastered ? (
                    <MaterialCommunityIcons name="trophy" size={20} color="#F59E0B" />
                ) : isActive ? (
                    <FontAwesome5 name="play" size={14} color="#38BDF8" />
                ) : (
                    <FontAwesome5 name="redo" size={14} color="#94A3B8" />
                )}
            </View>

        </BlurView>
      </Pressable>
    </Animated.View>
  );
});

export default LessonTimelineItem;

const styles = StyleSheet.create({
  rowContainer: { 
      alignItems: 'stretch', 
      minHeight: 110
  },
  timelineColumn: { 
      width: 70, 
      alignItems: 'center', 
  },
  // Lines
  line: {
      position: 'absolute',
      width: 2,
      backgroundColor: '#1E293B',
      left: 34, 
  },
  lineTop: { top: 0, height: '50%' },
  lineBottom: { top: '50%', height: '100%' },

  // Nodes (Circles)
  nodeContainer: {
      height: '100%', 
      width: '100%', 
      alignItems: 'center',
      justifyContent: 'center', 
      position: 'absolute', 
  },
  nodeWrapper: {
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
  },
  circleBase: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#0F172A',
      borderWidth: 1,
      borderColor: '#334155'
  },
  circleLocked: {
      backgroundColor: '#020617',
      borderColor: '#1E293B',
      width: 30,
      height: 30,
      borderRadius: 15
  },
  circleActive: {
      borderColor: '#38BDF8',
      backgroundColor: '#0EA5E9', // تعبئة زرقاء للنشط
      borderWidth: 0,
  },
  activeGlow: {
      position: 'absolute',
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: '#38BDF8',
      opacity: 0.3,
      zIndex: -1
  },
  scoreText: {
      fontSize: 10,
      fontWeight: '800',
      fontFamily: 'monospace' // يعطي شكل رقمي جميل
  },

  // Card Styles
  cardContainer: {
      flex: 1,
      marginBottom: 16,
      marginHorizontal: 10,
  },
  cardGlass: {
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      alignItems: 'center',
      overflow: 'hidden'
  },
  cardActiveBorder: {
      borderColor: '#38BDF8',
      backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  cardMasteredBorder: {
      borderColor: 'rgba(245, 158, 11, 0.5)',
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  cardHeader: {
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6
  },
  lessonOrder: {
      color: '#64748B',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5
  },
  
  // Badges
  badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'transparent'
  },
  badgeActive: {
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      borderColor: 'rgba(56, 189, 248, 0.3)'
  },
  badgeMastered: {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  badgeText: {
      fontSize: 10,
      fontWeight: '700'
  },

  cardTitle: {
      color: '#F1F5F9',
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 4,
  },
  cardFooter: {
      color: '#94A3B8',
      fontSize: 11,
  },
  iconBox: {
      justifyContent: 'center',
      alignItems: 'center'
  }
});