import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function StreakCelebrationModal({ isVisible, data, onClose }) {
  const lottieRef = useRef(null);

  useEffect(() => {
    if (isVisible) {
      // 🔥 اهتزاز قوي عند الظهور (تأثير ملموس)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (lottieRef.current) lottieRef.current.play();
    }
  }, [isVisible]);

  if (!isVisible || !data) return null;

  return (
    <Modal transparent visible={isVisible} animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />

        {/* الخلفية المتوهجة */}
        <MotiView
          from={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          style={styles.container}
        >
          <View style={styles.lottieWrapper}>
            <LottieView
              ref={lottieRef}
              source={require('../assets/images/flamefire.json')}
              autoPlay
              loop={false}
              style={styles.lottie}
              resizeMode="cover"
            />
          </View>

          <LinearGradient
            colors={['#1E293B', '#0F172A']}
            style={styles.card}
          >
            {/* أيقونة النار المتحركة */}
            <MotiView
              from={{ translateY: 20, opacity: 0 }}
              animate={{ translateY: 0, opacity: 1 }}
              delay={300}
              style={styles.iconContainer}
            >
              <LinearGradient
                colors={['#F59E0B', '#EF4444']}
                style={styles.iconBg}
              >
                <FontAwesome5 name="fire" size={40} color="white" />
              </LinearGradient>
            </MotiView>

            <Text style={styles.title}>حماس مشتعل! 🔥</Text>
            <Text style={styles.streakText}>{data.streak} أيام متتالية</Text>

            {/* عرض العملات المكتسبة */}
            <MotiView
              from={{ scale: 0 }}
              animate={{ scale: 1 }}
              delay={600}
              style={styles.rewardBox}
            >
              <FontAwesome5 name="coins" size={20} color="#FFD700" />
              <Text style={styles.rewardText}>+{data.coins} coins</Text>
            </MotiView>

            <Text style={styles.subText}>استمر هكذا، المكافآت تزيد كل 3 أيام!</Text>

            <Pressable onPress={onClose} style={styles.button}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Text style={styles.btnText}>متابعة </Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  container: { width: width * 0.85, alignItems: 'center' },
  lottieWrapper: { position: 'absolute', width: width, height: 500, top: -100, zIndex: 10, pointerEvents: 'none' },
  lottie: { width: '100%', height: '100%' },
  card: {
    width: '100%',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)', // حدود برتقالية خفيفة
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10
  },
  iconContainer: { marginBottom: 20 },
  iconBg: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: "#F59E0B", shadowOpacity: 0.6, shadowRadius: 15, elevation: 10
  },
  title: { color: 'white', fontSize: 26, fontWeight: 'bold', marginBottom: 5 },
  streakText: { color: '#FBBF24', fontSize: 18, fontWeight: '600', marginBottom: 20 },
  rewardBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 10, paddingHorizontal: 25,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.3)',
    marginBottom: 20
  },
  rewardText: { color: '#FFD700', fontSize: 22, fontWeight: 'bold' },
  subText: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 25 },
  button: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  btnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});