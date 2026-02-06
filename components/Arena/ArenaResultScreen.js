import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView, SafeAreaView, Platform 
} from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { 
  ZoomIn, FadeInDown, SlideInUp, SlideInDown, FadeIn, FadeInUp,
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, 
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { SoundManager } from '../../utils/SoundManager';

import { useLanguage } from '../../context/LanguageContext';
import { ARENA_TEXTS } from '../../data/ArenaTranslations';

// استيراد المكون (تأكد من المسار)
import MasteryProgressRow from './MasteryProgressRow';

// ---------------------------------------------------------
// 🏗️ Header Button Component
// ---------------------------------------------------------
const HeaderButton = ({ icon, label, onPress, color = "white", delay = 0 }) => (
    <Animated.View entering={SlideInDown.delay(delay).springify()}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <BlurView intensity={30} tint="dark" style={styles.headerBtnBlur}>
                {/* تم تعديل حجم الأيقونة قليلاً لتناسب الزر */}
                <FontAwesome5 name={icon} size={18} color={color} />
                {label && <Text style={[styles.headerBtnText, { color }]}>{label}</Text>}
            </BlurView>
        </TouchableOpacity>
    </Animated.View>
);

// ---------------------------------------------------------
// 🌟 New Component: Action Button (Clean Single Layer)
// ---------------------------------------------------------
const ActionButton = ({ label, icon, colors, onPress, isRTL, shadowColor, animType }) => {
    // 1. Scale Animation on Press
    const scale = useSharedValue(1);
    
    // 2. Shadow Pulse Animation (تغيير الشفافية فقط وليس الحجم لتجنب التضاعف)
    const shadowOpacity = useSharedValue(0.3);

    useEffect(() => {
        if (animType === 'pulse') {
            shadowOpacity.value = withRepeat(
                withSequence(withTiming(0.6, { duration: 1500 }), withTiming(0.3, { duration: 1500 })),
                -1, true
            );
        }
    }, [animType]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        // تطبيق الظل هنا مباشرة ليكون جزءاً من الزر وليس طبقة منفصلة
        shadowOpacity: shadowOpacity.value,
    }));

    const handlePressIn = () => {
        scale.value = withTiming(0.96, { duration: 100 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handlePressOut = () => {
        scale.value = withTiming(1, { duration: 100 });
    };

    return (
        <Animated.View style={[styles.actionBtnWrapper, { shadowColor }, animatedStyle]}>
            <TouchableOpacity 
                activeOpacity={1} 
                onPressIn={handlePressIn} 
                onPressOut={handlePressOut} 
                onPress={onPress}
                style={styles.touchableFill}
            >
                <LinearGradient 
                    colors={colors} 
                    start={{x:0, y:0}} end={{x:1, y:1}}
                    style={[styles.btnPrimary, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                    <Text style={styles.btnPrimaryText}>{label}</Text>
                    <FontAwesome5 name={icon} size={20} color="white" />
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ---------------------------------------------------------
// 🏆 Main Screen: ArenaResultScreen
// ---------------------------------------------------------
export const ArenaResultScreen = ({ 
  score, maxScore, isDisqualified, onRetry, onReturn, onNextLesson, serverData 
}) => {
  const { language, isRTL } = useLanguage();
  const t = ARENA_TEXTS[language] || ARENA_TEXTS.en;

  const safeServerData = serverData || {};
  const finalScore = typeof safeServerData.score === 'number' ? safeServerData.score : (score || 0);
  const finalMaxScore = typeof safeServerData.maxScore === 'number' ? safeServerData.maxScore : (maxScore || 1);
  const earnedCoins = safeServerData.coinsEarned || 0;
  
  let percentage = safeServerData.percentage !== undefined 
      ? safeServerData.percentage 
      : Math.round((finalScore / finalMaxScore) * 100);
  if (isNaN(percentage)) percentage = 0;

  const masteryChanges = safeServerData.masteryChanges || [];
  
  const isPassing = finalScore >= 10 && !isDisqualified;

  // --- Theme Logic ---
  let theme = {
    color: '#EF4444', 
    gradient: ['#450a0a', '#000000'],
    rank: 'F',
    title: t.results.title_failed,
    subtitle: isDisqualified ? t.results.sub_disqualified : "Mission Compromised",
    lottie: null, 
    sound: 'defeat',
    motivationalText: isRTL ? "لا تستسلم! حاول مجدداً." : "Don't give up! Try again."
  };

  if (!isDisqualified) {
    if (percentage >= 90) {
        theme = {
            color: '#F59E0B', gradient: ['#422006', '#000000'], rank: 'S',
            title: t.results.title_legendary, subtitle: "Outstanding Performance",
            lottie: require('../../assets/images/Celebrate_winner.json'), sound: 'victory',
            motivationalText: isRTL ? "أداء أسطوري! أنت النخبة." : "Legendary status achieved!"
        };
    } else if (percentage >= 70) {
        theme = {
            color: '#10B981', gradient: ['#064e3b', '#000000'], rank: 'A',
            title: t.results.title_excellent, subtitle: "Mission Accomplished",
            lottie: require('../../assets/images/confetti.json'), sound: 'correct_tone',
            motivationalText: isRTL ? "عمل رائع! استمر في التقدم." : "Great job! Keep pushing."
        };
    } else if (percentage >= 50) {
        theme = {
            color: '#38BDF8', gradient: ['#0c4a6e', '#000000'], rank: 'B',
            title: t.results.title_passed, subtitle: "Objective Completed",
            lottie: null, sound: 'correct_tone',
            motivationalText: isRTL ? "نجحت، ولكن يمكنك فعل الأفضل!" : "Passed, but aim higher next time!"
        };
    }
  }

  // --- Animations ---
  const scoreAnimated = useSharedValue(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    SoundManager.stopAllSounds().then(() => {
        setTimeout(() => SoundManager.playSound(theme.sound), 300);
    });

    scoreAnimated.value = withTiming(finalScore, { duration: 1500, easing: Easing.out(Easing.exp) });

    const interval = setInterval(() => {
        const val = Math.round(scoreAnimated.value);
        setDisplayScore(isNaN(val) ? 0 : val);
    }, 50);
    
    if(percentage >= 50) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    return () => clearInterval(interval);
  }, []);

  const pulseScale = useSharedValue(1);
  useEffect(() => {
      pulseScale.value = withRepeat(
          withSequence(withTiming(1.05, { duration: 1000 }), withTiming(1, { duration: 1000 })),
          -1, true
      );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFill} />

      {theme.lottie && (
          <View style={styles.lottieOverlay} pointerEvents="none">
             <LottieView source={theme.lottie} autoPlay loop={false} style={{flex: 1}} resizeMode="cover" />
          </View>
      )}

      {/* 🟢 TOP HEADER ACTIONS */}
      <SafeAreaView style={styles.topHeader}>
          {/* 
            🛠️ التغيير هنا: أيقونة الخروج
            تم تغيير icon إلى "times" (علامة X) لأنها أوضح للخروج/الإغلاق
          */}
          <View style={styles.topLeft}>
             <HeaderButton 
                icon="times" 
                color="#EF4444" 
                onPress={onReturn} 
                delay={100}
             />
          </View>

          <View style={styles.topRight}>
             <HeaderButton 
                icon="redo" 
                color="white" 
                onPress={onRetry} 
                delay={200}
                label={isPassing ? t.results.btn_another_challenge : t.results.btn_retry}
             />
          </View>
      </SafeAreaView>

      {/* 📜 Main Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
            
            {/* Rank Badge */}
            <Animated.View entering={ZoomIn.delay(300).springify()} style={styles.rankBadgeContainer}>
                <View style={[styles.rankBadge, { borderColor: theme.color, shadowColor: theme.color }]}>
                    <Text style={[styles.rankText, { color: theme.color }]}>{theme.rank}</Text>
                </View>
                <View style={[styles.glow, { backgroundColor: theme.color }]} />
            </Animated.View>

            {/* Title */}
            <Animated.View entering={FadeInDown.delay(400)} style={{ alignItems: 'center', marginBottom: 30 }}>
                <Text style={[styles.mainTitle, { color: theme.color }]}>{theme.title}</Text>
                <Text style={styles.subTitle}>{theme.subtitle}</Text>
            </Animated.View>

            {/* Score Circle */}
            <Animated.View style={[styles.scoreContainer, pulseStyle]}>
                <View style={[styles.scoreCircle, { borderColor: theme.color }]}>
                    <BlurView intensity={40} tint="dark" style={styles.glassCircle}>
                        <Text style={[styles.scoreValue, { color: 'white' }]}>
                            {displayScore}
                            <Text style={{fontSize: 20, color: '#94A3B8'}}>/{finalMaxScore}</Text>
                        </Text>
                        <Text style={[styles.scoreLabel, { color: theme.color }]}>SCORE</Text>
                    </BlurView>
                </View>
            </Animated.View>

            {/* Stats Grid */}
            <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {(earnedCoins > 0) && (
                    <View style={styles.statCard}>
                        <BlurView intensity={20} tint="dark" style={[styles.statInner, { borderColor: '#F59E0B40' }]}>
                           <FontAwesome5 name="coins" size={14} color="#F59E0B" style={{marginRight: 8}}/>
                           <Text style={[styles.statValue, { color: 'white' }]}>+{earnedCoins}</Text>
                        </BlurView>
                    </View>
                )}
                <View style={styles.statCard}>
                    <BlurView intensity={20} tint="dark" style={[styles.statInner, { borderColor: '#38BDF840' }]}>
                       <FontAwesome5 name="clipboard-check" size={14} color="#38BDF8" style={{marginRight: 8}}/>
                       <Text style={[styles.statValue, { color: 'white' }]}>{percentage}%</Text>
                    </BlurView>
                </View>
            </View>

            {/* Mastery Updates */}
            {masteryChanges.length > 0 && (
                <Animated.View entering={FadeInDown.delay(600)} style={styles.masteryContainer}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 12 }}>
                        <MaterialCommunityIcons name="brain" size={16} color="#38BDF8" style={isRTL ? {marginLeft: 8} : {marginRight: 8}} />
                        <Text style={styles.sectionTitle}>
                            {isRTL ? "تحليل المهارات" : "SKILL MASTERY ANALYSIS"}
                        </Text>
                    </View>
                    {masteryChanges.map((item, index) => (
                        <MasteryProgressRow 
                            key={item.atom_id || index}
                            atomId={item.atom_id}
                            title={item.title} 
                            oldScore={item.old_score || 0}
                            newScore={item.new_score || 0}
                            delta={item.delta || 0}
                            index={index}
                            isRTL={isRTL}
                        />
                    ))}
                </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(700)} style={styles.motivationBox}>
                <Text style={styles.motivationText}>{theme.motivationalText}</Text>
            </Animated.View>

        </View>
      </ScrollView>

     {/* 🔴 FOOTER */}
      <View pointerEvents="none" style={styles.footerGradientOverlay}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)', '#000000']}
            style={{ flex: 1 }}
          />
      </View>

      {/* التعديل هنا: استخدام FadeInUp بدلاً من SlideInUp لتأثير ناعم */}
      <Animated.View 
        entering={FadeInUp.delay(900).springify().damping(20).mass(0.5)} 
        style={styles.footer}
      >
         {isPassing ? (
            <ActionButton 
                label={t.results.btn_next_lesson}
                icon={isRTL ? "arrow-left" : "arrow-right"}
                colors={['#059669', '#10B981', '#34D399']}
                shadowColor="#10B981"
                onPress={onNextLesson}
                isRTL={isRTL}
                animType="pulse"
            />
         ) : (
            <ActionButton 
                label={isRTL ? "انتقام" : "REVENGE"}
                icon="fire"
                colors={['#7f1d1d', '#DC2626', '#EF4444']}
                shadowColor="#DC2626"
                onPress={onRetry}
                isRTL={isRTL}
            />
         )}
      </Animated.View>
    </View>
  );
};

// ---------------------------------------------------------
// 🖌️ Styles
// ---------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  lottieOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  
  // Header Styles
  topHeader: {
      position: 'absolute',
      top: Platform.OS === 'android' ? 40 : 0, 
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      zIndex: 100, 
  },
  topLeft: { alignItems: 'flex-start' },
  topRight: { alignItems: 'flex-end' },
  headerBtnBlur: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12, // زيادة بسيطة لسهولة اللمس
      borderRadius: 20,
      gap: 8,
      backgroundColor: 'rgba(255,255,255,0.08)', // خلفية أكثر وضوحاً قليلاً
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)'
  },
  headerBtnText: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase'
  },

  // Content
  scrollContent: { paddingBottom: 160 },
  contentContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingTop: 100, zIndex: 1 },

  // Rank
  rankBadgeContainer: { justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  rankBadge: { width: 80, height: 80, borderRadius: 20, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2, shadowOffset: {width:0, height:0}, shadowOpacity: 0.8, shadowRadius: 20, elevation: 10 },
  rankText: { fontSize: 48, fontWeight: '900', fontStyle: 'italic' },
  glow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, opacity: 0.3, zIndex: 1 },

  mainTitle: { fontSize: 32, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width:0, height:2}, textShadowRadius: 4 },
  subTitle: { color: '#94A3B8', fontSize: 14, marginTop: 5, letterSpacing: 1, fontWeight: '600' },

  // Score
  scoreContainer: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  scoreCircle: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, overflow: 'hidden', shadowColor: "#000", shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 },
  glassCircle: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  scoreValue: { fontSize: 42, fontWeight: '900' },
  scoreLabel: { fontSize: 10, fontWeight: '700', marginTop: -5, letterSpacing: 1 },

  // Mini Stats
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 30 },
  statCard: { borderRadius: 12, overflow: 'hidden', minWidth: 100 },
  statInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1 },
  statValue: { fontSize: 16, fontWeight: '800' },

  // Mastery
  masteryContainer: { 
      width: '100%', 
      marginBottom: 20, 
      backgroundColor: 'rgba(15, 23, 42, 0.6)', 
      borderRadius: 16, 
      padding: 16, 
      borderWidth: 1, 
      borderColor: 'rgba(255,255,255,0.08)' 
  },
  sectionTitle: { color: '#38BDF8', fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },

  motivationBox: { paddingHorizontal: 40, marginTop: 10 },
  motivationText: { color: '#CBD5E1', textAlign: 'center', fontSize: 13, fontStyle: 'italic', opacity: 0.8 },

  // Footer & Action Button Styles (تم التنظيف)
  footerGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    zIndex: 9, 
  },
  footer: { 
      width: '100%', 
      paddingHorizontal: 24, 
      paddingBottom: Platform.OS === 'ios' ? 40 : 30, 
      position: 'absolute', 
      bottom: 0, 
      zIndex: 10,
      alignItems: 'center',
  },
  
  // New Clean Action Button Styles
  actionBtnWrapper: {
      width: '100%',
      // إعدادات الظل لـ iOS
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 16,
      // إعدادات الظل لـ Android
      elevation: 12,
  },
  touchableFill: {
      width: '100%',
  },
  btnPrimary: { 
      width: '100%', 
      height: 64, 
      flexDirection: 'row', 
      justifyContent: 'center', 
      alignItems: 'center', 
      gap: 12, 
      borderRadius: 24, 
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      borderTopColor: 'rgba(255,255,255,0.4)',
  },
  btnPrimaryText: { 
      color: 'white', 
      fontSize: 18, 
      fontWeight: '800', 
      letterSpacing: 1.5, 
      textTransform: 'uppercase',
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
  }
});