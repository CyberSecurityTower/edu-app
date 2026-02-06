import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Pressable, ActivityIndicator, 
  FlatList, TouchableOpacity, ScrollView, Dimensions 
} from 'react-native';
import Animated, { 
  FadeIn, FadeOut, Layout 
} from 'react-native-reanimated';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av'; // ✅ استيراد مكتبة الصوت

import { useLanguage } from '../context/LanguageContext'; 
// ✅ إضافة دالة playTextToSpeech للاستيراد
import { translateText, isArabicText, playTextToSpeech } from '../services/translationService';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_CONTENT_HEIGHT = SCREEN_HEIGHT * 0.4;

const SUPPORTED_LANGS = [
    { code: 'ar', flag: '🇸🇦' }, // 1. العربية
    { code: 'en', flag: '🇺🇸' }, // 2. الإنجليزية
    { code: 'fr', flag: '🇫🇷' }, // 3. الفرنسية
    { code: 'es', flag: '🇪🇸' }, // 4. الإسبانية (تم الرفع)
    { code: 'de', flag: '🇩🇪' }, // 5. الألمانية (تم الرفع)
    { code: 'it', flag: '🇮🇹' }, // 6. الإيطالية (تم الرفع)
    { code: 'tr', flag: '🇹🇷' }, // 7. التركية
    { code: 'ru', flag: '🇷🇺' }, // 8. الروسية
    { code: 'zh', flag: '🇨🇳' }, // 9. الصينية
    { code: 'ja', flag: '🇯🇵' }, // 10. اليابانية 
];


export const TranslationView = ({ text, onClose, onBack }) => {
  const { t, isRTL } = useLanguage(); 
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const [targetLang, setTargetLang] = useState(null);
  const [showLangPicker, setShowLangPicker] = useState(false);

  // ✅ حالات الصوت الجديدة
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const soundRef = useRef(null); // مرجع للاحتفاظ بكائن الصوت

  const getLocalizedLangName = (code) => {
      if (!code || code === 'auto') return t('lang_auto');
      return t(`lang_${code.toLowerCase()}`) || code.toUpperCase();
  };

  // تحديد اللغة التلقائي
  useEffect(() => {
    if (!text) return;
    if (!targetLang) {
        const isArabic = isArabicText(text);
        setTargetLang(isArabic ? 'en' : 'ar');
    }
  }, [text]);

  // تنفيذ الترجمة
  useEffect(() => {
    let isMounted = true;
    const performTranslation = async () => {
      if (!text || !targetLang) return;
      
      setLoading(true);
      setError(false);
      // إيقاف الصوت إذا كان يعمل عند تغيير الترجمة
      if (soundRef.current) {
          await soundRef.current.unloadAsync();
          setIsPlaying(false);
      }
      
      try {
        const data = await translateText(text, targetLang);
        if (isMounted) {
          setResult(data);
          setLoading(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    };
    performTranslation();
    return () => { isMounted = false; };
  }, [text, targetLang]);

  // ✅ تنظيف الصوت عند إغلاق المكون (Unmount)
  useEffect(() => {
      return () => {
          if (soundRef.current) {
              soundRef.current.unloadAsync();
          }
      };
  }, []);

  // ✅ دالة التعامل مع تشغيل الصوت
  const handleSpeak = async () => {
      if (!result?.translatedText) return;

      // 1. إذا كان الصوت يعمل حالياً، قم بإيقافه
      if (isPlaying && soundRef.current) {
          await soundRef.current.stopAsync();
          setIsPlaying(false);
          return;
      }

      try {
          // 2. تفعيل حالة التحميل
          setIsAudioLoading(true);
          Haptics.selectionAsync();

          // 3. جلب وتشغيل الصوت (من المفترض أن الدالة تعيد كائن الصوت جاهزاً للتشغيل)
          const sound = await playTextToSpeech(result.translatedText, targetLang);
          soundRef.current = sound;
          
          setIsAudioLoading(false);
          setIsPlaying(true);

          // 4. مراقبة انتهاء الصوت لإعادة الأيقونة
          sound.setOnPlaybackStatusUpdate(async (status) => {
              if (status.didJustFinish) {
                  setIsPlaying(false);
                  await sound.unloadAsync(); // تنظيف الذاكرة
                  soundRef.current = null;
              }
          });

      } catch (e) {
          console.log("Audio Error:", e);
          setIsAudioLoading(false);
          setIsPlaying(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
  };

  const handleCopy = async () => {
    if (result?.translatedText) {
      await Clipboard.setStringAsync(result.translatedText);
      Haptics.selectionAsync();
      onClose();
    }
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(300)} 
      exiting={FadeOut.duration(200)}
      layout={Layout.springify().damping(18).stiffness(120)}
      style={styles.container}
    >
      {/* --- Header --- */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.headerLeft}>
            {showLangPicker ? (
                <Pressable onPress={() => setShowLangPicker(false)} style={styles.iconBtn}>
                     <MaterialIcons name={isRTL ? "arrow-forward" : "arrow-back"} size={20} color="#94A3B8" />
                </Pressable>
            ) : (
                <Pressable onPress={onBack} style={styles.iconBtn}>
                     <MaterialIcons name={isRTL ? "chevron-right" : "chevron-left"} size={22} color="#94A3B8" />
                </Pressable>
            )}
        </View>

        <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => {
                Haptics.selectionAsync();
                setShowLangPicker(!showLangPicker);
            }} 
            style={[
                styles.langCapsule, 
                showLangPicker && styles.langCapsuleActive,
                { flexDirection: isRTL ? 'row-reverse' : 'row' }
            ]}
        >
            {loading && !result ? (
                 <ActivityIndicator size="small" color="#38BDF8" style={{marginHorizontal: 6}} />
            ) : (
                <>
                    <Text style={styles.langSource}>
                        {getLocalizedLangName(result?.sourceLang || 'auto')}
                    </Text>
                    <MaterialIcons name="swap-horiz" size={16} color="#64748B" style={{ marginHorizontal: 6 }} />
                    <Text style={styles.langTarget}>
                        {getLocalizedLangName(targetLang)}
                    </Text>
                    <MaterialIcons name="keyboard-arrow-down" size={16} color="#38BDF8" style={{ marginHorizontal: 4 }} />
                </>
            )}
        </TouchableOpacity>

        <Pressable onPress={onClose} style={styles.iconBtn}>
             <MaterialIcons name="close" size={20} color="#94A3B8" />
        </Pressable>
      </View>

      <View style={styles.separator} />

      {/* --- Body --- */}
      <View style={styles.bodyContainer}>
        
        {showLangPicker ? (
           <View style={styles.pickerContainer}>
               <Text style={[styles.pickerHeader, { textAlign: isRTL ? 'right' : 'left' }]}>
                   {t('selectLanguage')}
               </Text>
               <FlatList 
                 data={SUPPORTED_LANGS}
                 keyExtractor={item => item.code}
                 showsVerticalScrollIndicator={true}
                 indicatorStyle="white"
                 style={{ maxHeight: 250 }}
                 renderItem={({item}) => {
                     const isSelected = targetLang === item.code;
                     return (
                     <TouchableOpacity 
                        style={[
                            styles.langItem, 
                            isSelected && styles.langItemSelected,
                            { flexDirection: isRTL ? 'row-reverse' : 'row' }
                        ]}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setTargetLang(item.code);
                            setShowLangPicker(false);
                        }}
                     >
                         <Text style={[styles.flag, { [isRTL ? 'marginLeft' : 'marginRight']: 12 }]}>
                            {item.flag}
                         </Text>
                         <Text style={[
                             styles.langName, 
                             isSelected && styles.langNameSelected,
                             { textAlign: isRTL ? 'right' : 'left' }
                         ]}>
                             {getLocalizedLangName(item.code)}
                         </Text>
                         {isSelected && (
                             <View style={styles.checkCircle}>
                                 <FontAwesome5 name="check" size={10} color="white" />
                             </View>
                         )}
                     </TouchableOpacity>
                 )}}
               />
           </View>
        ) : (
           <>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#38BDF8" />
                <Text style={styles.loadingText}>{t('loading') || "Translating..."}</Text>
              </View>
            ) : error ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={32} color="#EF4444" />
                <Text style={styles.errorText}>{t('noConnection') || "Error"}</Text>
                <TouchableOpacity onPress={() => setTargetLang(targetLang)} style={styles.retryBtn}>
                    <Text style={styles.retryText}>{t('retry') || "Retry"}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: '100%' }}>
                  <ScrollView 
                    style={{ maxHeight: MAX_CONTENT_HEIGHT }}
                    contentContainerStyle={{ paddingVertical: 10 }}
                    showsVerticalScrollIndicator={true}
                    indicatorStyle="white"
                    persistentScrollbar={text.length > 200}
                  >
                        <Text style={[styles.originalText, { textAlign: isArabicText(text) ? 'right' : 'left' }]}>
                            {result?.originalText}
                        </Text>
                        
                        <View style={styles.textDivider}>
                            <View style={styles.dividerLine} />
                            <MaterialIcons name="translate" size={14} color="#64748B" style={styles.dividerIcon} />
                            <View style={styles.dividerLine} />
                        </View>
                        
                        <Text style={[
                            styles.translatedText, 
                            { textAlign: targetLang === 'ar' ? 'right' : 'left' } 
                        ]}>
                            {result?.translatedText}
                        </Text>
                  </ScrollView>

                  {/* Action Bar */}
                  <View style={[styles.actionBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        
                        {/* 🔊 زر السبيكر المطور */}
                        <TouchableOpacity 
                            style={[
                                styles.actionBtnSecondary, 
                                isPlaying && styles.actionBtnSecondaryActive // ستايل عند التشغيل
                            ]} 
                            onPress={handleSpeak}
                            disabled={isAudioLoading}
                        >
                             {isAudioLoading ? (
                                 <ActivityIndicator size="small" color="#94A3B8" />
                             ) : (
                                 <FontAwesome5 
                                    name={isPlaying ? "stop" : "volume-up"} 
                                    size={14} 
                                    color={isPlaying ? "#38BDF8" : "#94A3B8"} 
                                 />
                             )}
                        </TouchableOpacity>
                        
                        <View style={{flex: 1}} />

                        {/* زر النسخ */}
                        <TouchableOpacity style={[styles.actionBtnPrimary, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={handleCopy}>
                             <FontAwesome5 name="copy" size={14} color="#0F172A" />
                             <Text style={[styles.actionBtnText, { [isRTL ? 'marginRight' : 'marginLeft']: 6 }]}>
                                {t('copy')}
                             </Text>
                        </TouchableOpacity>
                  </View>
              </View>
            )}
           </>
        )}
      </View>
    </Animated.View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent', 
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 55,
  },
  iconBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  langCapsule: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  langCapsuleActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: '#38BDF8',
  },
  langSource: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  langTarget: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  separator: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', width: '100%' },
  bodyContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: { alignItems: 'center', gap: 10, padding: 20 },
  loadingText: { color: '#38BDF8', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  errorBox: { alignItems: 'center', gap: 8, padding: 20 },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  retryBtn: { marginTop: 5, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10 },
  retryText: { color: '#EF4444', fontSize: 11, fontWeight: 'bold' },
  originalText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  textDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    opacity: 0.6,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#CBD5E1' },
  dividerIcon: { marginHorizontal: 8 },
  translatedText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '700',
    lineHeight: 24,
  },
  actionBar: {
      alignItems: 'center',
      marginTop: 16,
      width: '100%',
  },
  actionBtnSecondary: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(148, 163, 184, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  // ✅ ستايل الزر عند التشغيل
  actionBtnSecondaryActive: {
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      borderColor: 'rgba(56, 189, 248, 0.3)',
      borderWidth: 1,
  },
  actionBtnPrimary: {
      alignItems: 'center',
      backgroundColor: '#38BDF8',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      shadowColor: "#38BDF8",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
  },
  actionBtnText: {
      color: '#0F172A',
      fontWeight: '700',
      fontSize: 12,
  },
  pickerContainer: { width: '100%', paddingVertical: 4 },
  pickerHeader: {
      fontSize: 11,
      color: '#94A3B8',
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 10,
      marginLeft: 4,
      letterSpacing: 0.5
  },
  langItem: {
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 4,
  },
  langItemSelected: {
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  flag: { fontSize: 18 },
  langName: { fontSize: 14, color: '#475569', fontWeight: '500', flex: 1 },
  langNameSelected: { color: '#0EA5E9', fontWeight: '700' },
  checkCircle: {
      width: 18, height: 18, borderRadius: 9, backgroundColor: '#38BDF8',
      justifyContent: 'center', alignItems: 'center'
  }
});