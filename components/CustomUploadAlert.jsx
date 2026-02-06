import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS
} from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function CustomAlert({ 
  visible, 
  type = 'info', 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "OK", 
  cancelText = "Cancel" 
}) {
  // 1. تعريف قيم الحركة يدوياً لضمان السيطرة الكاملة
  const scale = useSharedValue(0.5); // يبدأ بحجم 50%
  const opacity = useSharedValue(0); // يبدأ شفاف تماماً

  // 2. تطبيق الستايل المتحرك
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  // 3. تشغيل الحركة عند فتح المودال
  useEffect(() => {
    if (visible) {
      // إعادة القيم للصفر (للتأكد)
      scale.value = 0.5;
      opacity.value = 0;

      // التأخير البسيط هنا (setTimeout) يضمن أن الـ Layout تم حسابه بالكامل في المنتصف
      // قبل أن يراه المستخدم
      const timer = setTimeout(() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 150 });
        opacity.value = withTiming(1, { duration: 200 });
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  // دالة لإغلاق المودال بنعومة
  const handleClose = (callback) => {
    opacity.value = withTiming(0, { duration: 150 });
    scale.value = withTiming(0.8, { duration: 150 }, () => {
      if (callback) runOnJS(callback)();
    });
  };

  if (!visible) return null;

  const config = {
    success: { icon: 'check-circle', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
    error: { icon: 'times-circle', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
    warning: { icon: 'exclamation-triangle', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
    info: { icon: 'info-circle', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
    delete: { icon: 'trash-alt', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
  };

  const currentConfig = config[type] || config.info;

  return (
    <Modal 
      transparent={true} 
      visible={visible} 
      animationType="none" // نلغي أنيميشن النظام
      statusBarTranslucent={true}
      onRequestClose={() => handleClose(onCancel)}
    >
      <View style={styles.overlayWrapper}>
        {/* الخلفية */}
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />

        {/* الصندوق المتحرك */}
        <Animated.View style={[styles.alertContainer, animatedStyle]}>
          <View style={[styles.iconContainer, { backgroundColor: currentConfig.bg }]}>
            <FontAwesome5 name={currentConfig.icon} size={32} color={currentConfig.color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            {onCancel && (
              <TouchableOpacity 
                onPress={() => handleClose(onCancel)} 
                style={[styles.button, styles.cancelButton]}
              >
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              onPress={() => handleClose(onConfirm)} 
              style={[styles.button, styles.confirmButton, { backgroundColor: currentConfig.color }]}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  alertContainer: {
    width: width * 0.85,
    maxWidth: 400,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelText: {
    color: '#E2E8F0',
    fontWeight: '600',
  },
  confirmText: {
    color: 'white',
    fontWeight: '700',
  }
});