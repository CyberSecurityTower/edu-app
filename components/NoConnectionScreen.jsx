import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, ActivityIndicator } from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import NetInfo from '@react-native-community/netinfo';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function NoConnectionScreen({ onRetry }) {
  const { t } = useLanguage();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRetrying(true);
    
    // فحص حقيقي للشبكة
    const state = await NetInfo.fetch();
    
    // محاكاة تأخير بسيط لجمالية الـ UX
    setTimeout(() => {
      setIsRetrying(false);
      if (state.isConnected && state.isInternetReachable !== false) {
        if (onRetry) onRetry();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0C0F27', '#1E293B']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.content}>
        <LottieView
          // تأكد من وجود ملف لوتي مناسب، سأفترض وجود ملف اسمه no-internet.json
          // إذا لم يوجد، استخدم أي ملف مؤقت أو صورة
          source={require('../assets/images/no-internet.json')} 
          autoPlay
          
          style={styles.lottie}
        />
        
        <Text style={styles.title}>{t('noConnection') || "انقطع الاتصال"}</Text>
        <Text style={styles.subtitle}>
          {t('noConnectionMsg') || "يبدو أنك فقدت الاتصال بالإنترنت. تحقق من الشبكة وحاول مجدداً."}
        </Text>

        <Pressable 
            onPress={handleRetry} 
            disabled={isRetrying}
            style={({pressed}) => [
                styles.button,
                pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }
            ]}
        >
            <LinearGradient
                colors={['#38BDF8', '#2563EB']}
                start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                style={styles.gradientBtn}
            >
                {isRetrying ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.btnText}>{t('retry') || "إعادة المحاولة"}</Text>
                )}
            </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  content: { alignItems: 'center', paddingHorizontal: 30, width: '100%' },
  lottie: { width: 250, height: 250, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#94A3B8', textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  button: { width: '100%', maxWidth: 250, borderRadius: 16, overflow: 'hidden', elevation: 5, shadowColor: '#38BDF8', shadowOpacity: 0.3, shadowRadius: 10 },
  gradientBtn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});