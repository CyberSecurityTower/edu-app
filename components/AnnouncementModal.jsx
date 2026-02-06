// components/AnnouncementModal.jsx
import React, { useEffect, useRef } from 'react'; // ✅ أضفنا useRef
import { View, Text, StyleSheet, Modal, Pressable, Dimensions, Linking, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

// ✅ استيراد السياق والخدمة
import { useAppState } from '../context/AppStateContext';
import { logCampaignEvent } from '../services/supabaseService';

const { width } = Dimensions.get('window');

const TYPE_CONFIG = {
  // ... (نفس التكوين السابق)
  update: { colors: ['#3B82F6', '#2563EB'], lottie: require('../assets/images/rocket_loading.json'), titleColor: '#60A5FA' },
  warning: { colors: ['#F59E0B', '#D97706'], lottie: require('../assets/images/Alert.json'), titleColor: '#FBBF24' },
  success: { colors: ['#10B981', '#059669'], lottie: require('../assets/images/confetti.json'), titleColor: '#34D399' },
  info: { colors: ['#8B5CF6', '#6D28D9'], lottie: require('../assets/images/Info.json'), titleColor: '#A78BFA' }
};

export default function AnnouncementModal({ isVisible, onClose, data }) {
  const { user } = useAppState(); // ✅ جلب المستخدم
  const startTime = useRef(new Date()); // ✅ لتتبع الوقت

  // ✅ تفعيل التتبع عند الظهور
  useEffect(() => {
    if (isVisible && data?.id && user?.uid) {
      startTime.current = new Date();
      logCampaignEvent(data.id, user.uid, 'view_modal');
    }
  }, [isVisible, data, user]);

  if (!data) return null;

  const config = TYPE_CONFIG[data.type] || TYPE_CONFIG.info;

  const renderIcon = () => {
    if (data.image_url && data.image_url.startsWith('http')) {
        return <Image source={{ uri: data.image_url }} style={styles.customImage} />;
    }
    return <LottieView source={config.lottie} autoPlay loop style={styles.lottie} />;
  };

  // ✅ دالة مساعدة لحساب الوقت وتسجيل الحدث
  const trackAndClose = (actionType) => {
    if (data?.id && user?.uid) {
        const duration = (new Date() - startTime.current) / 1000;
        logCampaignEvent(data.id, user.uid, actionType, 0, duration);
    }
    onClose();
  };

  const handleAction = () => {
    Haptics.selectionAsync();
    
    // ✅ تسجيل الضغطة
    if (data?.id && user?.uid) {
        logCampaignEvent(data.id, user.uid, 'click_action', 0, 0, { url: data.action_link });
    }

    if (data.action_link) {
      Linking.openURL(data.action_link);
    }
    
    trackAndClose('action_taken'); // إغلاق مع تسجيل أن الإجراء تم
  };

  const handleDismiss = () => {
      trackAndClose('dismiss'); // إغلاق عادي
  };

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        
        <MotiView
          from={{ opacity: 0, scale: 0.8, translateY: 50 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          style={styles.container}
        >
          <View style={[styles.glow, { backgroundColor: config.colors[0] }]} />

          <LinearGradient
            colors={['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 0.98)']}
            style={styles.card}
          >
            {/* ✅ استخدام دالة الإغلاق الجديدة */}
            <Pressable style={styles.closeBtn} onPress={handleDismiss}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </Pressable>

            <View style={styles.iconContainer}>
               {renderIcon()}
            </View>

            <Text style={[styles.title, { color: config.titleColor }]}>{data.title}</Text>
            <Text style={styles.message}>{data.message}</Text>

            <Pressable onPress={handleAction}>
              <LinearGradient
                colors={config.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtn}
              >
                <Text style={styles.btnText}>{data.action_text || "حسناً، فهمت"}</Text>
                {data.action_link && <Ionicons name="arrow-forward" size={18} color="white" style={{marginLeft: 8}} />}
              </LinearGradient>
            </Pressable>

          </LinearGradient>
        </MotiView>
      </View>
    </Modal>
  );
}

// ... Styles (نفس الستايل السابق)
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  container: { width: width * 0.85, alignItems: 'center' },
  glow: { position: 'absolute', width: '100%', height: '100%', borderRadius: 30, opacity: 0.4, transform: [{ scale: 1.05 }] },
  card: { width: '100%', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', elevation: 10 },
  closeBtn: { position: 'absolute', top: 15, right: 15, padding: 5, zIndex: 10 },
  iconContainer: { height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  lottie: { width: 150, height: 150 },
  customImage: { width: 100, height: 100, resizeMode: 'contain' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  message: { color: '#CBD5E1', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 16, minWidth: 180 },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});