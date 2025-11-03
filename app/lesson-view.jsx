
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { AnimatePresence, MotiView } from 'moti';
import { BehavioralAnalyticsService } from '../services/behavioralAnalyticsService';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated as RNAnimated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Markdown from 'react-native-markdown-display';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import FloatingActionButton from '../components/FloatingActionButton';
import GenerateKitButton from '../components/GenerateKitButton';
import { apiService } from '../config/api';
import { useAppState } from '../context/AppStateContext';
import { getLessonContent, updateLessonProgress } from '../services/firestoreService';

/* ---------------- constants ---------------- */
const NOTES_KEY = 'edu_notes_v1';
const BOT_USER = { id: 'bot-fab', firstName: 'FAB' };

const WINDOW = Dimensions.get('window');
const DEFAULT_VISIBLE = 6;
const VISIBLE_INCREMENT = 8;
const MAX_PANEL_RATIO = 0.72;
const BASE_PANEL_RATIO = 0.38;
const BOTTOM_EMPTY_SPACE = 60;
const MESSAGE_HISTORY_CAP = 4;

/* display widths */
const BOT_MAX_WIDTH = Math.round(WINDOW.width * 0.75);
const USER_MAX_WIDTH = Math.round(WINDOW.width * 0.73);

const getAccentFromSubject = (subjectId) => {
  const palette = [
    ['#0EA5A4', '#7EE787'],
    ['#2563EB', '#60A5FA'],
    ['#10B981', '#34D399'],
    ['#8B5CF6', '#C084FC'],
    ['#F97316', '#FB923C'],
    ['#EF4444', '#F87171'],
  ];
  if (!subjectId) return palette[0];
  const hash = Array.from(String(subjectId)).reduce((s, c) => s + c.charCodeAt(0), 0);
  return palette[hash % palette.length];
};

/* ---------------- parse cache for MessageText ---------------- */
const _parseCache = new Map();
function parseBoldSegments(text) {
  if (!text) return [];
  if (_parseCache.has(text)) return _parseCache.get(text);
  const parts = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ t: 'text', v: text.slice(lastIndex, match.index) });
    parts.push({ t: 'bold', v: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ t: 'text', v: text.slice(lastIndex) });
  _parseCache.set(text, parts);
  return parts;
}

/* ---------------- MessageText ---------------- */
const MessageText = React.memo(({ text, isBot, style, strongStyle }) => {
  if (!text) return null;
  const parts = parseBoldSegments(text);
  return (
    <Text style={[style?.body ?? styles.bodyText, { color: isBot ? '#042C2B' : '#F8FAFC' }]}>
      {parts.map((p, i) => (p.t === 'text' ? <Text key={i}>{p.v}</Text> : <Text key={i} style={strongStyle}>{p.v}</Text>))}
    </Text>
  );
});

/* ---------------- MessageItem (memo) ---------------- */
const MessageItem = React.memo(function MessageItem({ message, onLongPressMessage, disableAnim, showTyping }) {
  if (!message) return null;
  const slideY = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.timing(slideY, { toValue: message.seenAnimated ? -6 : 0, duration: 160, useNativeDriver: true }).start();
  }, [message.seenAnimated]);

  if (message.type === 'seen') {
    const isUser = message.author?.id !== BOT_USER.id;
    return (
      <View style={[styles.seenWrapper, isUser ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
        <View style={styles.seenBadge}><Text style={styles.seenText}>Seen</Text></View>
      </View>
    );
  }

  if (message.type === 'typing') {
    if (!showTyping) return null;
    return (
      <View style={styles.botRow}>
        <View style={[styles.botBubble, { paddingVertical: 8, minWidth: 60 }]}>
          <LottieView 
            // ✅ FIX: Corrected Lottie file path
            source={require('../assets/images/typing.json')} 
            autoPlay 
            loop 
            style={styles.typingLottie} 
          />
        </View>
      </View>
    );
  }

  const isBot = message.author?.id === BOT_USER.id;

  if (disableAnim) {
    return (
      <View style={{ transform: [{ translateY: 0 }], width: '100%' }}>
        <View style={isBot ? styles.botRow : styles.userRow}>
          <Pressable onLongPress={() => onLongPressMessage && onLongPressMessage(message)} android_ripple={{ color: 'rgba(255,255,255,0.02)' }}>
            <View style={isBot ? styles.botBubble : styles.userBubble}>
              <MessageText text={message.text} isBot={isBot} style={isBot ? styles.botTextMarkdown : styles.userTextMarkdown} strongStyle={isBot ? styles.botStrong : styles.userStrong} />
            </View>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <RNAnimated.View style={{ transform: [{ translateY: slideY }], width: '100%' }}>
      <MotiView from={{ opacity: 0, translateY: isBot ? 6 : 4 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 160 }} style={isBot ? styles.botRow : styles.userRow}>
        <Pressable onLongPress={() => onLongPressMessage && onLongPressMessage(message)} android_ripple={{ color: 'rgba(255,255,255,0.02)' }}>
          <View style={isBot ? styles.botBubble : styles.userBubble}>
            <MessageText text={message.text} isBot={isBot} style={isBot ? styles.botTextMarkdown : styles.userTextMarkdown} strongStyle={isBot ? styles.botStrong : styles.userStrong} />
          </View>
        </Pressable>
      </MotiView>
    </RNAnimated.View>
  );
}, (a, b) => a.message?.id === b.message?.id && a.message?.text === b.message?.text && a.message?.seenAnimated === b.message?.seenAnimated && a.disableAnim === b.disableAnim && a.showTyping === b.showTyping);

/* ---------------- Screen ---------------- */
export default function LessonViewScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAppState();
  const { lessonId, lessonTitle, subjectId, pathId, totalLessons } = params || {};
  const chatUserId = user?.uid || 'guest-user';
  const chatUser = useMemo(() => ({ id: chatUserId, firstName: (user?.displayName || 'You') }), [chatUserId, user?.displayName]);
  const CHAT_KEY = useMemo(() => `mini_chat_${lessonId}_${chatUserId}`, [lessonId, chatUserId]);
  const accent = useMemo(() => getAccentFromSubject(subjectId), [subjectId]);

  const [lessonContent, setLessonContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isChatPanelVisible, setChatPanelVisible] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [messages, setMessages] = useState([]); // oldest-first
  const messagesRef = useRef([]);
  const [loadedMessages, setLoadedMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const isSendingRef = useRef(false);
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE);
  const [toastVisible, setToastVisible] = useState(false);
  const toastAnim = useRef(new RNAnimated.Value(0)).current;

  const backgroundLottieRef = useRef(null);
  const flatListRef = useRef(null);
  const [hideBackground, setHideBackground] = useState(false);

  const saveChat = useCallback((maybeMessages) => {
    try {
      const src = Array.isArray(maybeMessages) ? maybeMessages : messagesRef.current || [];
      if (!Array.isArray(src)) return;
      const storableOldestFirst = src.filter(m => m && m.type !== 'typing' && m.type !== 'intro' && m.type !== 'seen');
      const storable = storableOldestFirst.slice().reverse();
      AsyncStorage.setItem(CHAT_KEY, JSON.stringify(storable)).catch(e => console.error('AsyncStorage.setItem error:', e));
    } catch (e) {
      console.error('Error saving mini-chat:', e);
    }
  }, [CHAT_KEY]);

  const openChatPanel = useCallback(() => {
    BehavioralAnalyticsService.logEvent('fab_chat_opened', { lessonId });
    setHideBackground(true);
    setChatPanelVisible(true);
  }, [lessonId]);

  const closeChatPanel = useCallback(() => {
    setChatPanelVisible(false);
  }, []);

  const handlePanelClosed = useCallback(() => {
    try { saveChat(messagesRef.current); } catch (e) { console.error(e); }
    setHideBackground(false);
    try { Keyboard.dismiss(); } catch (e) {}
  }, [saveChat]);

  const loadChat = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(CHAT_KEY);
      if (!raw) { setLoadedMessages([]); return; }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) { setLoadedMessages([]); return; }
      setLoadedMessages(parsed.slice().reverse());
    } catch (e) {
      console.error('Error loading mini-chat:', e);
      setLoadedMessages([]);
    }
  }, [CHAT_KEY]);

  const saveMessageToNotes = useCallback(async (message) => {
    try {
      const raw = await AsyncStorage.getItem(NOTES_KEY);
      const prev = raw ? JSON.parse(raw) : [];
      const note = { id: uuidv4(), text: message.text, lessonId, createdAt: Date.now() };
      prev.unshift(note);
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(prev));
      Alert.alert('Saved', 'Message saved to your notes.');
    } catch (e) {
      console.error('Failed to save note', e);
      Alert.alert('Error', 'Could not save note.');
    }
  }, [lessonId]);

  const suspendBackgroundRef = useRef(false);
  const messageUpdateQueueRef = useRef(null);
  const batchedFlushTimeoutRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const enqueueMessageUpdate = useCallback((updater, options = { save: false }) => {
    if (!messageUpdateQueueRef.current) {
      messageUpdateQueueRef.current = { updater, options };
    } else {
      const existing = messageUpdateQueueRef.current;
      const prevUpdater = existing.updater;
      const newUpdater = updater;
      const combinedUpdater = (prev) => {
        const intermediate = typeof prevUpdater === 'function' ? prevUpdater(prev) : prevUpdater;
        return typeof newUpdater === 'function' ? newUpdater(intermediate) : newUpdater;
      };
      const combinedOptions = { save: Boolean((existing.options && existing.options.save) || options.save) };
      messageUpdateQueueRef.current = { updater: combinedUpdater, options: combinedOptions };
    }

    if (batchedFlushTimeoutRef.current) return;

    batchedFlushTimeoutRef.current = requestAnimationFrame(() => {
      try {
        const queued = messageUpdateQueueRef.current;
        messageUpdateQueueRef.current = null;
        batchedFlushTimeoutRef.current = null;
        if (!queued) return;
        setMessages(prev => {
          const next = typeof queued.updater === 'function' ? queued.updater(prev) : queued.updater;
          const capped = Array.isArray(next) && next.length > MESSAGE_HISTORY_CAP ? next.slice(next.length - MESSAGE_HISTORY_CAP) : next;
          messagesRef.current = capped;
          return capped;
        });
        if (queued.options?.save && !suspendBackgroundRef.current) {
          saveChat(messagesRef.current);
        }
      } catch (e) {
        console.error('enqueueMessageUpdate error', e);
      }
    });
  }, [saveChat]);

  const setMessagesSafe = useCallback((updater, options = { save: false }) => {
    enqueueMessageUpdate(updater, options);
  }, [enqueueMessageUpdate]);

  useEffect(() => {
    return () => {
      try { if (abortControllerRef.current) abortControllerRef.current.abort(); } catch (e) {}
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);
  
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const showToast = useCallback((text = 'FAB sent a reply') => {
    setToastVisible(true);
    RNAnimated.timing(toastAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    Haptics.selectionAsync();
    setTimeout(() => RNAnimated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToastVisible(false)), 3000);
  }, [toastAnim]);

  const onToastPress = useCallback(() => {
    openChatPanel();
    RNAnimated.timing(toastAnim, { toValue: 0, duration: 240, useNativeDriver: true }).start(() => setToastVisible(false));
  }, [openChatPanel, toastAnim]);

  const handleStopGenerating = useCallback(() => {
    try { if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; } } catch (e) {}
    setIsSending(false);
    setMessagesSafe(prev => (Array.isArray(prev) ? prev.filter(m => m.type !== 'typing' && m.type !== 'seen') : prev));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [setMessagesSafe]);

  const isAtBottomRef = useRef(true);
  const windowHeight = WINDOW.height;
  const basePanelHeight = Math.round(windowHeight * BASE_PANEL_RATIO);
  const maxPanelHeight = Math.round(windowHeight * MAX_PANEL_RATIO);

  // ✅✅✅ START: REFACTORED & ROBUST processAndRespond ✅✅✅
  const processAndRespond = useCallback(async (userMessage, history) => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);
    abortControllerRef.current = new AbortController();

    // 1. Add user message and a 'seen' indicator immediately
    const seenIndicator = { type: 'seen', id: uuidv4(), author: BOT_USER };
    setMessagesSafe(prev => [...(Array.isArray(prev) ? prev : []), userMessage, seenIndicator]);

    // 2. After a short delay, replace 'seen' with 'typing'
    const typingIndicator = { type: 'typing', id: uuidv4(), author: BOT_USER };
    setTimeout(() => {
        setMessagesSafe(prev => prev.map(m => (m.id === seenIndicator.id ? typingIndicator : m)));
    }, 400); // 400ms delay for a natural feel

    const historyForAPI = history.map(msg => ({
        role: msg.author?.id === BOT_USER.id ? 'model' : 'user',
        text: msg.text || '',
    }));

    try {
        const payload = {
            message: `[CONTEXT: The user is in a lesson about: "${lessonTitle}".] ${userMessage.text}`,
            userId: user?.uid,
            history: historyForAPI,
            sessionId: sessionId,
            context: {
                type: 'lesson_chat',
                lessonId: lessonId,
                lessonTitle: lessonTitle,
            }
        };

        const response = await apiService.getInteractiveChatReply(payload, abortControllerRef.current.signal);

        if (response.sessionId && !sessionId) {
            setSessionId(response.sessionId);
        }

        const botResponse = { type: 'bot', author: BOT_USER, id: uuidv4(), text: response.reply };
        
        // Replace typing indicator with the final bot response
        setMessagesSafe(prev => prev.map(m => m.id === typingIndicator.id ? botResponse : m));
        
        if (!isChatPanelVisible) {
            showToast('FAB replied — اضغط للفتح');
        }

    } catch (error) {
        if (error?.name !== 'AbortError') {
            console.error("Error in processAndRespond:", error); // Log the actual error
            const errorMsg = { type: 'bot', id: uuidv4(), author: BOT_USER, text: '⚠️ تعذر الوصول للمساعد الذكي. يرجى التحقق من اتصالك.' };
            // Replace typing indicator with an error message
            setMessagesSafe(prev => prev.map(m => m.id === typingIndicator.id ? errorMsg : m));
        } else {
            // If aborted, just remove the typing indicator
            setMessagesSafe(prev => prev.filter(m => m.id !== typingIndicator.id));
        }
    } finally {
        isSendingRef.current = false;
        setIsSending(false);
        abortControllerRef.current = null;
    }
  }, [user?.uid, sessionId, lessonId, lessonTitle, isChatPanelVisible, showToast, setMessagesSafe]);
  // ✅✅✅ END: REFACTORED processAndRespond ✅✅✅
    
     const handleSendPrompt = useCallback(() => {
        if (isSendingRef.current) { handleStopGenerating(); return; }
        const text = (promptText || '').trim();
        if (text.length === 0) return;
        setPromptText('');
        Keyboard.dismiss();
        const userMessage = { type: 'user', author: chatUser, id: uuidv4(), text };
        const history = messagesRef.current.filter(m => m.type !== 'typing' && m.type !== 'seen').slice(-10);
        processAndRespond(userMessage, history);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      try { if (flatListRef.current) flatListRef.current.scrollToOffset({ offset: 20, animated: true }); } catch (e) {}
    }, 120);
  }, [promptText, isSending, chatUser, processAndRespond, handleStopGenerating]);

  const handleLongPressMessage = useCallback((message) => {
    Alert.alert('اختيارات الرسالة', 'اختر إجراء', [
      { text: 'نسخ', onPress: async () => { await Clipboard.setStringAsync(message.text || ''); Alert.alert('Copied'); } },
      { text: 'حفظ كملاحظه', onPress: () => saveMessageToNotes(message) },
      { text: 'إعادة السؤال', onPress: () => { setPromptText(message.text || ''); openChatPanel(); } },
      { text: 'إلغاء', style: 'cancel' },
    ], { cancelable: true });
  }, [saveMessageToNotes, openChatPanel]);
  useEffect(() => {
  if (user?.uid && lessonId) {
    // Send the event to the server (fire and forget)
    apiService.logEvent(user.uid, 'lesson_view_start', { lessonId, lessonTitle });
  }

  return () => {
    if (user?.uid && lessonId) {
      // This part is more complex as it needs to calculate duration,
      // but we can start by just logging the end of the view
      apiService.logEvent(user.uid, 'lesson_view_end', { lessonId });
    }
  };
}, [user?.uid, lessonId]); // Runs once when the lesson loads
  useEffect(() => {
    mountedRef.current = true;
    BehavioralAnalyticsService.logEvent('lesson_view_start', { lessonId, subjectId });
    const load = async () => {
      if (!user?.uid || !lessonId || !subjectId || !pathId) { if (mountedRef.current) setIsLoading(false); return; }
      setIsLoading(true);
      try {
        const contentData = await getLessonContent(lessonId);
        if (!mountedRef.current) return;
        if (contentData) setLessonContent(contentData.content || '');
         const total = parseInt(totalLessons, 10) || 1;
        await updateLessonProgress(user.uid, pathId, subjectId, lessonId, 'current', total);
        
        await loadChat();
      } catch (e) {
        console.error('Failed to load lesson:', e);
        Alert.alert('Error', 'Could not load lesson content or progress.');
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    };
    load();
    return () => { 
      mountedRef.current = false;  
      BehavioralAnalyticsService.logEvent('lesson_view_end', { lessonId, subjectId });
    };
  }, [lessonId, subjectId, user?.uid, pathId, totalLessons, loadChat]);

  /* ---------- background Lottie control: pause/reset on open, play on close ---------- */
  useEffect(() => {
    try {
      const l = backgroundLottieRef.current;
      if (!l) return;
      if (isChatPanelVisible) {
        suspendBackgroundRef.current = true;
        if (typeof l.pause === 'function') l.pause();
        if (typeof l.reset === 'function') l.reset();
      } else {
        suspendBackgroundRef.current = false;
        if (typeof l.play === 'function') l.play();
      }
    } catch (err) {
      console.warn('background Lottie control error', err);
    }
  }, [isChatPanelVisible]);

  /* ---------- chat panel open/close behavior ---------- */
  const translateY = useSharedValue(500);
  useEffect(() => {
    if (isChatPanelVisible) {
      suspendBackgroundRef.current = true;
      InteractionManager.runAfterInteractions(() => {
        setMessagesSafe(prev => (Array.isArray(prev) && prev.length > 0 ? prev : (Array.isArray(loadedMessages) && loadedMessages.length > 0 ? loadedMessages : prev)), { save: false });
      });
      translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
    } else {
      suspendBackgroundRef.current = false;
      translateY.value = withTiming(500, { duration: 260 }, (finished) => {
        if (finished) {
          runOnJS(handlePanelClosed)();
        }
      });
      try { if (backgroundLottieRef.current && typeof backgroundLottieRef.current.play === 'function') backgroundLottieRef.current.play(); } catch (e) {}
      handleStopGenerating();
    }
  }, [isChatPanelVisible, loadedMessages, handlePanelClosed, handleStopGenerating, translateY, setMessagesSafe]);

  const context = useSharedValue({ y: 0 });
  const dragGesture = Gesture.Pan()
    .onStart(() => { context.value = { y: translateY.value }; })
    .onUpdate((ev) => { translateY.value = Math.max(0, context.value.y + ev.translationY); })
     .onEnd(() => {
      if (translateY.value > 140) {
        runOnJS(closeChatPanel)();
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
      }
    });

    const handleWelcomePrompt = (text) => {
        const userMessage = { type: 'user', author: chatUser, id: uuidv4(), text };
        const history = messagesRef.current.filter(m => m.type !== 'typing' && m.type !== 'seen').slice(-10);
        processAndRespond(userMessage, history);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };
  const animatedPanelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const visibleMessages = useMemo(() => {
    if (!Array.isArray(messages) || messages.length === 0) return [];
    const start = Math.max(0, messages.length - visibleCount);
    return messages.slice(start);
  }, [messages, visibleCount]);

  const onScroll = useCallback((ev) => {
    const { contentOffset } = ev.nativeEvent;
    isAtBottomRef.current = contentOffset.y < 80;
  }, []);

  useEffect(() => {
    if (!flatListRef.current) return;
    if (isAtBottomRef.current) {
      setTimeout(() => {
        try { if (flatListRef.current) flatListRef.current.scrollToOffset({ offset: 0, animated: true }); } catch (e) {}
      }, 80);
    }
  }, [visibleMessages.length]);

  const disableAnimations = messages.length > 12;

  const renderMessageItem = useCallback(({ item }) => {
    if (!item) return null;
    return <MessageItem
        message={item}
        onLongPressMessage={handleLongPressMessage}
        disableAnim={disableAnimations}
        showTyping={isChatPanelVisible}
    />;
  }, [handleLongPressMessage, disableAnimations, isChatPanelVisible]);

  const computePanelHeight = () => {
    const extra = isSending ? 80 : 30;
    return Math.min(maxPanelHeight, basePanelHeight + extra);
  };
  const panelHeight = computePanelHeight();

  const inputTextColor = Platform.OS === 'android' ? '#0b1220' : '#FFFFFF';
  const placeholderColor = '#9CA3AF';

return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}><FontAwesome5 name="arrow-left" size={22} color="white" /></Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{lessonTitle || 'Lesson'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => { Haptics.selectionAsync(); openChatPanel(); }} style={styles.headerIcon}>
            <FontAwesome5 name="comments" size={18} color="white" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          {!isChatPanelVisible && !hideBackground && (
            <Pressable onPress={() => { Haptics.selectionAsync(); openChatPanel(); }}>
              <LottieView ref={backgroundLottieRef} source={require('../assets/images/robot.json')} autoPlay loop style={{ width: 220, height: 220 }} />
            </Pressable>
          )}
          <ActivityIndicator size="large" color={accent[0]} style={{ marginTop: 8 }} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
           <ScrollView contentContainerStyle={styles.contentContainer} scrollEventThrottle={400}>
             <View style={{ writingDirection: 'rtl' }}>
                 <Markdown
                style={markdownStyles}
              >
                {lessonContent || 'No content available.'}
              </Markdown>
            </View>

            <View style={{ alignItems: 'center', marginTop: 8 }}>
              {!isChatPanelVisible && !hideBackground && (
                <Pressable onPress={() => { Haptics.selectionAsync(); openChatPanel(); }}>
                  <LottieView ref={backgroundLottieRef} source={require('../assets/images/robot.json')} autoPlay loop style={{ width: 160, height: 160 }} />
                </Pressable>
              )}
            </View>
          </ScrollView>

          <GenerateKitButton
            onPress={() => {
              BehavioralAnalyticsService.logEvent('study_kit_generated', { lessonId, subjectId });
              router.push({ pathname: '/study-kit', params: { lessonId, lessonTitle, subjectId, pathId } });
            }}
          />
          <FloatingActionButton onPress={() => openChatPanel()} />

          <AnimatePresence>
            {isChatPanelVisible && (
              <View style={styles.overlayContainer} pointerEvents="box-none">
                {Platform.OS === 'ios' ? (
                  <BlurView intensity={60} tint="dark" style={styles.backdropBlur} pointerEvents="none" />
                ) : (
                  <View style={styles.backdropSimple} pointerEvents="none" />
                )}
                <Pressable style={styles.overlayBackground} onPress={() => closeChatPanel()} />

                <Animated.View style={[styles.chatPanelContainer, animatedPanelStyle, { height: panelHeight }]}>
                  {Platform.OS === 'ios' ? (
                    <BlurView intensity={80} tint="dark" style={styles.glassPane}>
                      <LinearGradient colors={['rgba(255,255,255,0.02)', 'rgba(0,0,0,0.22)']} start={[0,0]} end={[0,1]} style={StyleSheet.absoluteFill} />
                      <GestureDetector gesture={dragGesture}>
                        <View style={styles.dragHandleContainer}><View style={[styles.dragHandle, { backgroundColor: 'rgba(255,255,255,0.12)' }]} /></View>
                      </GestureDetector>

                      <KeyboardAvoidingView behavior={'padding'} keyboardVerticalOffset={90} style={{ flex: 1 }}>
                        { (messagesRef.current.length > visibleMessages.length) && (
                          <Pressable onPress={() => { setVisibleCount(v => v + VISIBLE_INCREMENT); Haptics.selectionAsync(); }} style={styles.loadMore}>
                            <Text style={styles.loadMoreText}>تحميل رسائل أقدم</Text>
                          </Pressable>
                        )}
                        {messages.length === 0 && !isSending && (
                          <View style={styles.welcomeContainer}>
                            <FontAwesome5 name="brain" size={24} color="#9CA3AF" style={{ marginBottom: 8 }} />
                            <Text style={styles.welcomeTitle}>يمكنني مساعدتك في:</Text>
                            <TouchableOpacity style={styles.promptButton} onPress={() => handleWelcomePrompt('لخص لي هذا الدرس في نقاط رئيسية')}>
                              <Text style={styles.promptButtonText}>تلخيص الدرس</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.promptButton} onPress={() => handleWelcomePrompt('اشرح لي أهم مفهوم في هذا الدرس')}>
                              <Text style={styles.promptButtonText}>شرح فكرة رئيسية</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.promptButton} onPress={() => handleWelcomePrompt('اختبر معلوماتي حول هذا الدرس')}>
                              <Text style={styles.promptButtonText}>اختبر معلوماتي</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <FlatList
                          ref={flatListRef}
                          data={visibleMessages.slice().reverse()}
                          keyExtractor={(item) => String(item.id)}
                          renderItem={renderMessageItem}
                          contentContainerStyle={[styles.messagesListContent, { paddingBottom: BOTTOM_EMPTY_SPACE }]}
                          keyboardShouldPersistTaps="handled"
                          style={styles.messagesList}
                          initialNumToRender={2}
                          maxToRenderPerBatch={3}
                          windowSize={5}
                          removeClippedSubviews={true}
                          inverted={true}
                          onScroll={onScroll}
                          maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
                          updateCellsBatchingPeriod={50}
                        />
                      </KeyboardAvoidingView>

                      <View style={[styles.promptContainer, { borderColor: accent[0] + '20' }]}>
                        <TextInput
                          style={[styles.promptInput, { color: inputTextColor }]}
                          placeholder={isSending ? "Waiting for response..." : "Ask a quick question..."}
                          placeholderTextColor={placeholderColor}
                          value={promptText}
                          onChangeText={setPromptText}
                          onSubmitEditing={handleSendPrompt}
                          editable={!isSending}
                          returnKeyType="send"
                        />
                        <Pressable style={[styles.sendButton, isSending ? styles.stopButton : null, { backgroundColor: accent[0], marginLeft: 10 }]} onPress={handleSendPrompt} disabled={promptText.trim().length === 0 && !isSending}>
                          <FontAwesome5 name={isSending ? "stop" : "paper-plane"} size={18} color="white" solid />
                        </Pressable>
                      </View>
                    </BlurView>
                  ) : (
                    <View style={styles.glassPaneAndroid}>
                      <LinearGradient colors={['rgba(255,255,255,0.02)', 'rgba(0,0,0,0.18)']} start={[0,0]} end={[0,1]} style={StyleSheet.absoluteFill} />
                      <GestureDetector gesture={dragGesture}>
                        <View style={styles.dragHandleContainer}><View style={[styles.dragHandle, { backgroundColor: 'rgba(255,255,255,0.10)' }]} /></View>
                      </GestureDetector>

                     <KeyboardAvoidingView behavior={'height'} keyboardVerticalOffset={90} style={{ flex: 1 }}>
                        { (messagesRef.current.length > visibleMessages.length) && (
                          <Pressable onPress={() => { setVisibleCount(v => v + VISIBLE_INCREMENT); Haptics.selectionAsync(); }} style={styles.loadMore}>
                            <Text style={styles.loadMoreText}>تحميل رسائل أقدم</Text>
                          </Pressable>
                        )}

                        {messages.length === 0 && !isSending && (
                          <View style={styles.welcomeContainer}>
                            <FontAwesome5 name="brain" size={24} color="#9CA3AF" style={{ marginBottom: 8 }} />
                            <Text style={styles.welcomeTitle}>يمكنني مساعدتك في:</Text>
                            <TouchableOpacity style={styles.promptButton} onPress={() => handleWelcomePrompt('لخص لي هذا الدرس في نقاط رئيسية')}>
                              <Text style={styles.promptButtonText}>تلخيص الدرس</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.promptButton} onPress={() => handleWelcomePrompt('اشرح لي أهم مفهوم في هذا الدرس')}>
                              <Text style={styles.promptButtonText}>شرح فكرة رئيسية</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.promptButton} onPress={() => handleWelcomePrompt('اختبر معلوماتي حول هذا الدرس')}>
                              <Text style={styles.promptButtonText}>اختبر معلوماتي</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        <FlatList
                          ref={flatListRef}
                          data={visibleMessages.slice().reverse()}
                          keyExtractor={(item) => String(item.id)}
                          renderItem={renderMessageItem}
                          contentContainerStyle={[styles.messagesListContent, { paddingBottom: BOTTOM_EMPTY_SPACE }]}
                          keyboardShouldPersistTaps="handled"
                          style={styles.messagesList}
                          initialNumToRender={2}
                          maxToRenderPerBatch={3}
                          windowSize={5}
                          removeClippedSubviews={true}
                          inverted={true}
                          onScroll={onScroll}
                          maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
                          updateCellsBatchingPeriod={50}
                        />
                      </KeyboardAvoidingView>

                      <View style={[styles.promptContainer, { borderColor: accent[0] + '20' }]}>
                        <TextInput
                          style={[styles.promptInput, { color: inputTextColor }]}
                          placeholder={isSending ? "Waiting for response..." : "Ask a quick question..."}
                          placeholderTextColor={placeholderColor}
                          value={promptText}
                          onChangeText={setPromptText}
                          onSubmitEditing={handleSendPrompt}
                          editable={!isSending}
                          returnKeyType="send"
                        />
                        <Pressable style={[styles.sendButton, isSending ? styles.stopButton : null, { backgroundColor: accent[0], marginLeft: 10 }]} onPress={handleSendPrompt} disabled={promptText.trim().length === 0 && !isSending}>
                          <FontAwesome5 name={isSending ? "stop" : "paper-plane"} size={18} color="white" solid />
                        </Pressable>
                      </View>
                    </View>
                  )}
                </Animated.View>
              </View>
            )}
          </AnimatePresence>

          {toastVisible && (
            <RNAnimated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate ? toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) : 0 }] }]}>
              <TouchableOpacity onPress={onToastPress} style={styles.toastInner}><Text style={styles.toastText}>FAB replied — اضغط للفتح</Text></TouchableOpacity>
            </RNAnimated.View>
          )}
        </View>
      )}
        </SafeAreaView>
  </GestureHandlerRootView>
);}


/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerIcon: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentContainer: { padding: 20, paddingBottom: 220 },

  messagesList: { flex: 1, paddingHorizontal: 10, width: '100%' },
  messagesListContent: { paddingTop: 8, paddingBottom: 8, flexGrow: 1 },

  botRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 6, maxWidth: '100%', alignSelf: 'flex-start' },
  userRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 6, maxWidth: '100%', alignSelf: 'flex-end', justifyContent: 'flex-end' },

  botBubble: { maxWidth: BOT_MAX_WIDTH, backgroundColor: '#c4d0e5ff', borderRadius: 18, padding: 12, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.06)', minWidth: 44 },
  userBubble: { maxWidth: USER_MAX_WIDTH, backgroundColor: '#0EA5A4', borderRadius: 18, padding: 12, minWidth: 44 },

  botTextMarkdown: { body: { color: '#042C2B', fontSize: 15, lineHeight: 22 }, strong: { fontWeight: '700', color: '#164E63' } },
  userTextMarkdown: { body: { color: '#F8FAFC', fontSize: 15, lineHeight: 22, fontWeight: '600' }, strong: { fontWeight: '700', color: '#E6FFFB' } },

  botStrong: { fontWeight: '700', color: '#164E63' },
  userStrong: { fontWeight: '700', color: '#E6FFFB' },

  bodyText: { fontSize: 15, lineHeight: 20 },

  typingLottie: { width: 45, height: 45, transform: [{scale: 1.5}], alignSelf: 'center' },

  seenWrapper: { marginVertical: 6, maxWidth: '85%' },
  seenBadge: { paddingVertical: 2, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(0, 0, 0, 0.22)' },
  seenText: { color: '#94A3B8', fontSize: 12 },

  overlayContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  backdropBlur: { ...StyleSheet.absoluteFillObject, zIndex: 8 },
  backdropSimple: { ...StyleSheet.absoluteFillObject, zIndex: 8, backgroundColor: 'rgba(0,0,0,0.18)' },
  overlayBackground: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },

  chatPanelContainer: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'stretch', paddingHorizontal: 15, paddingBottom: 0 },

  glassPane: {
    marginBottom: 12,
    width: '100%',
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.0,
    borderColor: 'rgba(255, 255, 255, 0.70)',
    backgroundColor: 'transparent',
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 8,
  },

  glassPaneAndroid: {
    marginBottom: 12,
    width: '100%',
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.0,
    borderColor: 'rgba(255, 255, 255, 0.71)',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    paddingBottom: 10,
    paddingHorizontal: 8,
  },

  dragHandleContainer: { alignItems: 'center', paddingVertical: 8 },
  dragHandle: { width: 46, height: 6, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.26)' },

  promptContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.56)', borderRadius: 14, borderWidth: 1, marginTop: 10, marginHorizontal: 10 },
  promptInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 10, paddingHorizontal: 14, fontSize: 15 },
  sendButton: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, marginRight: 0, marginLeft: 0 },
  stopButton: { backgroundColor: '#F87171' },
  toast: { position: 'absolute', top: 18, alignSelf: 'center', zIndex: 40 },
  toastInner: { backgroundColor: 'rgba(20,20,30,0.95)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center' },
  toastText: { color: 'white', fontSize: 13 },

  loadMore: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 6 },
  loadMoreText: { color: '#eee8e8ff' },
    menuOverlay: {
    flex: 1,
  },
  menuContainer: {
    position: 'absolute',
    backgroundColor: '#2d3748', // A dark, clean background
    borderRadius: 12,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  menuText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20, // Space from the input field
  },
  welcomeTitle: {
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  promptButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.79)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  promptButtonText: {
    color: '#989696ff',
    fontSize: 14,
    fontWeight: '500',
  },
   loadMoreText: { color: '#c2cdddff' },
    menuOverlay: {
    flex: 1,
  },
});

export const markdownStyles = StyleSheet.create({
  // العناوين الرئيسية
  heading1: {
    color: '#F8FAFC', // أبيض فاتح
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderColor: '#334155',
    paddingBottom: 6,
    textAlign: 'right',
    letterSpacing: 0.5,
  },

  // العناوين الفرعية
  heading2: {
    color: '#A5B4FC', // بنفسجي ناعم
    fontSize: 22,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 8,
    textAlign: 'right',
  },

  // الفقرات
  body: {
    color: '#E2E8F0', // رمادي فاتح
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'right',
    marginBottom: 8,
  },

  // النصوص الغامقة
  strong: {
    fontWeight: '700',
    color: '#10B981', // أخضر زمردي
  },

  // الروابط
  link: {
    color: '#38BDF8', // أزرق سماوي
    textDecorationLine: 'underline',
  },

  // القوائم
  bullet_list: {
    marginVertical: 6,
    paddingRight: 12,
  },
  list_item: {
    flexDirection: 'row-reverse', // To have bullet on the right for RTL
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bullet_list_icon: {
    color: '#A5B4FC',
    fontSize: 16,
    lineHeight: 26,
    marginRight: 8,
    marginLeft: 5,
  },
  
  // الجداول
  table: {
    borderWidth: 1,
    borderColor: '#475569',
    marginVertical: 10,
  },
  th: {
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    fontWeight: '700',
    padding: 6,
    borderWidth: 1,
    borderColor: '#475569',
    textAlign: 'center',
  },
  td: {
    color: '#E2E8F0',
    padding: 6,
    borderWidth: 1,
    borderColor: '#475569',
    textAlign: 'center',
  },

  // الاقتباسات
  blockquote: {
    borderRightWidth: 4,
    borderColor: '#10B981',
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 8,
    borderRadius: 6,
  },

  // الكود البرمجي
  code_inline: {
    backgroundColor: '#1E293B',
    color: '#FACC15', // أصفر ذهبي
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  code_block: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginVertical: 8,
  },
});