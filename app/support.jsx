import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLanguage } from '../context/LanguageContext'; // ✅ استيراد اللغة

const ContactOption = ({ icon, title, subtitle, onPress, gradientColors, delay, isRTL }) => (
  <Animated.View entering={FadeInDown.delay(delay).springify()}>
    <Pressable 
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card, 
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cardGradient, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        <View style={styles.iconContainer}>
          <FontAwesome5 name={icon} size={24} color="white" />
        </View>
        <View style={[styles.textContainer, isRTL ? { paddingRight: 15 } : { paddingLeft: 15 }]}>
          <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
          <Text style={[styles.cardSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{subtitle}</Text>
        </View>
        <View style={styles.arrowContainer}>
          <FontAwesome5 name={isRTL ? "chevron-left" : "chevron-right"} size={14} color="rgba(255,255,255,0.6)" />
        </View>
      </LinearGradient>
    </Pressable>
  </Animated.View>
);

export default function SupportScreen() {
  const router = useRouter();
  const { language, isRTL } = useLanguage(); // ✅ استخدام اللغة

  // --- نصوص الترجمة ---
  const translations = {
    ar: {
      headerTitle: "الدعم والتواصل",
      heroTitle: "نحن دائماً بجانبك",
      heroDesc: "سواء كان لديك استفسار، اقتراح، أو واجهت مشكلة.. فريقنا جاهز للرد عليك في أي وقت. اختر الطريقة التي تناسبك.",
      instaOfficial: "الصفحة الرسمية",
      instaCommunity: "مجتمع الطلاب",
      emailSupport: "الدعم عبر الإيميل",
      footerText: "نرد عادةً خلال أقل من 24 ساعة ⚡️"
    },
    en: {
      headerTitle: "Support & Contact",
      heroTitle: "Always By Your Side",
      heroDesc: "Whether you have a question, suggestion, or faced an issue... our team is ready to answer anytime. Choose your preferred way.",
      instaOfficial: "Official Page",
      instaCommunity: "Student Community",
      emailSupport: "Email Support",
      footerText: "We usually reply within 24 hours ⚡️"
    },
    fr: {
      headerTitle: "Support et Contact",
      heroTitle: "Toujours à vos côtés",
      heroDesc: "Que vous ayez une question, une suggestion ou un problème... notre équipe est prête à répondre. Choisissez votre méthode préférée.",
      instaOfficial: "Page Officielle",
      instaCommunity: "Communauté Étudiante",
      emailSupport: "Support par Email",
      footerText: "Nous répondons généralement en moins de 24h ⚡️"
    }
  };

  const t = translations[language] || translations.en;

  // ✅ دالة فتح الروابط المحسنة (بدون تنبيهات مزعجة)
  const openLink = async (url) => {
    try {
      // محاولة الفتح مباشرة دون التحقق المعقد الذي يسبب مشاكل في أندرويد
      await Linking.openURL(url);
    } catch (error) {
      console.error("Failed to open URL:", error);
      // في حال الفشل الحقيقي فقط (مثل عدم وجود تطبيق بريد)
      // يمكننا تجاهل الخطأ بصمت أو إظهار رسالة بسيطة جداً إذا لزم الأمر
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0F172A', '#020617']} style={StyleSheet.absoluteFill} />
      
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome5 name={isRTL ? "arrow-right" : "arrow-left"} size={20} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>{t.headerTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.heroSection}>
          <View style={styles.heroIconCircle}>
            <MaterialCommunityIcons name="heart-pulse" size={40} color="#F43F5E" />
          </View>
          <Text style={styles.heroTitle}>{t.heroTitle}</Text>
          <Text style={styles.heroDesc}>
            {t.heroDesc}
          </Text>
        </Animated.View>

        <View style={styles.optionsContainer}>
          
          {/* Instagram 1 */}
          <ContactOption 
            icon="instagram"
            title={t.instaOfficial}
            subtitle="@eduai.inc"
            gradientColors={['#833AB4', '#FD1D1D', '#F77737']}
            delay={200}
            isRTL={isRTL}
            onPress={() => openLink('https://www.instagram.com/eduai.inc/')}
          />

          {/* Instagram 2 */}
          <ContactOption 
            icon="instagram"
            title={t.instaCommunity}
            subtitle="@eduapp.inc"
            gradientColors={['#C13584', '#E1306C', '#F56040']}
            delay={300}
            isRTL={isRTL}
            onPress={() => openLink('https://www.instagram.com/eduapp.inc/')}
          />

          {/* Email */}
          <ContactOption 
            icon="envelope"
            title={t.emailSupport}
            subtitle="eduapp.now@gmail.com"
            gradientColors={['#2563EB', '#3B82F6', '#60A5FA']}
            delay={400}
            isRTL={isRTL}
            onPress={() => openLink('mailto:eduapp.now@gmail.com')}
          />

        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t.footerText}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  
  content: { flex: 1, padding: 20 },
  
  heroSection: { alignItems: 'center', marginBottom: 40, marginTop: 10 },
  heroIconCircle: { 
    width: 80, height: 80, borderRadius: 40, 
    backgroundColor: 'rgba(244, 63, 94, 0.1)', 
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)'
  },
  heroTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  heroDesc: { color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },

  optionsContainer: { gap: 15 },
  
  card: { borderRadius: 16, overflow: 'hidden', height: 80, marginBottom: 15 },
  cardGradient: { flex: 1, alignItems: 'center', paddingHorizontal: 20 },
  iconContainer: { width: 40, alignItems: 'center' },
  textContainer: { flex: 1 },
  cardTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  cardSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  arrowContainer: { opacity: 0.8 },

  footer: { marginTop: 'auto', alignItems: 'center', paddingBottom: 20 },
  footerText: { color: '#64748B', fontSize: 12, fontStyle: 'italic', textAlign: 'center' }
});