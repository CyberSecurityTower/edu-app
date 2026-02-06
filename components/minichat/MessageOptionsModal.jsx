
// components/minichat/MessageOptionsModal.jsx
import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');

const OptionItem = ({ icon, label, color, onPress, delay, isRTL }) => (
  <MotiView
    from={{ opacity: 0, translateY: 20 }}
    animate={{ opacity: 1, translateY: 0 }}
    transition={{ type: 'timing', duration: 300, delay: delay * 50 }}
  >
    <Pressable
      style={({ pressed }) => [
        styles.optionItem,
        pressed && styles.optionPressed,
        { flexDirection: isRTL ? 'row-reverse' : 'row' }
      ]}
      onPress={onPress}
    >
      <View style={[
        styles.iconBox, 
        { backgroundColor: `${color}20` },
        isRTL ? { marginLeft: 15 } : { marginRight: 15 }
      ]}>
        <FontAwesome5 name={icon} size={18} color={color} />
      </View>
      
      <Text style={[
        styles.optionText, 
        { textAlign: isRTL ? 'right' : 'left' }
      ]}>
        {label}
      </Text>
      
      <FontAwesome5 
        name={isRTL ? "chevron-left" : "chevron-right"} 
        size={12} 
        color="#475569" 
        style={{ opacity: 0.5 }} 
      />
    </Pressable>
  </MotiView>
);

const MessageOptionsModal = ({ visible, onClose, message, onAction }) => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  if (!visible || !message) return null;

  const isUser = message.type === 'user';

  // ✅ خيارات رسالة المستخدم (تم حذف الحفظ)
  const userOptions = [
    { id: 'edit', icon: 'pen', label: t('editMessage') || 'تعديل الرسالة', color: '#3B82F6' },
    { id: 'resend', icon: 'paper-plane', label: t('resend') || 'إعادة الإرسال', color: '#10B981' },
    { id: 'copy', icon: 'copy', label: t('copy') || 'نسخ النص', color: '#FBBF24' },
    { id: 'delete', icon: 'trash-alt', label: t('deleteMessage') || 'حذف الرسالة', color: '#EF4444' },
  ];

  // ✅ خيارات رسالة البوت (تم حذف الحفظ)
  const botOptions = [
    { id: 'regenerate', icon: 'sync-alt', label: t('regenerate') || 'إعادة توليد الرد', color: '#3B82F6' },
    { id: 'shorter', icon: 'compress-alt', label: t('shorter') || 'إجابة أقصر', color: '#8B5CF6' },
    { id: 'longer', icon: 'expand-alt', label: t('longer') || 'إجابة أكثر تفصيلاً', color: '#10B981' },
    { id: 'eli5', icon: 'baby', label: t('explainLike5') || 'اشرح لي كأني طفل', color: '#F59E0B' },
    { id: 'copy', icon: 'copy', label: t('copy') || 'نسخ النص', color: '#64748B' },
    { id: 'report', icon: 'flag', label: t('report') || 'تبليغ عن محتوى', color: '#EF4444' },
  ];

  const options = isUser ? userOptions : botOptions;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="fade">
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>

        <MotiView
          from={{ translateY: 300, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          exit={{ translateY: 300, opacity: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 100 }}
          style={styles.sheetContainer}
        >
          <LinearGradient
            colors={['#1E293B', '#0F172A']}
            style={styles.gradient}
          >
            <View style={styles.header}>
              <View style={styles.handle} />
              <Text style={styles.title}>{t('messageOptions') || 'خيارات الرسالة'}</Text>
            </View>

            <View style={styles.content}>
              <Text style={styles.previewText} numberOfLines={2}>
                "{message.text}"
              </Text>

              <View style={styles.separator} />

              {options.map((opt, index) => (
                <OptionItem
                  key={opt.id}
                  {...opt}
                  delay={index}
                  isRTL={isRTL}
                  onPress={() => {
                    onAction(opt.id, message);
                    onClose();
                  }}
                />
              ))}
            </View>
          </LinearGradient>
        </MotiView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheetContainer: {
    width: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  gradient: { paddingBottom: 40, paddingTop: 15 },
  header: { alignItems: 'center', marginBottom: 15 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 15 },
  title: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  content: { paddingHorizontal: 20 },
  previewText: { color: '#94A3B8', fontSize: 13, fontStyle: 'italic', marginBottom: 15, textAlign: 'center' },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 15 },
  optionItem: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)'
  },
  optionPressed: { backgroundColor: 'rgba(255,255,255,0.08)' },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  optionText: { color: 'white', fontSize: 15, fontWeight: '600', flex: 1 },
});

export default MessageOptionsModal;