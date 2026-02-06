import React, { useEffect } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions, Platform 
} from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  FadeIn, FadeOut, SlideInDown, ZoomIn, 
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// --- Imports ---
import { useLanguage } from '../../context/LanguageContext';
import { ARENA_TEXTS } from '../../data/ArenaTranslations';

const { width, height } = Dimensions.get('window');

// 🎨 مكون شارة الإحصائيات (Glass Badge)
const StatBadge = ({ icon, value, label, delay, color, isRTL }) => (
  <Animated.View 
    entering={SlideInDown.delay(delay).springify()} 
    style={styles.statBadgeWrapper}
  >
    <BlurView intensity={30} tint="dark" style={[styles.statBadge, { borderColor: color }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
         <FontAwesome5 name={icon} size={14} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </BlurView>
  </Animated.View>
);

const ArenaLobby = ({ title, questionDuration, onStart, onBack }) => {
  const { language, isRTL } = useLanguage();
  const t = ARENA_TEXTS[language] || ARENA_TEXTS.en;

  // --- Animations ---
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.5);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    // حلقة النبض (Pulse Animation)
    ringScale.value = withRepeat(
      withSequence(withTiming(1.2, { duration: 2000 }), withTiming(1, { duration: 2000 })),
      -1, true
    );
    ringOpacity.value = withRepeat(
      withSequence(withTiming(0.2, { duration: 2000 }), withTiming(0.5, { duration: 2000 })),
      -1, true
    );
    glowOpacity.value = withRepeat(
        withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }), 
        -1, true
    );
  }, []);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value
  }));

  const handleStart = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onStart();
  };

  return (
    <View style={styles.container}>
      {/* 1. خلفية متدرجة عميقة */}
      <LinearGradient 
        colors={['#020617', '#0F172A', '#020617']} 
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill} 
      />
      
      {/* 2. عناصر الخلفية المتحركة (Cyberpunk Grid Effect) */}
      <View style={styles.gridOverlay} pointerEvents="none">
          <Animated.View style={[styles.glowOrb, animatedGlowStyle]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        
        {/* --- Header --- */}
        <Animated.View entering={FadeIn.delay(200)} style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity 
            onPress={onBack} 
            style={styles.backButton}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
             <BlurView intensity={50} tint="light" style={styles.backBlur}>
                <FontAwesome5 name={isRTL ? "arrow-right" : "arrow-left"} size={16} color="white" />
             </BlurView>
          </TouchableOpacity>
          
          <View style={styles.headerTag}>
             <Text style={styles.headerTagText}>PROTOCOL OMEGA</Text>
          </View>
        </Animated.View>

        {/* --- Centerpiece (The Radar/Shield) --- */}
        <View style={styles.centerSection}>
            <View style={styles.radarContainer}>
                {/* الحلقات المتحركة */}
                <Animated.View style={[styles.pulseRing, animatedRingStyle, { borderColor: '#F59E0B' }]} />
                <Animated.View style={[styles.pulseRing, animatedRingStyle, { width: 180, height: 180, borderColor: 'rgba(245, 158, 11, 0.3)' }]} />
                
                {/* الأيقونة المركزية */}
                <Animated.View entering={ZoomIn.springify()} style={styles.mainIconWrapper}>
                    <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.iconGradient}>
                        <MaterialCommunityIcons name="shield-sword" size={60} color="white" />
                    </LinearGradient>
                </Animated.View>
            </View>

            <Animated.Text entering={FadeIn.delay(300)} style={styles.titleText}>
                {title || "TACTICAL ARENA"}
            </Animated.Text>
            
            <Animated.Text entering={FadeIn.delay(400)} style={styles.subtitleText}>
                {t.lobby.badge_live} • {t.lobby.badge_speed}
            </Animated.Text>
        </View>

        {/* --- Info Stats Grid --- */}
        <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
             <StatBadge 
                icon="clock" 
                value={`${questionDuration}s`} 
                label={t.game.timer_label} 
                delay={500} 
                color="#38BDF8" 
                isRTL={isRTL}
             />
             <StatBadge 
                icon="trophy" 
                value="Ranked" 
                label="MODE" 
                delay={600} 
                color="#F59E0B" 
                isRTL={isRTL}
             />
             <StatBadge 
                icon="bolt" 
                value="High" 
                label="INTENSITY" 
                delay={700} 
                color="#EF4444" 
                isRTL={isRTL}
             />
        </View>

        {/* --- Tactical Briefing Box --- */}
        <Animated.View entering={SlideInDown.delay(800)} style={styles.briefingWrapper}>
            <LinearGradient 
                colors={['rgba(245, 158, 11, 0.15)', 'rgba(0,0,0,0)']} 
                start={{x:0, y:0}} end={{x:1, y:0}}
                style={[
                    styles.briefingBorder, 
                    isRTL ? { borderRightWidth: 4, borderRightColor: '#F59E0B' } : { borderLeftWidth: 4, borderLeftColor: '#F59E0B' }
                ]}
            >
                <Text style={[styles.briefingTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.lobby.warning_title}
                </Text>
                <Text style={[styles.briefingBody, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.lobby.warning_body.replace('{duration}', questionDuration)}
                </Text>
            </LinearGradient>
        </Animated.View>

        {/* --- Footer / Action Button --- */}
        <Animated.View entering={SlideInDown.delay(900)} style={styles.footer}>
            <TouchableOpacity activeOpacity={0.8} onPress={handleStart}>
                <Animated.View style={styles.startButtonContainer}>
                    <LinearGradient 
                        colors={['#F59E0B', '#B45309']} 
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.startButton}
                    >
                        {/* تأثير لمعان داخل الزر */}
                        <View style={styles.btnShine} />
                        
                        <View style={[styles.btnContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <Text style={styles.btnText}>{t.lobby.btn_start}</Text>
                            <FontAwesome5 name={isRTL ? "chevron-left" : "chevron-right"} size={16} color="white" />
                        </View>
                    </LinearGradient>
                    
                    {/* الظل المتوهج */}
                    <Animated.View style={[styles.btnGlow, animatedGlowStyle]} />
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  safeArea: { flex: 1, justifyContent: 'space-between', paddingVertical: 10 },
  
  // Grid Background FX
  gridOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.3 },
  glowOrb: {
      position: 'absolute', top: -100, alignSelf: 'center',
      width: width, height: width, borderRadius: width/2,
      backgroundColor: '#F59E0B', opacity: 0.1, blurRadius: 100
  },

  // Header
  header: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginTop: 10 },
  backButton: { overflow: 'hidden', borderRadius: 20 },
  backBlur: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  headerTag: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTagText: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 2 },

  // Centerpiece
  centerSection: { alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  radarContainer: { width: 220, height: 220, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  pulseRing: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 1, opacity: 0.5 },
  mainIconWrapper: { shadowColor: '#F59E0B', shadowOffset: {width:0, height:0}, shadowOpacity: 0.5, shadowRadius: 20 },
  iconGradient: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  
  titleText: { color: 'white', fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase' },
  subtitleText: { color: '#94A3B8', fontSize: 14, marginTop: 8, letterSpacing: 2, fontWeight: '600' },

  // Stats Grid
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 20, marginTop: 20 },
  statBadgeWrapper: { flex: 1 },
  statBadge: { padding: 12, borderRadius: 16, backgroundColor: 'rgba(15, 23, 42, 0.6)', borderWidth: 1, alignItems: 'center', gap: 8 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  statValue: { color: 'white', fontSize: 16, fontWeight: '800' },
  statLabel: { color: '#64748B', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  // Briefing Box
  briefingWrapper: { marginHorizontal: 24, marginTop: 30 },
  briefingBorder: { padding: 20, backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  briefingTitle: { color: '#F59E0B', fontSize: 12, fontWeight: '800', marginBottom: 8, letterSpacing: 1 },
  briefingBody: { color: '#CBD5E1', fontSize: 13, lineHeight: 22, fontWeight: '500' },

  // Footer & Button
  footer: { padding: 24, paddingBottom: 40 },
  startButtonContainer: { width: '100%', height: 60, justifyContent: 'center', alignItems: 'center' },
  startButton: { width: '100%', height: '100%', borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', zIndex: 2 },
  btnContent: { alignItems: 'center', gap: 10 },
  btnText: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  btnShine: { position: 'absolute', top: -30, left: 0, width: '100%', height: 30, backgroundColor: 'rgba(255,255,255,0.2)', transform: [{rotate: '20deg'}] },
  
  btnGlow: { position: 'absolute', width: '90%', height: 40, backgroundColor: '#F59E0B', borderRadius: 20, top: 20, zIndex: 1, blurRadius: 20 },
});

export default ArenaLobby;