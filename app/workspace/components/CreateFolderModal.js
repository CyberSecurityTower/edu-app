import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useLanguage } from '../../../context/LanguageContext';
import ModernFolder from './GlassFolder';

// ✅ الحد الأقصى للأحرف (20 مناسب جداً للتصميم)
const MAX_NAME_LENGTH = 25;

const FOLDER_COLORS = [
    '#F472B6', // Pink
    '#A78BFA', // Purple
    '#34D399', // Emerald Green
    '#FBBF24', // Amber
    '#FB7185', // Rose
    '#64748B'  // Slate Gray
];

export default function CreateFolderModal({ visible, onClose, onSubmit, isLoading, folderToEdit }) {
  const { t } = useLanguage();
  const [folderName, setFolderName] = useState("");
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [previewAnimation, setPreviewAnimation] = useState(false);

  useEffect(() => {
    if (visible) {
      if (folderToEdit) {
          setFolderName(folderToEdit.name || "");
          setSelectedColor(folderToEdit.color || folderToEdit.metadata?.color || FOLDER_COLORS[0]);
      } else {
          setFolderName("");
          setSelectedColor(FOLDER_COLORS[0]);
      }
    }
  }, [visible, folderToEdit]);

  useEffect(() => {
    if (!visible) return;
    setPreviewAnimation(true);
    const timer = setTimeout(() => {
        setPreviewAnimation(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [selectedColor]);

  const handleSubmit = () => {
    if (folderName.trim()) {
      onSubmit(folderName, selectedColor, folderToEdit?.id);
    }
  };

  return (
    <Modal 
        visible={visible} 
        transparent 
        animationType="slide" 
        onRequestClose={onClose}
    >
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
        >
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                    {folderToEdit ? (t('editFolder') || "Edit Folder") : (t('newFolder') || "New Folder")}
                </Text>
                
                {/* حاوية الإدخال والعداد */}
                <View style={styles.inputContainer}>
                    <TextInput 
                        style={styles.input}
                        placeholder={t('folderName') || "Folder Name"}
                        placeholderTextColor="#94A3B8"
                        value={folderName}
                        onChangeText={setFolderName}
                        autoFocus
                        maxLength={MAX_NAME_LENGTH} // ✅ منع الكتابة أكثر من الحد
                    />
                    {/* ✅ عداد الأحرف */}
                    <Text style={[
                        styles.charCounter, 
                        folderName.length === MAX_NAME_LENGTH && styles.charCounterFull
                    ]}>
                        {folderName.length}/{MAX_NAME_LENGTH}
                    </Text>
                </View>

                <Text style={styles.colorLabel}>{t('chooseTheme') || "Choose Theme"}</Text>
                <View style={styles.colorsGrid}>
                    {FOLDER_COLORS.map((color) => (
                        <TouchableOpacity 
                            key={color}
                            onPress={() => setSelectedColor(color)}
                            style={[
                                styles.colorCircle, 
                                { backgroundColor: color },
                                selectedColor === color && styles.colorSelected
                            ]}
                        >
                            {selectedColor === color && (
                                <FontAwesome5 name="check" size={14} color="white" />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.previewContainer}>
                    <Text style={styles.previewLabel}>{t('preview') || "Preview"}</Text>
                    <View style={styles.folderPreviewWrapper}>
                        <ModernFolder 
                            name={folderName || (t('newFolder') || "New Folder")} 
                            count={0} 
                            color={selectedColor} 
                            scale={1.2} 
                            isHovered={previewAnimation} 
                            isSmart={false}
                        />
                    </View>
                </View>

                <View style={styles.modalActions}>
                    <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                        <Text style={styles.cancelText}>{t('cancel') || "Cancel"}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        onPress={handleSubmit} 
                        style={[styles.createBtn, { backgroundColor: selectedColor }]}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Text style={styles.createText}>
                                {folderToEdit ? (t('save') || "Save") : (t('create') || "Create")}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center', alignItems: 'center'
  },
  modalContent: {
      width: '85%', backgroundColor: '#1E293B',
      borderRadius: 24, padding: 24,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
      shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 10
  },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  
  // ✅ تنسيقات الإدخال والعداد
  inputContainer: { marginBottom: 20 },
  input: {
      backgroundColor: '#0F172A', color: 'white',
      borderRadius: 12, padding: 14, fontSize: 16,
      borderWidth: 1, borderColor: '#334155',
      paddingRight: 50 // مساحة للعداد إذا كان داخلياً (اختياري)
  },
  charCounter: {
      position: 'absolute',
      right: 12,
      bottom: 14, // وضعه داخل الحقل على اليمين
      color: '#64748B',
      fontSize: 12,
      fontWeight: '600'
  },
  charCounterFull: {
      color: '#EF4444' // تحويل اللون للأحمر عند الوصول للحد الأقصى
  },

  colorLabel: { color: '#94A3B8', fontSize: 14, marginBottom: 10, marginLeft: 5 },
  colorsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 20 },
  colorCircle: {
      width: 36, height: 36, borderRadius: 18,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: 'transparent'
  },
  colorSelected: { borderColor: 'white', transform: [{scale: 1.1}], shadowColor: "#fff", shadowOpacity: 0.5, shadowRadius: 5 },
  
  previewContainer: {
      alignItems: 'center', marginBottom: 25, paddingVertical: 10,
      backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed'
  },
  previewLabel: {
      color: '#64748B', fontSize: 12, fontWeight: '600', marginBottom: 10,
      textTransform: 'uppercase', letterSpacing: 1
  },
  folderPreviewWrapper: { height: 130, justifyContent: 'center', alignItems: 'center' },

  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#334155', alignItems: 'center' },
  createBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelText: { color: '#E2E8F0', fontWeight: '600' },
  createText: { color: 'white', fontWeight: 'bold' }
});