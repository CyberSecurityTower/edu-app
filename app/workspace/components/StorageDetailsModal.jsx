
import React, { useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, Dimensions 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, useAnimatedStyle, withSpring, withTiming, FadeInDown 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../../context/LanguageContext';

const { width } = Dimensions.get('window');

// تحويل النصوص (مثل "50 MB") إلى رقم (ميجابايت) للحسابات
const parseSizeToMB = (sizeStr) => {
    if (!sizeStr || typeof sizeStr !== 'string') return 0;
    const num = parseFloat(sizeStr);
    if (isNaN(num)) return 0;
    
    if (sizeStr.toUpperCase().includes('GB')) return num * 1024;
    if (sizeStr.toUpperCase().includes('KB')) return num / 1024;
    return num; // Default is MB
};

export default function StorageDetailsModal({ visible, onClose, usedString = "0 MB", fileCount = 0 }) {
  const { t, isRTL } = useLanguage();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  // الثابت: 150 ميجا
  const TOTAL_LIMIT_MB = 150;
  
  // الحسابات
  const usedMB = parseSizeToMB(usedString);
  const freeMB = Math.max(0, TOTAL_LIMIT_MB - usedMB);
  const percentage = Math.min((usedMB / TOTAL_LIMIT_MB) * 100, 100);
  
  // تنسيق الأرقام للعرض
  const freeString = freeMB < 1 
      ? `${(freeMB * 1024).toFixed(0)} KB` 
      : `${freeMB.toFixed(1)} MB`;

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12 });
      opacity.value = withTiming(1);
    } else {
      scale.value = withTiming(0.8);
      opacity.value = withTiming(0);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value
  }));

  // تحديد اللون بناءً على الاستهلاك
  let progressColors = ['#38BDF8', '#3B82F6']; // أزرق
  if (percentage > 90) progressColors = ['#F87171', '#EF4444']; // أحمر
  else if (percentage > 70) progressColors = ['#FBBF24', '#F59E0B']; // برتقالي

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>

        <Animated.View style={[styles.modalContent, animatedStyle]}>
            
            {/* Header Icon */}
            <View style={styles.iconHeader}>
                <View style={styles.iconCircle}>
                    <FontAwesome5 name="cloud" size={32} color="#38BDF8" />
                </View>
            </View>

            <Text style={styles.title}>{t('storageDetailsTitle')}</Text>
            <Text style={styles.planName}>{t('eduCloudPlan')}</Text>

            <Text style={styles.description}>
                {t('storageDescription')}
            </Text>

            {/* Progress Bar Section */}
            <View style={styles.progressSection}>
                <View style={[styles.progressRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.percentageText}>{percentage.toFixed(1)}%</Text>
                    {percentage > 90 && (
                        <Text style={styles.warningText}>{t('storageFullWarning')}</Text>
                    )}
                </View>
                <View style={styles.track}>
                    <LinearGradient
                        colors={progressColors}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={[styles.bar, { width: `${percentage}%` }]}
                    />
                </View>
            </View>

            {/* Stats Grid */}
            <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                
                {/* Total Files */}
                <View style={styles.statItem}>
                    <View style={[styles.statIcon, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                        <FontAwesome5 name="file-alt" size={16} color="#A855F7" />
                    </View>
                    <Text style={styles.statValue}>{fileCount}</Text>
                    <Text style={styles.statLabel}>{t('totalFiles')}</Text>
                </View>

                <View style={styles.divider} />

                {/* Used Space */}
                <View style={styles.statItem}>
                    <View style={[styles.statIcon, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                        <FontAwesome5 name="chart-pie" size={16} color="#38BDF8" />
                    </View>
                    <Text style={[styles.statValue, { color: '#38BDF8' }]}>{usedString}</Text>
                    <Text style={styles.statLabel}>{t('usedSpace')}</Text>
                </View>

                <View style={styles.divider} />

                {/* Free Space */}
                <View style={styles.statItem}>
                    <View style={[styles.statIcon, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                        <FontAwesome5 name="check-circle" size={16} color="#22C55E" />
                    </View>
                    <Text style={[styles.statValue, { color: '#22C55E' }]}>{freeString}</Text>
                    <Text style={styles.statLabel}>{t('freeSpace')}</Text>
                </View>

            </View>

            {/* Close Button */}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeText}>{t('close')}</Text>
            </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)'
  },
  modalContent: {
      width: width * 0.88,
      backgroundColor: '#0F172A',
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10
  },
  iconHeader: {
      marginTop: -45, marginBottom: 15,
      backgroundColor: '#0F172A',
      padding: 6, borderRadius: 50
  },
  iconCircle: {
      width: 70, height: 70, borderRadius: 35,
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.3)',
      shadowColor: "#38BDF8", shadowOpacity: 0.3, shadowRadius: 10
  },
  title: {
      color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 4
  },
  planName: {
      color: '#38BDF8', fontSize: 14, fontWeight: '600', marginBottom: 15,
      textTransform: 'uppercase', letterSpacing: 1
  },
  description: {
      color: '#94A3B8', fontSize: 14, textAlign: 'center',
      lineHeight: 20, marginBottom: 25, paddingHorizontal: 10
  },
  progressSection: {
      width: '100%', marginBottom: 25
  },
  progressRow: {
      flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center'
  },
  percentageText: {
      color: 'white', fontWeight: 'bold', fontSize: 16
  },
  warningText: {
      color: '#EF4444', fontSize: 12, fontWeight: '600'
  },
  track: {
      height: 10, backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 5, overflow: 'hidden'
  },
  bar: {
      height: '100%', borderRadius: 5
  },
  statsGrid: {
      flexDirection: 'row', justifyContent: 'space-between',
      width: '100%', marginBottom: 25,
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderRadius: 16, padding: 15
  },
  statItem: {
      alignItems: 'center', flex: 1
  },
  statIcon: {
      width: 32, height: 32, borderRadius: 10,
      justifyContent: 'center', alignItems: 'center', marginBottom: 8
  },
  statValue: {
      color: 'white', fontSize: 14, fontWeight: 'bold', marginBottom: 4
  },
  statLabel: {
      color: '#64748B', fontSize: 11, textAlign: 'center'
  },
  divider: {
      width: 1, height: '80%', backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center'
  },
  closeBtn: {
      width: '100%', paddingVertical: 14,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 14, alignItems: 'center'
  },
  closeText: {
      color: 'white', fontWeight: 'bold', fontSize: 15
  }
});