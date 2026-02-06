
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay } from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function PenaltyModal({ isVisible, data, onClose }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      // 📳 اهتزاز قوي عند الخسارة
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      scale.value = withSpring(1, { damping: 12 });
    } else {
      scale.value = 0;
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!isVisible || !data) return null;

  return (
    <Modal transparent visible={isVisible} animationType="fade">
      <View style={styles.overlay}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        
        <Animated.View style={[styles.card, animatedStyle]}>
          {/* أيقونة حزينة أو قلب مكسور */}
          <View style={styles.iconContainer}>
            <LottieView 
                source={require('../assets/images/SadStar.json')} // تأكد من وجود ملف Lottie مناسب
                autoPlay 
                loop={false} 
                style={{ width: 120, height: 120 }} 
            />
          </View>

          <Text style={styles.title}>أوه لا! انقطع الستريك 😢</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              لقد فقدت ستريك <Text style={styles.boldRed}>{data.lostStreak} يوم</Text>
            </Text>
            {data.deductedCoins > 0 && (
                <Text style={styles.infoText}>
                تم خصم <Text style={styles.boldRed}>{data.deductedCoins} عملة</Text> كغرامة
                </Text>
            )}
          </View>

          <Text style={styles.motivation}>
            لا تستسلم! ابدأ من جديد اليوم واثبت التزامك 💪
          </Text>

          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>سأعود أقوى</Text>
          </Pressable>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  card: { width: width * 0.85, backgroundColor: '#1E293B', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' },
  iconContainer: { marginBottom: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#EF4444', marginBottom: 15, textAlign: 'center' },
  infoBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 15, borderRadius: 12, width: '100%', marginBottom: 20, alignItems: 'center' },
  infoText: { color: '#E2E8F0', fontSize: 16, marginBottom: 5, textAlign: 'center' },
  boldRed: { color: '#F87171', fontWeight: 'bold' },
  motivation: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginBottom: 25, lineHeight: 20 },
  button: { backgroundColor: '#EF4444', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});