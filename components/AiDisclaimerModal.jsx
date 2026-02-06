// components/AiDisclaimerModal.jsx
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../context/LanguageContext'; // ✅ استيراد سياق اللغة

const { width } = Dimensions.get('window');

const AiDisclaimerModal = ({ isVisible, onAccept }) => {
  const { t, isRTL } = useLanguage(); // ✅ استخدام دالة الترجمة ومتغير الاتجاه

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        
        <MotiView
          from={{ opacity: 0, scale: 0.9, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          style={styles.container}
        >
          <LinearGradient
            colors={['#1E293B', '#0F172A']}
            style={styles.card}
          >
            <View style={styles.iconContainer}>
              <FontAwesome5 name="robot" size={32} color="#F59E0B" />
            </View>

            <Text style={styles.title}>{t('aiDisclaimerTitle')}</Text>
            
            <View style={styles.content}>
              <Text style={styles.text}>
                {t('aiDisclaimerBody')}
              </Text>
              
              {/* النقطة الأولى: عكس الاتجاه للعربية */}
              <View style={[styles.bulletPoint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <FontAwesome5 name="exclamation-circle" size={14} color="#F59E0B" style={{ marginTop: 4 }} />
                <Text style={[styles.bulletText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('aiDisclaimerVerify')}
                </Text>
              </View>

              {/* النقطة الثانية: عكس الاتجاه للعربية */}
              <View style={[styles.bulletPoint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <FontAwesome5 name="shield-alt" size={14} color="#38BDF8" style={{ marginTop: 4 }} />
                <Text style={[styles.bulletText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('aiDisclaimerPrivacy')}
                </Text>
              </View>
            </View>

            <Pressable onPress={onAccept} style={styles.button}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>{t('aiDisclaimerButton')}</Text>
              </LinearGradient>
            </Pressable>

          </LinearGradient>
        </MotiView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  container: { width: width * 0.85, maxWidth: 400 },
  card: { 
    borderRadius: 24, 
    padding: 24, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10
  },
  iconContainer: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  content: { width: '100%', marginBottom: 24 },
  text: { color: '#CBD5E1', fontSize: 15, lineHeight: 22, marginBottom: 16, textAlign: 'center' },
  bulletPoint: { 
    gap: 10, 
    marginBottom: 12, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    padding: 10, 
    borderRadius: 12,
    alignItems: 'flex-start'   },
  bulletText: { color: '#E2E8F0', fontSize: 14, lineHeight: 20, flex: 1 },
  button: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  buttonGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default AiDisclaimerModal;