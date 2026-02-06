import React,  {useEffect} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

// استيراد النصوص
import { ARENA_TEXTS } from '../../data/ArenaTranslations';
// استيراد Context اللغة
import { useLanguage } from '../../context/LanguageContext'; 

import { SoundManager } from '../../utils/SoundManager'; 

// إعدادات ثابتة للأيقونات والألوان
const RULES_CONFIG = [
    { 
        id: 'app_switch', 
        icon: 'mobile-alt', 
        color: '#F59E0B' 
    },
    { 
        id: 'screenshot', 
        icon: 'eye-slash', 
        color: '#EF4444' 
    },
    { 
        id: 'three_sec', 
        icon: 'stopwatch', 
        color: '#38BDF8' 
    },
    { 
        id: 'connection', 
        icon: 'wifi', 
        color: '#10B981' 
    }
];

const RuleItem = ({ icon, title, desc, delay, color = "#EF4444", isRTL }) => (
    <Animated.View 
        entering={FadeInDown.delay(delay).springify()} 
        style={[styles.ruleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} 
    >
        <View style={[styles.iconBox, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
            <FontAwesome5 name={icon} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={[
                styles.ruleTitle, 
                { color, textAlign: isRTL ? 'right' : 'left' } 
            ]}>
                {title}
            </Text>
            <Text style={[
                styles.ruleDesc, 
                { textAlign: isRTL ? 'right' : 'left' } 
            ]}>
                {desc}
            </Text>
        </View>
    </Animated.View>
);

export const ArenaRules = ({ onAccept, onCancel }) => {
  const { language, isRTL } = useLanguage(); 
  const t = ARENA_TEXTS[language] || ARENA_TEXTS['en'];
  const rulesText = t.rules; 
useEffect(() => {
    // تحميل الأصوات عند فتح الدرس لضمان جاهزيتها
    SoundManager.loadSounds();

    return () => {
      // تنظيف: إيقاف أي أصوات عند الخروج من الدرس (اختياري، حسب رغبتك)
      SoundManager.stopAllSounds();
    };
  }, []);
  // 👇 2. دالة التعامل مع الضغط لتشغيل الصوت ثم تنفيذ الأكشن
  const handleAcceptPress = () => {
    // تشغيل صوت الكليك
    SoundManager.playSound('click');
    
    // تنفيذ دالة القبول الأصلية الممررة من الأب
    if (onAccept) {
        onAccept();
    }
  };

  // اختياري: إضافة صوت لزر التراجع أيضاً
  const handleCancelPress = () => {
    SoundManager.playSound('click');
    if (onCancel) {
        onCancel();
    }
  };

  return (
    <View style={styles.container}>
        <LinearGradient colors={['#0F172A', '#000000']} style={StyleSheet.absoluteFill} />
        
        <View style={styles.contentContainer}>
            <Animated.View entering={ZoomIn.duration(500)} style={styles.headerIcon}>
                <MaterialCommunityIcons name="shield-alert" size={60} color="#F59E0B" />
            </Animated.View>

            <Text style={styles.mainTitle}>{rulesText.title}</Text>
            <Text style={styles.subTitle}>{rulesText.subtitle}</Text>

            <ScrollView style={styles.rulesList} showsVerticalScrollIndicator={false}>
                {RULES_CONFIG.map((config, index) => {
                    const itemData = rulesText.items[config.id]; 
                    return (
                        <RuleItem 
                            key={config.id}
                            delay={100 + (index * 100)} 
                            icon={config.icon} 
                            color={config.color}
                            title={itemData?.title || "Rule"} 
                            desc={itemData?.desc || "Description"}
                            isRTL={isRTL}
                        />
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                <Text style={styles.disclaimer}>{rulesText.disclaimer}</Text>
                
                <View style={[styles.btnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {/* تم ربط زر التراجع بالدالة الجديدة (اختياري) */}
                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelPress}>
                        <Text style={styles.cancelText}>{rulesText.btn_retreat}</Text>
                    </TouchableOpacity>

                    {/* 👇 3. استخدام handleAcceptPress بدلاً من onAccept مباشرة */}
                    <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptPress}>
                        <LinearGradient 
                            colors={['#DC2626', '#991B1B']} 
                            style={[styles.gradientBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                        >
                            <Text style={styles.acceptText}>{rulesText.btn_accept}</Text>
                            <FontAwesome5 
                                name={isRTL ? "arrow-left" : "arrow-right"} 
                                size={14} 
                                color="white" 
                            />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0B1220' },
    contentContainer: { flex: 1, padding: 24, paddingTop: 60 },
    headerIcon: { alignSelf: 'center', marginBottom: 20 },
    mainTitle: { color: 'white', fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: 2, marginBottom: 5 },
    subTitle: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginBottom: 40, letterSpacing: 1 },
    
    rulesList: { flex: 1, marginBottom: 20 },
    ruleRow: { gap: 16, marginBottom: 24 },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    ruleTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
    ruleDesc: { color: '#94A3B8', fontSize: 13, lineHeight: 20 },

    footer: { gap: 15 },
    disclaimer: { color: '#64748B', fontSize: 10, textAlign: 'center', fontStyle: 'italic' },
    btnRow: { gap: 12, height: 56 },
    
    cancelBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    cancelText: { color: '#94A3B8', fontWeight: '700', fontSize: 13 },
    
    acceptBtn: { flex: 2, borderRadius: 16, overflow: 'hidden' },
    gradientBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    acceptText: { color: 'white', fontWeight: '800', fontSize: 14, letterSpacing: 1 }
});