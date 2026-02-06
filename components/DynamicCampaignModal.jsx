
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions, Image, BackHandler, Linking } from 'react-native';
import { BlurView } from 'expo-blur';
import { MotiView, AnimatePresence } from 'moti';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAppState } from '../context/AppStateContext'; 
import { logCampaignEvent } from '../services/supabaseService';
import { useLanguage } from '../context/LanguageContext'; // ✅ لدعم الاتجاه

const { width, height } = Dimensions.get('window');

// ✅ خريطة الملفات المحلية (أضف أي ملف لوتي جديد هنا)
const LOCAL_ASSETS = {
  'update': require('../assets/images/update.json'), // 👈 الملف المطلوب
  'rocket': require('../assets/images/rocket_loading.json'),
};

export default function DynamicCampaignModal({ campaign, onClose }) {
  const router = useRouter();
  const { user } = useAppState();
  const { isRTL } = useLanguage(); // ✅ تحديد الاتجاه
  const [pageIndex, setPageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  const startTimeRef = useRef(new Date());
  const sessionStartTimeRef = useRef(new Date());

  useEffect(() => {
    if (campaign) {
      setIsVisible(true);
      setPageIndex(0);
      startTimeRef.current = new Date();
      sessionStartTimeRef.current = new Date();
      trackEvent('view_start');
    }
  }, [campaign]);
  
  const config = campaign?.config || {};
  const pages = config.pages || [];
  const theme = config.theme || {};
  const currentPage = pages[pageIndex];
  const isLastPage = pageIndex === pages.length - 1;

  const trackEvent = (eventType, extraMeta = {}) => {
    if (!user?.uid || !campaign?.id) return;
    const now = new Date();
    const duration = (now - startTimeRef.current) / 1000; 
    logCampaignEvent(campaign.id, user.uid, eventType, pageIndex, parseFloat(duration.toFixed(2)), extraMeta);
    startTimeRef.current = new Date();
  };

  useEffect(() => {
    if (isVisible && config.can_dismiss === false) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => backHandler.remove();
    }
  }, [isVisible, config.can_dismiss]);

  if (!campaign || !isVisible || !currentPage) return null;

  const handleAction = async (actionType, payload) => {
    Haptics.selectionAsync();
    switch (actionType) {
      case 'open_url':
        trackEvent('click_link', { url: payload });
        try {
          await Linking.openURL(payload);
        } catch (e) {}
        break;
      case 'navigate':
        trackEvent('click_navigate', { route: payload });
        closeCampaign('navigated');
        router.push(payload);
        break;
      case 'next_page':
        if (!isLastPage) {
          trackEvent('next_page');
          setPageIndex(prev => prev + 1);
        } else {
          trackEvent('completed');
          closeCampaign('completed');
        }
        break;
      case 'dismiss':
      default:
        closeCampaign('dismissed_via_button');
        break;
    }
  };

  const closeCampaign = async (reason = 'dismissed') => {
    if (config.can_dismiss === false && reason !== 'completed' && reason !== 'navigated') return;
    const totalSessionTime = (new Date() - sessionStartTimeRef.current) / 1000;
    trackEvent('session_end', { reason, total_time_spent: totalSessionTime });
    setIsVisible(false);
    if (onClose) onClose();
  };

  // ✅ دالة عرض الميديا المحسنة
  const renderMedia = (page) => {
    // 1. فحص الملفات المحلية أولاً
    if (LOCAL_ASSETS[page.media_url]) {
        return (
            <LottieView
              source={LOCAL_ASSETS[page.media_url]}
              autoPlay loop 
              style={styles.lottieMedia}
              resizeMode="contain"
            />
        );
    }
    // 2. فحص الروابط الخارجية
    if (page.media_type === 'lottie' && page.media_url) {
        return <LottieView source={{ uri: page.media_url }} autoPlay loop style={styles.lottieMedia} />;
    }
    // 3. الصور
    if (page.media_url) {
        return <Image source={{ uri: page.media_url }} style={styles.imageMedia} resizeMode="contain" />;
    }
    return null;
  };

  const bgColors = theme.background_gradient || ['#1E293B', '#0F172A'];
  const primaryColor = theme.primary_color || '#38BDF8';
  const textColor = theme.text_color || '#FFFFFF';

  return (
    <Modal 
      visible={isVisible} 
      transparent 
      animationType="fade" 
      onRequestClose={() => { if (config.can_dismiss !== false) closeCampaign('android_back'); }}
    >
      <View style={styles.overlay}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          style={styles.container}
        >
          <LinearGradient colors={bgColors} style={styles.card}>
            
            {/* زر الإغلاق */}
            {config.can_dismiss !== false && (
              <Pressable style={styles.closeBtn} onPress={() => closeCampaign('closed_via_x')}>
                <View style={styles.closeIconBg}>
                  <Ionicons name="close" size={20} color="#94A3B8" />
                </View>
              </Pressable>
            )}

            {/* المحتوى */}
            <View style={styles.contentContainer}>
                
                {/* منطقة الميديا (اللوتي) */}
                <View style={styles.mediaWrapper}>
                  {renderMedia(currentPage)}
                </View>

                <Text style={[styles.title, { color: textColor }]}>{currentPage.title}</Text>
                <Text style={styles.body}>{currentPage.body}</Text>

                {/* 🔥 قائمة الميزات الجديدة بتصميم محسن 🔥 */}
                {currentPage.release_notes && currentPage.release_notes.length > 0 && (
                    <View style={styles.notesBox}>
                        {currentPage.release_notes.map((note, i) => (
                            <View key={i} style={[styles.noteRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <FontAwesome5 name="check-circle" size={14} color="#10B981" style={{marginTop: 3}} />
                                <Text style={[
                                    styles.noteText, 
                                    { color: textColor, textAlign: isRTL ? 'right' : 'left' }
                                ]}>
                                    {note}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* الأزرار */}
            <View style={styles.btnWrapper}>
              {currentPage.buttons && currentPage.buttons.length > 0 ? (
                currentPage.buttons.map((btn, idx) => (
                  <Pressable 
                    key={idx} 
                    onPress={() => handleAction(btn.action, btn.payload)}
                    style={{ marginBottom: 10, width: '100%' }}
                  >
                    <LinearGradient
                      colors={btn.style === 'text' ? ['transparent', 'transparent'] : [primaryColor, primaryColor]}
                      style={[styles.actionBtn, btn.style === 'text' && styles.textBtn]}
                    >
                      <Text style={[styles.btnText, btn.style === 'text' && { color: '#94A3B8' }]}>
                        {btn.text}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                ))
              ) : null}
            </View>

          </LinearGradient>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)' },
  container: { width: width * 0.85, maxWidth: 400, alignItems: 'center' },
  card: { 
    width: '100%', 
    borderRadius: 30, 
    padding: 24, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
    overflow: 'hidden'
  },
  closeBtn: { position: 'absolute', top: 15, right: 15, zIndex: 50 },
  closeIconBg: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: 6 },
  
  contentContainer: { alignItems: 'center', width: '100%', marginBottom: 20 },
  
  // ✅ التعديل هنا: زيادة الارتفاع وضمان الاحتواء
  mediaWrapper: { 
      height: 220, // زدنا الارتفاع من 180 إلى 220
      width: '100%', 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginBottom: 15,
      marginTop: 5
  },
  lottieMedia: { 
      width: '100%', 
      height: '100%' // ليأخذ حجم الحاوية بالكامل دون قص
  }, 
  imageMedia: { width: 200, height: 200 },
  
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  body: { color: '#CBD5E1', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  
  notesBox: {
      width: '100%',
      backgroundColor: 'rgba(0,0,0,0.2)', 
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
  },
  noteRow: {
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 8,
  },
  noteText: {
      fontSize: 14,
      fontWeight: '500',
      flex: 1, 
      lineHeight: 20,
  },

  btnWrapper: { width: '100%' },
  actionBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    paddingVertical: 15, borderRadius: 16, width: '100%',
  },
  textBtn: { borderWidth: 0, backgroundColor: 'transparent' },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});