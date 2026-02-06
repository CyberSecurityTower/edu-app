import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator, // سنستخدمه للسهولة أو أيقونة تدور
} from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

const CustomAlert = ({ isVisible, onClose, title = '', message = '', buttons = [], loading = false }) => {
  
  const spinValue = useSharedValue(0);

  // أنيميشن الدوران للأيقونة
  useEffect(() => {
    if (loading) {
      spinValue.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1, false
      );
    } else {
      spinValue.value = 0;
    }
  }, [loading]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinValue.value}deg` }]
  }));

  if (!isVisible) return null;

  const safeButtons = (buttons && buttons.length > 0) 
    ? buttons 
    : [{ key: 'ok', text: 'OK', style: 'default', onPress: onClose }];

  const getIcon = () => {
    const safeTitle = String(title || '').toLowerCase();
    if (safeTitle.includes('delete') || safeTitle.includes('حذف')) return { name: 'trash-alt', color: '#F87171' };
    if (safeTitle.includes('error') || safeTitle.includes('خطأ')) return { name: 'exclamation-triangle', color: '#FBBF24' };
    if (safeTitle.includes('success') || safeTitle.includes('نجاح')) return { name: 'check-circle', color: '#10B981' };
    return { name: 'info-circle', color: '#60A5FA' };
  };

  const icon = getIcon();

  return (
    <Modal animationType="fade" transparent visible={isVisible} onRequestClose={!loading ? onClose : null} statusBarTranslucent>
      <View style={styles.overlayWrapper}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} onPress={!loading ? onClose : null} />

        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.alertContainer}
        >
          <View style={styles.iconContainer}>
            <FontAwesome5 name={icon.name} size={24} color={icon.color} />
          </View>

          <Text style={styles.title}>{String(title)}</Text>

          <ScrollView style={styles.messageWrapper} showsVerticalScrollIndicator={false}>
            <Text style={styles.message}>{String(message)}</Text>
          </ScrollView>

          <View style={styles.buttonRow}>
            {safeButtons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const isCancel = button.style === 'cancel';
              
              // التحقق هل هذا الزر هو الذي يجب أن يظهر السبينر (الزر الأساسي عند التحميل)
              const showSpinner = loading && isDestructive;

              return (
                <Pressable
                  key={index}
                  onPress={() => !loading && button.onPress && button.onPress()}
                  disabled={loading} // منع الضغط المتكرر أثناء التحميل
                  style={({ pressed }) => [
                    styles.button,
                    isDestructive && styles.destructiveButton,
                    isCancel && styles.cancelButton,
                    safeButtons.length > 1 && styles.buttonWithMargin,
                    pressed && !loading && { opacity: 0.7 },
                    loading && !isDestructive && { opacity: 0.5 } // تبهيت الأزرار الأخرى
                  ]}
                >
                  {showSpinner ? (
                    <Animated.View style={spinStyle}>
                        <FontAwesome5 name="spinner" size={16} color="white" />
                    </Animated.View>
                  ) : (
                    <Text style={[
                        styles.buttonText,
                        isDestructive && styles.destructiveText,
                        isCancel && styles.cancelText,
                      ]}
                    >
                      {button.text}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </MotiView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  alertContainer: {
    width: '85%', maxWidth: 360, backgroundColor: '#1E293B', borderRadius: 24, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', elevation: 10,
  },
  iconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  messageWrapper: { maxHeight: 150, width: '100%', marginBottom: 24 },
  message: { color: '#CBD5E1', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', width: '100%' },
  button: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: '#3B82F6', height: 50, justifyContent: 'center' },
  buttonWithMargin: { marginHorizontal: 6 },
  cancelButton: { backgroundColor: 'rgba(255,255,255,0.1)' },
  destructiveButton: { backgroundColor: '#EF4444' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  cancelText: { color: '#94A3B8' },
  destructiveText: { color: 'white' },
});

export default CustomAlert;