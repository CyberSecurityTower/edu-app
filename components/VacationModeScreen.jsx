
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../context/LanguageContext'; // تأكد من المسار الصحيح

const { width } = Dimensions.get('window');

const TEXTS = {
  ar: {
    title: "إجازة سعيدة! ☀️",
    message: "نتمنى لك عطلة صيفية ممتعة ومليئة بالراحة.\nنراك مجدداً عند الدخول المدرسي القادم!",
    footer: "استمتع بوقتك 🏖️"
  },
  en: {
    title: "Happy Holidays! ☀️",
    message: "We wish you a fun and relaxing summer vacation.\nSee you next school year!",
    footer: "Enjoy your time 🏖️"
  },
  fr: {
    title: "Bonnes Vacances ! ☀️",
    message: "Nous vous souhaitons d'agréables vacances d'été.\nÀ la prochaine rentrée scolaire !",
    footer: "Profitez bien 🏖️"
  }
};

export default function VacationModeScreen() {
  const { language } = useLanguage();
  const t = TEXTS[language] || TEXTS.en;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        <View style={styles.lottieContainer}>
          {/* تأكد من وجود ملف vacation.json في مجلد الصور */}
          <LottieView
            source={require('../assets/images/vacation.json')}
            autoPlay
            loop
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.message}>{t.message}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t.footer}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0F27', // نفس لون خلفية التطبيق
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  lottieContainer: {
    width: width * 0.8,
    height: width * 0.8,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#38BDF8', // اللون الأزرق المميز للتطبيق
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
    opacity: 0.9,
  },
  footer: {
    paddingBottom: 40,
    opacity: 0.6,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  }
});