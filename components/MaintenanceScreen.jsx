// components/MaintenanceScreen.jsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useLanguage } from '../context/LanguageContext';

const { width, height } = Dimensions.get('window');

export default function MaintenanceScreen() {
  const { language } = useLanguage();

  const texts = {
    ar: {
      title: "نحن نطبخ شيئاً عظيماً! 👨‍🍳",
      desc: "نقوم حالياً بتحسينات جوهرية في البنية التحتية لضمان تجربة أسرع وأذكى لك. سنعود قريباً جداً بشكل أقوى.",
      footer: "شكراً لصبرك، أنت جزء من نجاح EduApp."
    },
    en: {
      title: "We're Cooking Something Great! 👨‍🍳",
      desc: "We are currently performing essential upgrades to ensure a faster and smarter experience for you. We'll be back shortly.",
      footer: "Thanks for your patience."
    },
    fr: {
      title: "Nous préparons quelque chose de grand !",
      desc: "Nous effectuons actuellement des mises à jour essentielles pour vous garantir une expérience plus rapide et plus intelligente.",
      footer: "Merci de votre patience."
    }
  };

  const t = texts[language] || texts.en;

  return (
    <View style={styles.container}>
      {/* خلفية متدرجة فاخرة */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.content}>
        <View style={styles.lottieContainer}>
           {/* ✅ تأكد من وجود الملف */}
           <LottieView
             source={require('../assets/images/Maintenance.json')}
             autoPlay
             loop
             style={{ width: 300, height: 300 }}
           />
        </View>

        <BlurView intensity={20} tint="dark" style={styles.glassCard}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.desc}>{t.desc}</Text>
        </BlurView>

        <Text style={styles.footer}>{t.footer}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, zIndex: 99999, position: 'absolute', width, height },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  lottieContainer: { marginBottom: 30 },
  glassCard: {
    width: '100%',
    padding: 30,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    alignItems: 'center',
    overflow: 'hidden'
  },
  title: { color: '#FFD700', fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  desc: { color: '#E2E8F0', fontSize: 16, textAlign: 'center', lineHeight: 24 },
  footer: { position: 'absolute', bottom: 50, color: '#64748B', fontSize: 12, letterSpacing: 1 }
});