// components/minichat/MiniChatPanel.jsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { MotiView } from 'moti';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import ImageViewerModal from './ImageViewerModal';
import MessageItem from './MessageItem';
import ChatStatusIndicator from './ChatStatusIndicator';
import ChatInputArea from './ChatInputArea';
import VoiceMessagePlayer from './VoiceMessagePlayer';

const WINDOW = Dimensions.get('window');
const BASE_PANEL_HEIGHT = WINDOW.height * 0.55;
const MAX_EXPANDED_HEIGHT = WINDOW.height * 0.92;
const BOTTOM_EMPTY_SPACE = 20;

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// --- Skeleton Component (Memoized) ---
const ShimmerSkeleton = React.memo(({ index }) => {
  const width = WINDOW.width;
  const translateX = useSharedValue(-width);

  useEffect(() => {
    const delay = index * 100;
    translateX.value = withDelay(
      delay,
      withRepeat(
        withTiming(width, { duration: 1500, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { skewX: '-20deg' }],
  }));

  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonBackground} />
      <AnimatedLinearGradient
        colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[StyleSheet.absoluteFill, { width: '50%' }, animatedStyle]}
      />
    </View>
  );
});

// --- Memoized List Component ---
const MemoizedMessageList = React.memo(React.forwardRef(({
  messages,
  suggestions,
  isLoadingSuggestions,
  onSuggestionPress,
  onWidgetAction,
  onLongPressMessage,
  onReport,
  onCopy,
  onLoadMore,
  hasMoreMessages,
  isLoadingOlder,
  accent,
  headerStatus, 
  onImagePress 
}, ref) => {

  const renderItem = useCallback(({ item, index }) => {
    // ✅ 1. Check: Is it an audio message?
    if (item.isAudio) {
      const isUser = item.type === 'user';
      const bubbleColors = isUser 
        ? (accent ? [accent[0], accent[1] || accent[0]] : ['#0EA5A4', '#2DD4BF']) 
        : ['#F1F5F9', '#F1F5F9'];

      return (
        <View style={[
          styles.messageRow, 
          { justifyContent: isUser ? 'flex-end' : 'flex-start' }
        ]}>
          <LinearGradient
            colors={bubbleColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.audioBubbleContainer,
              isUser ? styles.bubbleRight : styles.bubbleLeft
            ]}
          >
            <VoiceMessagePlayer 
              audioUri={item.audioUri} 
              duration={item.duration} 
              isUser={isUser} 
            />
          </LinearGradient>
        </View>
      );
    }
    const shouldAnimate = index < 2; 

    // ✅ 2. Standard Message View
    return (
      <MessageItem
        message={item}
        disableAnim={!shouldAnimate} 
        showTyping={false}
        onWidgetAction={onWidgetAction}
        onLongPressMessage={onLongPressMessage}
        onReport={() => onReport && onReport(item)}
        onCopy={() => onCopy && onCopy(item.text)}
        // Call the function passed from parent
        onImagePress={(url) => onImagePress && onImagePress(url, item)} 
        direction={item.direction || (accent && accent.direction) || 'ltr'}
      />
    );
  }, [onWidgetAction, onLongPressMessage, onReport, onCopy, accent, onImagePress]);

  const renderHeader = useCallback(() => (
    <ChatStatusIndicator status={headerStatus} />
  ), [headerStatus]);

  const renderFooter = useCallback(() => {
    if (!hasMoreMessages && !isLoadingOlder) return <View style={{ height: 20 }} />;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}>
        {isLoadingOlder ? <ActivityIndicator size="small" color="#94A3B8" /> : null}
      </View>
    );
  }, [hasMoreMessages, isLoadingOlder]);

  return (
    <>
      {messages.length === 0 && !headerStatus && (
        <View style={styles.suggestionsContainer}>
          <View style={{ width: '100%', alignItems: 'center' }}>
            {isLoadingSuggestions ? (
              <>
                <ShimmerSkeleton index={0} />
                <ShimmerSkeleton index={1} />
                <ShimmerSkeleton index={2} />
              </>
            ) : (
              suggestions.map((p, i) => (
                <MotiView
                  key={i}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 400, delay: i * 80 }}
                  style={{ width: '100%', alignItems: 'center' }}
                >
                  <Pressable style={styles.promptButton} onPress={() => onSuggestionPress(p)}>
                    <Text style={styles.promptButtonText}>{p}</Text>
                  </Pressable>
                </MotiView>
              ))
            )}
          </View>
        </View>
      )}

      <FlatList
        ref={ref}
        data={messages}
        keyExtractor={(item) => item.id || item.localId || `fallback-${item.createdAt}`} 
        renderItem={renderItem}
        inverted
        contentContainerStyle={{ paddingBottom: BOTTOM_EMPTY_SPACE, paddingTop: 10 }}
        style={styles.messagesList}
        extraData={onWidgetAction} 
        keyboardShouldPersistTaps="handled"
        
        // 1. تقليل عدد العناصر المحتفظ بها في الذاكرة (الافتراضي 21)
        windowSize={5} 
        
        // 2. عدد العناصر عند التحميل الأولي (تقليلها يسرع الفتح)
        initialNumToRender={8}
        
        // 3. عدد العناصر التي يتم معالجتها في الدفعة الواحدة عند السكرول
        maxToRenderPerBatch={5}
        
        // 4. المدة بين عمليات التحديث (زيادتها تعطي وقت للـ UI Thread للتنفس)
        updateCellsBatchingPeriod={50}
        
        // 5. مهم جداً للأندرويد: حذف العناصر خارج الشاشة لتحسين الأداء
        // لكن قد يسبب وميض في iOS المعقد، لذا نفعله للأندرويد حالياً
        removeClippedSubviews={Platform.OS === 'android'}
        
        onEndReachedThreshold={0.5}
        onEndReached={() => { if (hasMoreMessages && !isLoadingOlder) onLoadMore(); }}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        
        // 6. تحسينات إضافية
        scrollEventThrottle={16} // لضمان سلاسة السكرول
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }} // للحفاظ على المكان عند تحميل رسائل قديمة
      
      />
    </>
  );
}), (prev, next) => {
  return (
    prev.messages === next.messages &&
    prev.headerStatus === next.headerStatus &&
    prev.isLoadingSuggestions === next.isLoadingSuggestions &&
    prev.isLoadingOlder === next.isLoadingOlder &&
    prev.onWidgetAction === next.onWidgetAction 
  );
});

const dismissKeyboard = () => Keyboard.dismiss();

export default function MiniChatPanel({
  isVisible,
  onClose,
  messages = [],
  promptText,
  setPromptText,
  inputProps,
  onSend,
  isSending,
  suggestions = [],
  isLoadingSuggestions,
  onSuggestionPress,
  accent,
  onWidgetAction,
  onLongPressMessage,
  onLoadMore,
  hasMoreMessages,
  onStop,
  isLoadingOlder,
  onReport,
  onCopy,
  editingMessageId,
  onMicPress
}) {
  const [isRendered, setIsRendered] = useState(false);
  const animationProgress = useSharedValue(0);
  const panelHeight = useSharedValue(BASE_PANEL_HEIGHT);
  const keyboardOffset = useSharedValue(0);
  const startHeight = useSharedValue(0);
  const flatListRef = useRef(null);

  // ✅ 1. New State for Processing Status & Web Search
  const [processingStatus, setProcessingStatus] = useState(null); 
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  
  // ✅ Image Viewer State
  const [selectedImageData, setSelectedImageData] = useState(null); 
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

  // ✅ Helper: Trigger animation then clear it
  const triggerProcessingAnimation = (status) => {
    setProcessingStatus(status);
    setTimeout(() => {
      setProcessingStatus(null);
    }, 4000);
  };

  // ✅ Handle Image Press (Protected)
  const handleImagePress = useCallback((url, message) => {
    setSelectedImageData({ 
      uri: url, 
      date: message?.createdAt || new Date().toISOString() 
    });
    setIsImageViewerVisible(true);
  }, []);

  // ✅ 2. Updated Status Logic (Priority: Processing > Typing)
  const currentStatus = useMemo(() => {
    if (processingStatus) return processingStatus;
    if (isSending) return 'typing';
    return null;
  }, [processingStatus, isSending]);

  const visibleMessages = useMemo(() => {
    return messages.filter(m => 
      m.type !== 'typing' && 
      m.type !== 'seen' && 
      !m.isHidden &&            // 👈 هذا السطر الجديد يخفي رسالة التقرير عن المستخدم
        !m.isWidgetAction &&
    // 🔥 الحماية القصوى: تصفية الرسالة إذا كان نصها يحتوي على التقرير
    !(typeof m.text === 'string' && m.text.includes('[SYSTEM_REPORT:'))
  );
}, [messages]);

  useEffect(() => {
    if (isVisible) {
      setIsRendered(true);
      animationProgress.value = withSpring(1, { damping: 18, stiffness: 90, mass: 0.8 });
    } else {
      dismissKeyboard();
      animationProgress.value = withTiming(0, { duration: 250, easing: Easing.in(Easing.cubic) }, (f) => { if (f) runOnJS(setIsRendered)(false); });
    }
  }, [isVisible]);

  // Updated Scroll Effect to use currentStatus/processingStatus
  useEffect(() => {
    if ((processingStatus || isSending) && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, [processingStatus, isSending]);

  useEffect(() => {
    const onShow = (e) => {
      keyboardOffset.value = withTiming(Platform.OS === 'ios' ? -e.endCoordinates.height : 0, { duration: 250 });
      const targetHeight = Math.min(BASE_PANEL_HEIGHT, WINDOW.height - e.endCoordinates.height - 20);
      panelHeight.value = withSpring(targetHeight, { damping: 20 });
    };
    const onHide = () => {
      keyboardOffset.value = withTiming(0, { duration: 250 });
      panelHeight.value = withSpring(BASE_PANEL_HEIGHT);
    };
    const s1 = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', onShow);
    const s2 = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', onHide);
    return () => { s1.remove(); s2.remove(); };
  }, []);

  const dragGesture = Gesture.Pan()
    .onStart(() => { startHeight.value = panelHeight.value; })
    .onUpdate((ev) => {
      let newHeight = startHeight.value - ev.translationY;
      if (newHeight > MAX_EXPANDED_HEIGHT)
        newHeight = MAX_EXPANDED_HEIGHT + (newHeight - MAX_EXPANDED_HEIGHT) * 0.1;
      panelHeight.value = newHeight;
    })
    .onEnd((ev) => {
      if (ev.velocityY > 600 || panelHeight.value < WINDOW.height * 0.25) {
        runOnJS(onClose)();
      } else if (ev.velocityY < -500 || panelHeight.value > WINDOW.height * 0.65) {
        panelHeight.value = withSpring(MAX_EXPANDED_HEIGHT, { damping: 16 });
      } else {
        panelHeight.value = withSpring(BASE_PANEL_HEIGHT, { damping: 18 });
      }
    });

  const animatedPanelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          animationProgress.value,
          [0, 1],
          [WINDOW.height, 0]
        ) + keyboardOffset.value
      }
    ],
    height: panelHeight.value,
    opacity: interpolate(animationProgress.value, [0, 0.2], [0, 1])
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({ opacity: animationProgress.value }));

  const hasStartedSending = useRef(false);

  useEffect(() => {
    if (isSending) hasStartedSending.current = true;
  }, [isSending]);

  useEffect(() => {
    if (!isSending && hasStartedSending.current) {
      setProcessingStatus(null);
      hasStartedSending.current = false;
    }
  }, [isSending]);

  // ✅ 3. Updated Handle Send Logic
   const handleSendPress = (replyTextOrData, overrideAttachments = null) => {
    const textToSend = typeof replyTextOrData === 'string' ? replyTextOrData : promptText;
    const attachmentsToSend = overrideAttachments || inputProps?.attachments || [];
    
    const hasText = textToSend.trim().length > 0;
    const hasAttachments = attachmentsToSend.length > 0;
    const isWeb = webSearchEnabled;

    if (!hasText && !hasAttachments && !isWeb) return;

    // 🔥🔥 الإضافة هنا: إجبار القائمة على النزول للأسفل فوراً عند الإرسال 🔥🔥
    // بما أن القائمة Inverted، فإن offset: 0 يعني أحدث رسالة (أسفل الشاشة)
    if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }

    hasStartedSending.current = false;

    if (onSend) {
      onSend(textToSend, { 
        webSearch: isWeb,
        attachments: attachmentsToSend
      });
      
      if (!overrideAttachments && inputProps?.setAttachments) {
        inputProps.setAttachments([]);
      }
    }

    dismissKeyboard();


    // --- Status Animation Logic ---
    if (isWeb) {
      // 1. Web Search Priority
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      triggerProcessingAnimation('searching');
    } 
    else if (hasAttachments) {
      // 2. Attachments Analysis
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Check for files (PDF, DOC, etc.)
      const hasFiles = attachmentsToSend.some(a => a.type === 'file');
      
      if (hasFiles) {
        // Mixed files or just files -> files_analyzing
        triggerProcessingAnimation('analyzing_files');
      } else {
        // Images/Videos only -> analyzing_images
        triggerProcessingAnimation('analyzing_images');
      }
    } else {
      // 3. Normal Text
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // ✅ New Handler: Process Image from Modal Camera
  const handleModalCameraCapture = (imageAsset) => {
     setIsImageViewerVisible(false); // Close modal
     
     const formattedAttachment = {
        id: Date.now().toString(),
        uri: imageAsset.uri,
        type: 'image',
        width: imageAsset.width,
        height: imageAsset.height,
        mimeType: 'image/jpeg',
        name: `camera_${Date.now()}.jpg`
     };

     // ✅ Send empty text + array containing the image
     handleSendPress("", [formattedAttachment]);
  };

  const handleStopPress = () => {
    setProcessingStatus(null);
    hasStartedSending.current = false;
    if (onStop) onStop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ✅ 4. Updated Mic Action Logic
  const handleMicAction = (audioFile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (audioFile && audioFile.uri) {
      const audioMessageObject = {
        id: Date.now().toString(),
        type: 'audio', 
        text: audioFile.uri, 
        audioUri: audioFile.uri,
        duration: audioFile.duration, 
        author: { id: 'user' }, 
        createdAt: new Date().toISOString(),
        direction: 'ltr'
      };
      
      if (onSend) {
        onSend(null, { type: 'audio', audioData: audioMessageObject });
      }

      // Trigger Audio Analysis Animation
      triggerProcessingAnimation('analyzing_audio');

    } else {
      if (onMicPress) onMicPress();
    }
  };

  if (!isRendered) return null;
  const accentColor = (accent && accent[0]) || '#0EA5A4';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          {Platform.OS === 'ios'
            ? <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />}
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.chatPanelContainer, animatedPanelStyle]}>
        <View style={Platform.OS === 'ios' ? styles.glassPaneIOS : styles.glassPaneAndroid}>

          <GestureDetector gesture={dragGesture}>
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>
          </GestureDetector>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            
            <MemoizedMessageList
              ref={flatListRef}
              messages={visibleMessages}
              suggestions={suggestions}
              isLoadingSuggestions={isLoadingSuggestions}
              onSuggestionPress={onSuggestionPress}
              onWidgetAction={onWidgetAction}
              onLongPressMessage={onLongPressMessage}
              onReport={onReport}
              onCopy={onCopy}
              onLoadMore={onLoadMore}
              hasMoreMessages={hasMoreMessages}
              isLoadingOlder={isLoadingOlder}
              accent={accent}
              headerStatus={currentStatus}
              onImagePress={handleImagePress} 
            />

          </KeyboardAvoidingView>

           <ChatInputArea 
            promptText={promptText}
            setPromptText={setPromptText}
            attachments={inputProps?.attachments || []} 
            setAttachments={inputProps?.setAttachments}
            isSending={isSending}
            onSendPress={() => handleSendPress()}
            onStopPress={handleStopPress}
            onMicPress={handleMicAction}
            webSearchEnabled={webSearchEnabled}
            setWebSearchEnabled={setWebSearchEnabled}
            // isWebSearchingAnimation prop removed as it is now internal to MiniChatPanel
            editingMessageId={editingMessageId}
            accentColor={accentColor}
          />

        </View>
      </Animated.View>

     {/* ✅ Modal with onCameraCapture */}
     <ImageViewerModal
      visible={isImageViewerVisible}
      imageData={selectedImageData}
      onClose={() => setIsImageViewerVisible(false)}
      onSendReply={(text) => handleSendPress(text)} 
      onCameraCapture={handleModalCameraCapture}
    />
      
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  chatPanelContainer: { position: 'absolute', bottom: 0, width: '100%', paddingHorizontal: 12, zIndex: 10 },
  
  glassPaneIOS: { flex: 1, marginBottom: 10, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: 'transparent', paddingBottom: 10, paddingHorizontal: 8 },
  glassPaneAndroid: { flex: 1, marginBottom: 10, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.71)', backgroundColor: '#d9d9d986', paddingBottom: 10, paddingHorizontal: 8 },
  
  dragHandleContainer: { alignItems: 'center', paddingVertical: 12, width: '100%' },
  dragHandle: { width: 46, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.26)' },
  messagesList: { flex: 1, paddingHorizontal: 6 },
  
  suggestionsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  promptButton: { backgroundColor: 'rgba(255,255,255,0.79)', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 20, marginBottom: 12, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  promptButtonText: { color: '#4B5563', fontSize: 14, fontWeight: '500' },
  
  skeletonContainer: { width: '100%', height: 45, borderRadius: 20, marginBottom: 12, overflow: 'hidden', position: 'relative' },
  skeletonBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  
  audioBubbleContainer: {
    padding: 0, 
    borderRadius: 27, 
    minWidth: 200,
    width: 240, 
    overflow: 'hidden', 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    marginTop: 2,
  },
  bubbleRight: {
    borderBottomRightRadius: 4, 
  },
  bubbleLeft: {
    borderBottomLeftRadius: 4, 
    backgroundColor: '#F1F5F9', 
  },
});