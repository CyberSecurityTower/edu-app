// minichat/ChatInputArea.jsx

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Text,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming, 
  withDelay,
  interpolate, 
  Extrapolate,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker'; 
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';

// Imports
import DynamicIslandInput from '../DynamicIslandInput'; 
import AttachmentPreview from '../AttachmentPreview';
import VoiceMessagePlayer from './VoiceMessagePlayer'; // ✅ استيراد المشغل
import { useLanguage } from '../../context/LanguageContext';
import { useAudioRecorder } from '../../hooks/useAudioRecorder'; 
import CustomAlert from '../CustomAlert'; 

// --- Constants ---
const NUM_BARS = 25; 
const MAX_TOTAL_SIZE_MB = 45;
const MAX_TOTAL_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;
const MAX_RECORDING_TIME_SEC = 120; 

const SIZE_ALERTS = {
  ar: {
    title: "تجاوز الحد المسموح ⚠️",
    message: `عذراً، إجمالي حجم الملفات يجب ألا يتجاوز ${MAX_TOTAL_SIZE_MB} ميغابايت.`,
    btn: "حسناً"
  },
  en: {
    title: "Size Limit Exceeded ⚠️",
    message: `Sorry, total file size must not exceed ${MAX_TOTAL_SIZE_MB}MB.`,
    btn: "OK"
  },
  fr: {
    title: "Limite de taille dépassée ⚠️",
    message: `Désolé, la taille totale des fichiers ne doit pas dépasser ${MAX_TOTAL_SIZE_MB} Mo.`,
    btn: "D'accord"
  }
};

const SmartWaveBar = ({ index, metering, isRecording }) => {
  const delay = index * 40; 
  const animatedStyle = useAnimatedStyle(() => {
    if (!isRecording.value) {
      return {
        height: withTiming(4, { duration: 300 }),
        opacity: withTiming(0.3, { duration: 300 }),
        backgroundColor: '#94A3B8'
      };
    }
    let db = metering.value;
    if (db < -60) db = -60;
    const normalizedVolume = interpolate(db, [-60, -10], [0, 1], Extrapolate.CLAMP);
    const targetHeight = 6 + (normalizedVolume * 30);
    return {
      height: withDelay(delay, withSpring(targetHeight, { damping: 12 })),
      opacity: 1,
      backgroundColor: '#F43F5E',
    };
  });
  return <Animated.View style={[{ width: 4, borderRadius: 2, marginHorizontal: 2 }, animatedStyle]} />;
};

const WaveVisualizer = ({ metering, isRecording }) => (
  <View style={styles.wavesContainer}>
    {Array.from({ length: NUM_BARS }).map((_, i) => (
      <SmartWaveBar key={i} index={i} metering={metering} isRecording={isRecording} />
    ))}
  </View>
);

const getActiveIconType = (attachments, webEnabled) => {
  if (webEnabled) return 'web';
  if (!attachments || attachments.length === 0) return null; 

  if (attachments.length === 1) return attachments[0].type;
  const firstType = attachments[0].type;
  const allSameType = attachments.every(item => item.type === firstType);

  return allSameType ? firstType : 'mixed';
};

// --- Main Component ---
export default function ChatInputArea({
  promptText,
  setPromptText,
  attachments = [],
  setAttachments,
  isSending,
  onSendPress,
  onStopPress,
  onMicPress, 
  setWebSearchEnabled,
  webSearchEnabled,
  accentColor = '#0EA5A4'
}) {
  const { t, language } = useLanguage(); 
  
  // ✅ حالة لتخزين الملف الصوتي مؤقتاً للمراجعة
  const [tempAudioFile, setTempAudioFile] = useState(null);

  // ✅ Ref لمنع استدعاء الإيقاف مرتين (يحل مشكلة Recorder does not exist)
  const isStoppingRef = useRef(false);

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: []
  });

  const metering = useSharedValue(-160);
  const isRecordingShared = useSharedValue(false);
  const layerOpacity = useSharedValue(0); 
  const shakeTranslate = useSharedValue(0);

  // ✅ دالة لاستلام التسجيل وحفظه للمراجعة بدلاً من إرساله فوراً
  const handleRecordingFinished = useCallback((audioFile) => {
    isStoppingRef.current = false; // إعادة تعيين الفلاغ
    if (audioFile) {
        setTempAudioFile(audioFile); 
    }
  }, []);

  const { 
    isRecordingState, 
    timer, 
    startRecording, 
    stopAndSend, 
    cancelRecording 
  } = useAudioRecorder({
    metering,
    isRecordingShared,
    layerOpacity,
    shakeTranslate,
    onSend: handleRecordingFinished // ✅ نربط الدالة هنا
  });

  // ✅ دالة آمنة لإيقاف التسجيل
  const safeStopRecording = useCallback(() => {
    if (isRecordingState && !isStoppingRef.current) {
        isStoppingRef.current = true;
        stopAndSend();
    }
  }, [isRecordingState, stopAndSend]);

  // ✅ مراقب الوقت (حد الدقيقتين)
  useEffect(() => {
    if (isRecordingState && timer) {
        const [mins, secs] = timer.split(':').map(Number);
        const totalSeconds = (mins * 60) + secs;

        if (totalSeconds >= MAX_RECORDING_TIME_SEC && !isStoppingRef.current) {
            safeStopRecording(); // 🛑 إيقاف آمن

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setAlertConfig({
                visible: true,
                title: t('timeLimitReached') || "انتهى الوقت المحدد ⏱️",
                message: t('recordingSavedReview') || "تم إيقاف التسجيل لأنه تجاوز دقيقتين. التسجيل محفوظ ويمكنك مراجعته.",
                buttons: [{ 
                    text: t('ok') || "حسناً", 
                    style: 'default', 
                    onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) 
                }]
            });
        }
    }
  }, [timer, isRecordingState, safeStopRecording, t]);

  // --- Helper Functions ---

  const getAssetSize = (asset) => {
    return asset.fileSize || asset.size || 0;
  };

  const showCustomAlert = (titleKey, messageKey) => {
     setAlertConfig({
        visible: true,
        title: t(titleKey) || 'Error',
        message: t(messageKey) || 'Something went wrong',
        buttons: [{ text: 'OK', style: 'cancel', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
     });
  };

  const validateAndAddAttachments = (newAssets, forcedType = null) => {
    const currentTotalSize = attachments.reduce((sum, item) => sum + (item.size || 0), 0);
    
    let newTotalSize = currentTotalSize;
    const assetsToAdd = [];
    let sizeExceeded = false;

    newAssets.forEach(asset => {
      const assetSize = getAssetSize(asset);
      if (newTotalSize + assetSize > MAX_TOTAL_BYTES) {
        sizeExceeded = true;
      } else {
        newTotalSize += assetSize;
        const type = forcedType || (asset.type === 'video' ? 'video' : 'image');
        assetsToAdd.push({
          id: Date.now().toString() + Math.random().toString().slice(0, 5),
          uri: asset.uri,
          type: type, 
          name: asset.name || asset.fileName || `file_${Date.now()}`,
          mimeType: asset.mimeType,
          size: assetSize,
          width: asset.width,
          height: asset.height,
          duration: asset.duration
        });
      }
    });

    if (sizeExceeded) {
      const currentLang = language || 'en';
      const alertTexts = SIZE_ALERTS[currentLang] || SIZE_ALERTS.en;
      setAlertConfig({
        visible: true,
        title: alertTexts.title,
        message: alertTexts.message,
        buttons: [
          { 
            text: alertTexts.btn, 
            style: 'cancel', 
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) 
          }
        ]
      });
    }

    if (assetsToAdd.length > 0) {
      setAttachments(prev => [...prev, ...assetsToAdd]);
    }
  };

  // --- Pickers ---

  const pickMedia = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, 
        allowsMultipleSelection: true, 
        quality: 0.8, 
      });

      if (!result.canceled) {
        validateAndAddAttachments(result.assets);
      }
    } catch (error) {
      console.log('Error picking media:', error);
      showCustomAlert('error', 'Error picking media');
    }
  };

  const launchSystemCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showCustomAlert('permissionRequired', 'Camera permission is required');
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, 
        quality: 0.8,
        allowsEditing: false, 
      });

      if (!result.canceled && result.assets.length > 0) {
        validateAndAddAttachments([result.assets[0]]);
      }
    } catch (error) {
      console.log('Error launching camera:', error);
      showCustomAlert('error', 'Error launching camera');
    }
  };

  const pickDocument = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: '*/*', 
            copyToCacheDirectory: true,
            multiple: true
        });

        if (!result.canceled && result.assets) {
            validateAndAddAttachments(result.assets, 'file');
        }
    } catch (err) {
        console.log("Document Picker Error:", err);
        showCustomAlert('error', 'Error picking document');
    }
  };

  const handleActionSelect = async (type) => {
    if (type === 'web') {
        setWebSearchEnabled(prev => !prev); 
    } else if (type === 'image' || type === 'gallery') {
        await pickMedia(); 
    } else if (type === 'camera') {
        await launchSystemCamera(); 
    } else if (type === 'file') {
        await pickDocument(); 
    }
  };

  const handleRemoveAttachment = (id) => {
    setAttachments(prev => prev.filter(item => item.id !== id));
  };

  const activeIconType = useMemo(() => {
    return getActiveIconType(attachments, webSearchEnabled);
  }, [attachments, webSearchEnabled]);

  const inputLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(layerOpacity.value, [0, 1], [1, 0]),
    transform: [{ translateY: interpolate(layerOpacity.value, [0, 1], [0, 20]) }],
    zIndex: layerOpacity.value < 0.5 ? 10 : 0,
    pointerEvents: layerOpacity.value > 0.5 ? 'none' : 'auto',
  }));

  const waveLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(layerOpacity.value, [0, 1], [0, 1]),
    transform: [
      { translateY: interpolate(layerOpacity.value, [0, 1], [-20, 0]) + shakeTranslate.value }, 
    ],
    zIndex: layerOpacity.value > 0.5 ? 10 : 0,
  }));

  // ✅ تأكيد إرسال الصوت
  const confirmAudioSend = () => {
    if (tempAudioFile) {
        onMicPress(tempAudioFile); // إرسال للأب
        setTempAudioFile(null); // تنظيف
    }
  };

  // ✅ إلغاء (حذف) الصوت
  const cancelAudioReview = () => {
    setTempAudioFile(null);
  };

  // --- Render Action Button ---
  const renderRightButton = () => {
    if (isSending) {
      return (
        <MotiView
          from={{ scale: 0 }} 
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          key="stop-btn"
        >
          <Pressable onPress={onStopPress} style={[styles.actionBtn, styles.stopBtn]}>
              <MaterialCommunityIcons name="stop" size={20} color="white" />
          </Pressable>
        </MotiView>
      );
    }

    // ✅ زر الإرسال الأخضر (Confirm) في وضع المراجعة
    if (tempAudioFile) {
        return (
            <MotiView from={{ scale: 0 }} animate={{ scale: 1 }} key="confirm-audio-btn">
                <Pressable onPress={confirmAudioSend} style={[styles.actionBtn, { backgroundColor: '#10B981' }]}>
                    <Feather name="arrow-up" size={24} color="white" />
                </Pressable>
            </MotiView>
        );
    }

    if ((promptText.trim().length > 0 || (attachments && attachments.length > 0))) {
      return (
        <MotiView 
          from={{ scale: 0 }} 
          animate={{ scale: 1 }}
          key="send-btn"
        >
          <Pressable onPress={onSendPress} style={[styles.actionBtn, { backgroundColor: accentColor }]}>
              <Feather name="arrow-up" size={24} color="white" />
          </Pressable>
        </MotiView>
      );
    }

    return (
      <Pressable onPress={isRecordingState ? safeStopRecording : startRecording}>
        <MotiView
            from={{ scale: 1, backgroundColor: '#F1F5F9' }}
            animate={{ 
                scale: isRecordingState ? 1.1 : 1,
                backgroundColor: isRecordingState ? '#F43F5E' : '#F1F5F9' 
            }}
            style={[styles.micButton, isRecordingState && styles.micActiveShadow]}
            key="mic-btn"
        >
            {isRecordingState ? (
                  <Feather name="arrow-up" size={24} color="white" />
            ) : (
                <Ionicons name="mic" size={22} color="#475569" />
            )}
        </MotiView>
      </Pressable>
    );
  };

  // ✅ واجهة المراجعة بتصميم أخضر وموجات
  const renderAudioReviewUI = () => (
    <MotiView 
        from={{ opacity: 0, translateY: 10 }} 
        animate={{ opacity: 1, translateY: 0 }}
        style={styles.reviewContainer}
    >
        <Pressable onPress={cancelAudioReview} style={styles.trashReviewBtn}>
            <Feather name="trash-2" size={18} color="#EF4444" />
        </Pressable>
        
        <View style={styles.reviewPlayerWrapper}>
            <VoiceMessagePlayer 
                audioUri={tempAudioFile.uri} 
                duration={tempAudioFile.duration} 
                isUser={true} 
                // ✨ خصائص المظهر الأخضر
                mode="review" 
                waveColor="#10B981" 
                tintColor="#059669"
            />
        </View>
    </MotiView>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      style={{ width: '100%' }}
    >
      <View style={{ width: '100%', alignItems: 'center' }}>
        
        <AttachmentPreview 
            attachments={attachments} 
            onRemove={handleRemoveAttachment} 
        />

        <View style={styles.container}>
            <View style={styles.mainInputArea}>
                {/* 1. الطبقة النصية (تختفي عند المراجعة) */}
                {!tempAudioFile && (
                    <Animated.View style={[styles.layer, inputLayerStyle]}>
                        <DynamicIslandInput 
                            value={promptText}
                            onChangeText={setPromptText}
                            placeholder={t('chatPlaceholder')}
                            onActionSelect={handleActionSelect} 
                            isEnabled={!isSending && !isRecordingState}
                            activeType={activeIconType}
                        />
                    </Animated.View>
                )}

                {/* 2. طبقة التسجيل النشط */}
                <Animated.View style={[styles.layer, waveLayerStyle]}>
                     <View style={styles.recordingContainer}>
                        <Pressable onPress={cancelRecording} style={styles.trashBtn}>
                            <Feather name="trash-2" size={20} color="#EF4444" />
                        </Pressable>

                        <View style={styles.waveWrapper}>
                             <View style={styles.visualizerContainer}>
                                 <WaveVisualizer metering={metering} isRecording={isRecordingShared} />
                             </View>

                             <Text style={styles.timerText}>
                                {timer}
                             </Text>
                        </View>
                     </View>
                </Animated.View>

                {/* 3. ✅ طبقة المراجعة (تظهر عند وجود ملف مؤقت) */}
                {tempAudioFile && renderAudioReviewUI()}
            </View>

            <View style={styles.rightActionContainer}>
              {renderRightButton()}
            </View>
        </View>

         <AnimatePresence>
          {alertConfig.visible && (
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}     // يبدأ شفافاً وأصغر قليلاً
              animate={{ opacity: 1, scale: 1 }}     // يظهر بحجمه الطبيعي
              exit={{ opacity: 0, scale: 0.95 }}     // يختفي بنعومة
              transition={{ type: 'timing', duration: 200 }} // مدة قصيرة جداً لمنع الشعور بالبطء
              style={[StyleSheet.absoluteFillObject, { zIndex: 999, justifyContent: 'center', alignItems: 'center' }]}
              pointerEvents="box-none" // يسمح باللمس فقط على التنبيه نفسه
            >
              <CustomAlert
                isVisible={true} // نتركه true لأن Moti تتحكم في الظهور والاختفاء الآن
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
              />
            </MotiView>
          )}
        </AnimatePresence>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 6,
    width: '100%',
  },
  mainInputArea: {
    flex: 1,
    height: 50,
    position: 'relative',
    marginRight: 8,
  },
  layer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, top: 0,
  },
  rightActionContainer: {
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 3, 
  },
  micButton: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  micActiveShadow: {
    shadowColor: "#F43F5E", shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  actionBtn: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 4,
  },
  stopBtn: {
    backgroundColor: '#334155', borderWidth: 2, borderColor: '#E2E8F0'
  },
  recordingContainer: {
      flexDirection: 'row', alignItems: 'center', height: '100%', backgroundColor: '#FFF1F2',
      borderRadius: 25, borderWidth: 1, borderColor: '#FDA4AF', paddingHorizontal: 4, overflow: 'hidden',
  },
  trashBtn: {
      width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFE4E6', marginRight: 8,
  },
  waveWrapper: {
      flex: 1, flexDirection: 'row', alignItems: 'center', height: '100%',
  },
  visualizerContainer: {
    flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 8,
  },
  wavesContainer: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: '100%',
  },
  timerText: {
    color: '#F43F5E', fontWeight: '700', fontSize: 14, fontVariant: ['tabular-nums'], marginRight: 6,
  },
  
  // ✅ ستايلات واجهة المراجعة الجديدة
  reviewContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5', // أخضر فاتح جداً
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#A7F3D0', // حدود خضراء
    paddingHorizontal: 4,
    zIndex: 20, 
  },
  reviewPlayerWrapper: {
      flex: 1,
      height: '100%',
      justifyContent: 'center',
      paddingRight: 4,
  },
  trashReviewBtn: {
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FEE2E2', 
    marginRight: 6,
  }
});