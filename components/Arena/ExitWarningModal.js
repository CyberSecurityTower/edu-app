import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { ZoomIn } from 'react-native-reanimated';

// --- Imports ---
import { ARENA_TEXTS } from '../../data/ArenaTranslations'; // استيراد ملف الترجمة
import { useLanguage } from '../../context/LanguageContext'; // استيراد هوك اللغة

const { width } = Dimensions.get('window');

const ExitWarningModal = ({ visible, onCancel, onConfirm }) => {
    // 1. تفعيل اللغة
    const { language, isRTL } = useLanguage();
    const t = ARENA_TEXTS[language] || ARENA_TEXTS.en;

    if (!visible) return null;

    return (
        <View style={styles.alertOverlay}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
            <Animated.View entering={ZoomIn.springify()} style={styles.alertBox}>
                <View style={styles.alertIconBg}>
                    <FontAwesome5 name="skull-crossbones" size={24} color="#EF4444" />
                </View>

                {/* 2. ترجمة العنوان */}
                <Text style={styles.alertTitle}>{t.modals.exit_title}</Text>
                
                {/* 3. ترجمة الرسالة */}
                <Text style={styles.alertMessage}>
                    {t.modals.exit_msg}
                </Text>

                {/* 4. عكس اتجاه الأزرار حسب اللغة (row-reverse للعربية) */}
                <View style={[styles.alertButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {/* زر البقاء (إلغاء الخروج) */}
                    <TouchableOpacity style={styles.alertBtnCancel} onPress={onCancel}>
                        <Text style={styles.alertBtnTextCancel}>{t.modals.btn_stay}</Text>
                    </TouchableOpacity>
                    
                    {/* زر المغادرة (تأكيد الخروج) */}
                    <TouchableOpacity style={styles.alertBtnConfirm} onPress={onConfirm}>
                        <Text style={styles.alertBtnTextConfirm}>{t.modals.btn_leave}</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
  alertOverlay: { 
      ...StyleSheet.absoluteFillObject, 
      justifyContent: 'center', 
      alignItems: 'center', 
      zIndex: 999 
  },
  alertBox: { 
      width: width * 0.85, 
      backgroundColor: '#0F172A', 
      borderRadius: 24, 
      padding: 24, 
      alignItems: 'center', 
      borderWidth: 1, 
      borderColor: 'rgba(239, 68, 68, 0.3)', 
      shadowColor: '#000', 
      shadowOpacity: 0.5, 
      shadowRadius: 20, 
      elevation: 10 
  },
  alertIconBg: { 
      width: 60, 
      height: 60, 
      borderRadius: 30, 
      backgroundColor: 'rgba(239, 68, 68, 0.1)', 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginBottom: 16 
  },
  alertTitle: { 
      color: '#EF4444', 
      fontSize: 18, 
      fontWeight: '800', 
      letterSpacing: 1, 
      marginBottom: 8,
      textAlign: 'center'
  },
  alertMessage: { 
      color: '#94A3B8', 
      textAlign: 'center', 
      fontSize: 14, 
      lineHeight: 22, 
      marginBottom: 24 
  },
  alertButtons: { 
      flexDirection: 'row', // يتم تجاوزها ديناميكياً في الكود أعلاه
      gap: 12, 
      width: '100%' 
  },
  alertBtnCancel: { 
      flex: 1, 
      paddingVertical: 14, 
      borderRadius: 14, 
      backgroundColor: '#1E293B', 
      alignItems: 'center' 
  },
  alertBtnTextCancel: { 
      color: 'white', 
      fontWeight: '700', 
      fontSize: 13 
  },
  alertBtnConfirm: { 
      flex: 1, 
      paddingVertical: 14, 
      borderRadius: 14, 
      backgroundColor: '#EF4444', 
      alignItems: 'center' 
  },
  alertBtnTextConfirm: { 
      color: '#FEF2F2', 
      fontWeight: '700', 
      fontSize: 13 
  },
});

export default ExitWarningModal;