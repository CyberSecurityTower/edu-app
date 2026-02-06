import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLanguage } from '../../../context/LanguageContext';

export default function FolderOptionsModal({ visible, onClose, folder, onOpen, onEdit, onDelete }) {
  const { t, isRTL } = useLanguage();

  if (!folder) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>

        <View style={styles.content}>
          <Text style={styles.title}>{folder.name}</Text>
          <View style={[styles.divider, { backgroundColor: folder.color || '#38BDF8' }]} />

          {/* خيار الفتح */}
          <TouchableOpacity style={[styles.optionItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={onOpen}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                <FontAwesome5 name="folder-open" size={18} color="#38BDF8" />
            </View>
            <Text style={[styles.optionText, { textAlign: isRTL ? 'right' : 'left' }]}>{t('open') || 'Open'}</Text>
          </TouchableOpacity>

          {/* خيار التعديل */}
          <TouchableOpacity style={[styles.optionItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={onEdit}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}>
                <FontAwesome5 name="edit" size={18} color="#FBBF24" />
            </View>
            <Text style={[styles.optionText, { textAlign: isRTL ? 'right' : 'left' }]}>{t('edit') || 'Edit'}</Text>
          </TouchableOpacity>

          {/* خيار الحذف */}
          <TouchableOpacity style={[styles.optionItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={onDelete}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <FontAwesome5 name="trash-alt" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.optionText, { color: '#EF4444', textAlign: isRTL ? 'right' : 'left' }]}>{t('delete') || 'Delete'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
             <Text style={styles.cancelText}>{t('cancel') || 'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  content: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  divider: { height: 3, width: 40, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  optionItem: { alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginHorizontal: 15 },
  optionText: { flex: 1, color: 'white', fontSize: 16, fontWeight: '600' },
  cancelBtn: { marginTop: 20, padding: 15, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
  cancelText: { color: '#94A3B8', fontWeight: 'bold' }
});