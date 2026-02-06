
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLanguage } from '../../../context/LanguageContext';

// ✅ القيمة الافتراضية أصبحت 150 ميجا بايت
export default function StorageStats({ used = "0 MB", total = "150 MB" }) {
  const { t, isRTL } = useLanguage();

  // دالة تحويل الحجم إلى ميجابايت لتوحيد الحسابات
  const parseToMB = (sizeStr) => {
    if (!sizeStr || typeof sizeStr !== 'string') return 0;
    const num = parseFloat(sizeStr);
    if (isNaN(num)) return 0;
    
    if (sizeStr.toUpperCase().includes('GB')) return num * 1024;
    if (sizeStr.toUpperCase().includes('KB')) return num / 1024;
    // MB is the base
    return num; 
  };

  const usedMB = parseToMB(used);
  const totalMB = parseToMB(total); // سيكون 150 عادة
  
  // حساب النسبة المئوية
  const percentageVal = totalMB > 0 ? (usedMB / totalMB) * 100 : 0;
  const percentageDisplay = Math.min(percentageVal, 100).toFixed(0); // رقم صحيح بدون فواصل

  // ✅ منطق الألوان (نفس المنطق السابق ممتاز)
  let gradientColors = ['#38BDF8', '#3B82F6']; // أزرق (مريح)
  let isDanger = false;

  if (percentageVal >= 90) { 
      gradientColors = ['#F97316', '#EF4444']; // أحمر (خطر)
      isDanger = true;
  } else if (percentageVal >= 60) { 
      gradientColors = ['#38BDF8', '#F97316']; // برتقالي (تنبيه)
  }

  return (
    <View style={[styles.statsContainer, isDanger && styles.dangerBorder]}>
      <View style={[styles.statsTextRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <FontAwesome5 name="cloud" size={12} color="#94A3B8" />
            {/* ✅ تغيير النص إلى "الخطة المجانية" أو "التخزين السحابي" لإعطاء طابع إيجابي */}
            <Text style={styles.statsLabel}>{t('freePlan') || 'Free Plan'}</Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isDanger && (
                <FontAwesome5 name="exclamation-circle" size={12} color="#EF4444" />
            )}
            {/* ✅ عرض النسبة المئوية فقط بدلاً من الحجم الفعلي */}
            <Text style={[styles.statsValue, isDanger && { color: '#EF4444' }]}>
                {percentageDisplay}%
            </Text>
        </View>
      </View>
      
      {/* شريط التقدم */}
      <View style={styles.progressBarBg}>
        <LinearGradient 
          colors={gradientColors} 
          style={{ width: `${percentageDisplay}%`, height: '100%', borderRadius: 3 }} 
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 5 // مسافة صغيرة إضافية
  },
  dangerBorder: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)'
  },
  statsTextRow: {
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center'
  },
  statsLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600'
  },
  statsValue: {
    color: 'white', // لون أبيض ساطع للنسبة
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'] // لجعل الأرقام ثابتة العرض
  },
  progressBarBg: {
    height: 8, // زيادة السمك قليلاً لجمالية أكثر
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden'
  }
});