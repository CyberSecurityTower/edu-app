
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  FadeInDown, 
  ZoomIn 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const translations = {
  ar: {
    title: "تفاصيل التقدم",
    description: "هذا الشريط يمثل نسبة الدروس المفتوحة والمتاحة لك حالياً.",
    unlocked: "دروس مفتوحة",
    total: "إجمالي الدروس",
    remaining: "متبقي للفتح",
    close: "فهمت ذلك",
    progress: "نسبة إكمال الدروس"
  },
  en: {
    title: "Progress Details",
    description: "This bar represents the percentage of unlocked lessons available to you.",
    unlocked: "Unlocked",
    total: "Total Lessons",
    remaining: "Remaining",
    close: "Got it",
    progress: "Unlock Rate"
  },
  fr: {
    title: "Détails de la Progression",
    description: "Cette barre représente le pourcentage de leçons débloquées disponibles.",
    unlocked: "Débloquées",
    total: "Total Leçons",
    remaining: "Restant",
    close: "Compris",
    progress: "Taux d'ouverture"
  }
};

export default function ProgressDetailsModal({ visible, onClose, stats }) {
  const { language, isRTL } = useLanguage();
  const t = translations[language] || translations.en;
  
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 15 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      scale.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  // حسابات سريعة للعرض
  const percentage = Math.round((stats.unlocked / (stats.total || 1)) * 100);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        
        <Animated.View style={[styles.modalContainer, animatedContainerStyle]}>
          <LinearGradient
            colors={['#1e293b', '#0f172a']}
            style={styles.gradientCard}
          >
            {/* Header Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient colors={['#38BDF8', '#2563EB']} style={styles.iconBg}>
                <FontAwesome5 name="chart-pie" size={24} color="white" />
              </LinearGradient>
            </View>

            {/* Title & Description */}
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.description}>{t.description}</Text>

            {/* Main Circular Stat (Simulated) */}
            <View style={styles.mainStatContainer}>
              <Text style={styles.percentageText}>{percentage}%</Text>
              <Text style={styles.percentageLabel}>{t.progress}</Text>
            </View>

            {/* Stats Grid */}
            <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <StatBox 
                icon="lock-open" 
                color="#4ADE80" 
                value={stats.unlocked} 
                label={t.unlocked} 
                delay={100} 
              />
              <StatBox 
                icon="layer-group" 
                color="#F472B6" 
                value={stats.total} 
                label={t.total} 
                delay={200} 
              />
              <StatBox 
                icon="hourglass-half" 
                color="#FACC15" 
                value={stats.remaining} 
                label={t.remaining} 
                delay={300} 
              />
            </View>

            {/* Close Button */}
            <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
              <LinearGradient
                colors={['#38BDF8', '#2563EB']}
                start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>{t.close}</Text>
              </LinearGradient>
            </TouchableOpacity>

          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

// مكون فرعي للمربعات الصغيرة
const StatBox = ({ icon, color, value, label, delay }) => (
  <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.statBox}>
    <FontAwesome5 name={icon} size={16} color={color} style={{ marginBottom: 8 }} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </Animated.View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContainer: {
    width: width * 0.85,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  gradientCard: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  iconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  mainStatContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 42,
    fontWeight: '900',
    color: 'white',
    textShadowColor: 'rgba(56, 189, 248, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  percentageLabel: {
    fontSize: 12,
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: -4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  closeButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});