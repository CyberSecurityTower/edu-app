import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withSequence,
  runOnJS,
  interpolateColor,
  FadeIn
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics'; 
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

// 🌍 القاموس المعدل ليتناسب مع القيود الجديدة (9.9MB / PDF Only)
const TRANSLATIONS = {
  ar: {
    title: 'رفع ملف PDF',
    subtitle: 'سيقوم EduAI بمعالجة ملفك وتقديم محتواه بطريقة مبسطة',
    label: 'اسم المصدر',
    labelDesc: 'وصف (اختياري)',
    placeholder: 'اكتب اسمًا واضحًا لمصدر الدرس...',
    placeholderDesc: 'اكتب وصفاً قصيراً للمحتوى...',
    cancel: 'إلغاء',
    upload: 'بدء المعالجة',
    footer: 'الحد الأقصى للحجم: 9.9 ميغابايت • PDF فقط', // ✅ تم التحديث
    error: 'يرجى إدخال اسم لمصدر الملف'
  },
  en: {
    title: 'Upload PDF File',
    subtitle: 'EduAI will process and simplify your file content',
    label: 'Source Name',
    labelDesc: 'Description (Optional)',
    placeholder: 'Enter a clear name for the lesson source...',
    placeholderDesc: 'Enter a short description...',
    cancel: 'Cancel',
    upload: 'Start Processing',
    footer: 'Maximum size: 9.9 MB • PDF Only', // ✅ تم التحديث
    error: 'Please enter a source name'
  },
  fr: {
    title: 'Importer un fichier PDF',
    subtitle: 'EduAI traitera et simplifiera le contenu de votre fichier',
    label: 'Nom de la source',
    labelDesc: 'Description (Optionnel)',
    placeholder: 'Entrez un nom clair pour la leçon...',
    placeholderDesc: 'Entrez une courte description...',
    cancel: 'Annuler',
    upload: 'Lancer le traitement',
    footer: 'Taille maximale : 9.9 Mo • PDF uniquement', // ✅ تم التحديث
    error: 'Veuillez saisir un nom de source'
  }
};

export default function UploadModal({ visible, file, onClose, onConfirm }) {
  const { language, isRTL } = useLanguage();
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  // Animations Shared Values
  const translateY = useSharedValue(500);
  const opacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const inputBorderColor = useSharedValue(0);

    useEffect(() => {
    if (visible && file) {
      // ✅ المنطق الجديد: استخراج الاسم بدون الصيغة
      const originalName = file.name || '';
      const lastDotIndex = originalName.lastIndexOf('.');
      
      // إذا وجدت نقطة، احذف كل ما بعدها. إذا لم توجد، اترك الاسم كما هو.
      const nameWithoutExtension = lastDotIndex !== -1 
          ? originalName.substring(0, lastDotIndex) 
          : originalName;

      setFileName(nameWithoutExtension); // 👈 تعيين الاسم "النظيف" في حقل الإدخال
      
      setDescription('');
      setErrorVisible(false);
      inputBorderColor.value = 0;
      
      // Animation In
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, { damping: 12, stiffness: 90 });
    } else if (!visible) {
      Keyboard.dismiss();
      translateY.value = 500;
      opacity.value = 0;
    }
  }, [visible, file]);


  const handleClose = () => {
    Keyboard.dismiss();
    translateY.value = withTiming(500, { duration: 250 }, () => {
      runOnJS(onClose)();
    });
    opacity.value = withTiming(0, { duration: 200 });
  };

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    inputBorderColor.value = withTiming(1, { duration: 200 });
    setErrorVisible(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const handleUpload = () => {
    Keyboard.dismiss();
    if (fileName.trim().length === 0) {
        triggerShake();
        return;
    }
    
    // Success - تمرير الاسم والوصف
    translateY.value = withTiming(500, { duration: 250 }, () => {
        runOnJS(onConfirm)(fileName, description);
    });
    opacity.value = withTiming(0, { duration: 200 });
  };

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      inputBorderColor.value,
      [0, 1],
      ['rgba(56, 189, 248, 0.3)', 'rgba(239, 68, 68, 0.8)']
    );
    return {
      transform: [{ translateX: shakeX.value }],
      borderColor: borderColor
    };
  });

  if (!visible && opacity.value === 0) return null;

  const fileSize = file?.size ? (file.size / 1024 / 1024).toFixed(2) : '0';
  // بما أننا نقبل PDF فقط، لن نحتاج لمنطق الصورة المعقد، لكن سنتركه للامان
  const isImage = file?.mimeType?.includes('image'); 

  const textAlignStyle = { textAlign: isRTL ? 'right' : 'left' };
  const rowStyle = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  const itemReverseStyle = { flexDirection: isRTL ? 'row' : 'row-reverse' };

  return (
    <Modal transparent visible={visible} onRequestClose={handleClose} animationType="none">
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
          
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <Animated.View style={[styles.modalContent, modalAnimatedStyle]}>
                
                {/* Floating Icon */}
                <View style={styles.headerIconContainer}>
                   <View style={styles.iconCircle}>
                      <MaterialCommunityIcons name="file-upload-outline" size={32} color="#38BDF8" />
                   </View>
                </View>

                {/* Text Content */}
                <Text style={styles.title}>{t.title}</Text>
                
                {/* File Info Card */}
                <View style={[styles.fileCard, rowStyle]}>
                    <View style={[styles.fileIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                        <FontAwesome5 
                            name="file-pdf" // ✅ دائماً PDF
                            size={20} 
                            color="#EF4444" 
                        />
                    </View>
                    <View style={[styles.fileInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <Text style={styles.fileNameOriginal} numberOfLines={1}>{file?.name}</Text>
                        <Text style={styles.fileSize}>{fileSize} MB</Text>
                    </View>
                </View>

                {/* 1. Name Input */}
                <View style={styles.inputContainer}>
                    <View style={[styles.labelRow, rowStyle, { justifyContent: 'space-between' }]}>
                        <Text style={styles.label}>{t.label}</Text>
                        {errorVisible && (
                            <Animated.Text entering={FadeIn} style={styles.errorText}>{t.error}</Animated.Text>
                        )}
                    </View>
                    
                    <Animated.View style={[styles.inputWrapper, inputAnimatedStyle]}>
                        <TextInput
                            style={[styles.input, textAlignStyle]}
                            value={fileName}
                            onChangeText={(text) => {
                                setFileName(text);
                                if (errorVisible) { setErrorVisible(false); inputBorderColor.value = withTiming(0); }
                            }}
                            placeholder={t.placeholder}
                            placeholderTextColor="#64748B"
                            selectionColor="#38BDF8"
                        />
                    </Animated.View>
                </View>

                {/* 2. Description Input */}
                <View style={styles.inputContainer}>
                    <View style={[styles.labelRow, rowStyle]}>
                        <Text style={styles.label}>{t.labelDesc}</Text>
                    </View>
                    <View style={[styles.inputWrapper, { height: 80, borderColor: 'rgba(255,255,255,0.08)' }]}>
                        <TextInput
                            style={[styles.input, textAlignStyle, { height: '100%', textAlignVertical: 'top', paddingTop: 12 }]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder={t.placeholderDesc}
                            placeholderTextColor="#64748B"
                            selectionColor="#38BDF8"
                            multiline={true}
                        />
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={[styles.buttonRow, itemReverseStyle]}>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                        <Text style={styles.cancelText}>{t.cancel}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.uploadButton} 
                        onPress={handleUpload}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.uploadText}>{t.upload}</Text>
                        <FontAwesome5 
                            name={isRTL ? "arrow-left" : "arrow-right"} 
                            size={14} 
                            color="white" 
                            style={{ [isRTL ? 'marginRight' : 'marginLeft']: 8 }} 
                        />
                    </TouchableOpacity>
                </View>

                <Text style={styles.footerNote}>{t.footer}</Text>

              </Animated.View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  modalContent: {
    width: width * 0.9,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 25,
    alignItems: 'center'
  },
  headerIconContainer: {
    position: 'absolute',
    top: -32,
    alignSelf: 'center',
    backgroundColor: '#0B1220',
    padding: 6,
    borderRadius: 50,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#38BDF8',
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    marginTop: 20,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.5
  },
  fileCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12
  },
  fileInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  fileNameOriginal: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileSize: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500'
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16
  },
  labelRow: {
    marginBottom: 8,
    alignItems: 'center'
  },
  label: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    overflow: 'hidden'
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: 'white',
    fontSize: 15,
    fontWeight: '500'
  },
  buttonRow: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
    justifyContent: 'center'
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  uploadButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  cancelText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 15
  },
  uploadText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15
  },
  footerNote: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '500'
  }
});