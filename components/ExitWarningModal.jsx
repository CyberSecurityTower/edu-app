import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { 
    ZoomIn, 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    Easing, 
    runOnJS
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const ExitWarningModal = ({ visible, onCancel, onConfirm }) => {
    const progress = useSharedValue(100);

    useEffect(() => {
        if (visible) {
            // إعادة ضبط العداد
            progress.value = 100;
            // بدء العد التنازلي لمدة 4 ثواني (خطي)
            progress.value = withTiming(0, {
                duration: 4000,
                easing: Easing.linear
            });
        }
    }, [visible]);

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value}%`,
        backgroundColor: progress.value < 30 ? '#EF4444' : '#F59E0B' // يتحول للأحمر في النهاية
    }));

    if (!visible) return null;

    return (
        <View style={styles.alertOverlay}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
            <Animated.View entering={ZoomIn.springify()} style={styles.alertBox}>
                
                {/* 🔥 شريط التدمير الذاتي */}
                <View style={styles.timerTrack}>
                    <Animated.View style={[styles.timerFill, progressStyle]} />
                </View>

                <View style={styles.alertIconBg}>
                    <FontAwesome5 name="skull-crossbones" size={24} color="#EF4444" />
                </View>
                <Text style={styles.alertTitle}>DESERTION WARNING</Text>
                <Text style={styles.alertMessage}>
                    Retreating forfeits all rewards.{'\n'}
                    <Text style={{color: '#F59E0B', fontWeight: 'bold'}}>Make a choice before the timer ends!</Text>
                </Text>
                <View style={styles.alertButtons}>
                    <TouchableOpacity style={styles.alertBtnCancel} onPress={onCancel}>
                        <Text style={styles.alertBtnTextCancel}>STAY & FIGHT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.alertBtnConfirm} onPress={onConfirm}>
                        <Text style={styles.alertBtnTextConfirm}>RETREAT</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
  alertOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  alertBox: { 
      width: width * 0.85, 
      backgroundColor: '#0F172A', 
      borderRadius: 24, 
      padding: 24, 
      alignItems: 'center', 
      borderWidth: 1, 
      borderColor: 'rgba(239, 68, 68, 0.3)', 
      shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
      overflow: 'hidden' // مهم ليقص شريط المؤقت
  },
  
  // ستايل شريط المؤقت
  timerTrack: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: 'rgba(255,255,255,0.1)'
  },
  timerFill: {
      height: '100%',
      backgroundColor: '#F59E0B'
  },

  alertIconBg: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, marginTop: 10 },
  alertTitle: { color: '#EF4444', fontSize: 18, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  alertMessage: { color: '#94A3B8', textAlign: 'center', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  alertButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  alertBtnCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#1E293B', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  alertBtnTextCancel: { color: 'white', fontWeight: '700', fontSize: 13 },
  alertBtnConfirm: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#EF4444', alignItems: 'center' },
  alertBtnTextConfirm: { color: '#FEF2F2', fontWeight: '700', fontSize: 13 },
});

export default ExitWarningModal;