import { FontAwesome5 } from '@expo/vector-icons'; // <--- تم استيراد FontAwesome5
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur'; // <--- تم استيراد BlurView
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient'; // <--- تم استيراد LinearGradient
import { useLocalSearchParams, useRouter } from 'expo-router'; // <--- تم استيراد Expo Router
import LottieView from 'lottie-react-native'; // <--- تم استيراد LottieView
import { AnimatePresence, MotiView } from 'moti'; // <--- تم استيراد Moti
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'; // <--- تم إصلاح استيراد React
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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
const MESSAGE_HISTORY_CAP = 120;

/* display widths */
const BOT_MAX_WIDTH = Math.round(WINDOW.width * 0.75); // ✨ [MODIFIED] Max width for automatic sizing
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
    // only render typing Lottie when allowed (i.e. chat panel visible)
    if (!showTyping) return null;
    return (
      <View style={styles.botRow}>
        <View style={[styles.botBubble, { paddingVertical: 8, minWidth: 60 }]}>
          <LottieView source={require('../assets/images/typing.json')} autoPlay loop style={styles.typingLottie} />
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
}, (a, b) => a.message?.id === b.message?.id && a.message?.text === b.message?.text && a.message?.seenAnimated === b.message?.seenAnimated && a.disableAnim === b.disableAnim && a.showTyping === b.showTyping); // ✨ [FIXED] إضافة showTyping للاعتمادية

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

  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE);
  const [toastVisible, setToastVisible] = useState(false);
  const toastAnim = useRef(new RNAnimated.Value(0)).current;

  const backgroundLottieRef = useRef(null);

  const translateY = useSharedValue(500);
  const flatListRef = useRef(null);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  // performance helpers & timers
  const suspendBackgroundRef = useRef(false); // when true: suspend saves/heavy work
  const messageUpdateQueueRef = useRef(null);
  const batchedFlushTimeoutRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const seenTimersRef = useRef({});
  const seenToTypingRef = useRef({});
  const responsePendingRef = useRef({});

  const isAtBottomRef = useRef(true);
  const windowHeight = WINDOW.height;
  const basePanelHeight = Math.round(windowHeight * BASE_PANEL_RATIO);
  const maxPanelHeight = Math.round(windowHeight * MAX_PANEL_RATIO);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  /* ---------- save/load (save only when mini-chat closes) ---------- */
  const saveChat = useCallback((maybeMessages) => {
    try {
      const src = Array.isArray(maybeMessages) ? maybeMessages : messagesRef.current || [];
      if (!Array.isArray(src)) return;
      const storableOldestFirst = src.filter(m => m && m.type !== 'typing' && m.type !== 'intro' && m.type !== 'seen');
      const storable = storableOldestFirst.slice().reverse();
      // immediate write (we call saveChat when chat closed)
      AsyncStorage.setItem(CHAT_KEY, JSON.stringify(storable)).catch(e => console.error('AsyncStorage.setItem error:', e));
    } catch (e) {
      console.error('Error saving mini-chat:', e);
    }
  }, [CHAT_KEY]);

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

  // batching updates to reduce renders & disk writes
  const enqueueMessageUpdate = useCallback((updater, options = { save: false }) => {
    // compose updates instead of overwriting to preserve order
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
        // only save if explicitly requested and not suspended
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
      try { Object.values(seenTimersRef.current).forEach(o => { if (o.seenTimer) clearTimeout(o.seenTimer); if (o.typingTimer) clearTimeout(o.typingTimer); }); } catch (e) {}
      try { if (abortControllerRef.current) abortControllerRef.current.abort(); } catch (e) {}
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const showToast = useCallback((text = 'FAB sent a reply') => {
    setToastVisible(true);
    RNAnimated.timing(toastAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    Haptics.selectionAsync();
    setTimeout(() => RNAnimated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToastVisible(false)), 3000);
  }, [toastAnim]);

  const onToastPress = useCallback(() => { setChatPanelVisible(true); RNAnimated.timing(toastAnim, { toValue: 0, duration: 240, useNativeDriver: true }).start(() => setToastVisible(false)); }, [toastAnim]);

  const handleStopGenerating = useCallback(() => {
    try { if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; } } catch (e) {}
    setIsSending(false);
    // remove typing/seen placeholders (don't save here)
    setMessagesSafe(prev => (Array.isArray(prev) ? prev.filter(m => m.type !== 'typing' && m.type !== 'seen') : prev));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [setMessagesSafe]);

  /* ---------- process & respond with SEEN flow (fixed + robust) ---------- */
  const processAndRespond = useCallback(async (userMessage, history) => {
    if (isSending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // append user message immediately (batched, no save while chat open)
    setMessagesSafe(prev => (Array.isArray(prev) ? [...prev, userMessage] : [userMessage]));

    setIsSending(true);
    const seenId = uuidv4();
    abortControllerRef.current = new AbortController();
    responsePendingRef.current[seenId] = false;

    const apiPromise = apiService.getInteractiveChatReply({
      message: `[CONTEXT: The user is in a lesson about: "${lessonTitle}". Content snippet: ${typeof lessonContent === 'string' ? lessonContent.substring(0,1500) : 'No content available.'}...] ${userMessage.text}`,
      userId: user?.uid,
      history: Array.isArray(history) ? history.slice(-5).map(msg => ({ role: msg.author?.id === BOT_USER.id ? 'model' : 'user', text: msg.text || '' })) : [],
    }, abortControllerRef.current.signal);

    // schedule seen after 1s (but skip if response already arrived)
    const seenTimer = setTimeout(() => {
      if (responsePendingRef.current[seenId]) return;

      setMessagesSafe(prev => {
        const mapped = Array.isArray(prev) ? prev.map(m => (m.id === userMessage.id ? { ...m, seenAnimated: true } : m)) : [userMessage];
        return [...mapped, { type: 'seen', id: seenId, author: userMessage.author }];
      });

      const delayMs = 2000 + Math.floor(Math.random() * 2000);
      const typingTimer = setTimeout(() => {
        if (responsePendingRef.current[seenId]) return;
        const typingId = uuidv4();
        seenToTypingRef.current[seenId] = typingId;
        // ✨ [FIX] Replace 'seen' with 'typing' instead of just mapping
        setMessagesSafe(prev => (Array.isArray(prev) ? prev.map(m => (m.id === seenId ? { type: 'typing', id: typingId, author: BOT_USER } : m)) : prev));
      }, delayMs);

      seenTimersRef.current[seenId] = { seenTimer: null, typingTimer };
    }, 1000);

    seenTimersRef.current[seenId] = { seenTimer, typingTimer: null };

    try {
      const response = await apiPromise;
      responsePendingRef.current[seenId] = true;

      // clear any scheduled timers (defensive)
      try {
        const o = seenTimersRef.current[seenId];
        if (o) { if (o.seenTimer) clearTimeout(o.seenTimer); if (o.typingTimer) clearTimeout(o.typingTimer); }
      } catch (e) {}

      const botResponse = { type: 'bot', author: BOT_USER, id: uuidv4(), text: response?.reply ?? 'Sorry, no reply.', reactions: {} };
      
      // ✨ [FIXED] Robustly replace typing/seen placeholders by filtering them out first
      setMessagesSafe(prev => {
          if (!Array.isArray(prev)) return [botResponse];
          const typingId = seenToTypingRef.current[seenId];
          // Filter out ANY related placeholders for this response
          const filtered = prev.filter(m => m.id !== seenId && m.id !== typingId);
          // Add the new bot response
          return [...filtered, botResponse];
      });

      Haptics.selectionAsync();
      if (!isChatPanelVisible) showToast('FAB replied — اضغط للفتح');
    } catch (error) {
      const errorMessage = { type: 'bot', id: uuidv4(), author: BOT_USER, text: '⚠️ Network Error: Could not reach EduAI tutor. Please check your connection and try again.' };

      // ✨ [FIXED] Robustly replace typing/seen placeholders with an error message
      setMessagesSafe(prev => {
          if (!Array.isArray(prev)) return [errorMessage];
          const typingId = seenToTypingRef.current[seenId];
          const filtered = prev.filter(m => m.id !== seenId && m.id !== typingId && m.id !== userMessage.id);
          return [...filtered, userMessage, errorMessage]; // Re-add user message for context
      });

    } finally {
      try {
        const o = seenTimersRef.current[seenId];
        if (o) { if (o.seenTimer) clearTimeout(o.seenTimer); if (o.typingTimer) clearTimeout(o.typingTimer); }
      } catch (e) {}
      delete seenTimersRef.current[seenId];
      delete seenToTypingRef.current[seenId];
      delete responsePendingRef.current[seenId];
      setIsSending(false);
      abortControllerRef.current = null;
    }
  }, [lessonContent, lessonTitle, user?.uid, isChatPanelVisible, showToast, setMessagesSafe, isSending]);

  const handleSendPrompt = useCallback(() => {
    if (isSending) { handleStopGenerating(); return; }
    const text = (promptText || '').trim();
    if (text.length === 0) return;
    setPromptText('');
    Keyboard.dismiss();
    const userMessage = { type: 'user', author: chatUser, id: uuidv4(), text, reactions: {} };
    const history = messagesRef.current.filter(m => m.type !== 'typing' && m.type !== 'seen').slice(-50);
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
      { text: 'إعادة السؤال', onPress: () => { setPromptText(message.text || ''); setChatPanelVisible(true); } },
      { text: 'إلغاء', style: 'cancel' },
    ], { cancelable: true });
  }, [saveMessageToNotes]);

  useEffect(() => {
    mountedRef.current = true;
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
    return () => { mountedRef.current = false; };
  }, [lessonId, user?.uid, subjectId, pathId, totalLessons, loadChat]);

  /* ---------- background Lottie control: pause/reset on open, play on close ---------- */
  useEffect(() => {
    try {
      const l = backgroundLottieRef.current;
      if (!l) return;
      if (isChatPanelVisible) {
        suspendBackgroundRef.current = true;
        if (typeof l.pause === 'function') l.pause();
        // defensive: reset if available to free frames
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
  useEffect(() => {
    if (isChatPanelVisible) {
      // suspend saves/expensive rendering while chat open
      suspendBackgroundRef.current = true;
      InteractionManager.runAfterInteractions(() => {
        setMessagesSafe(prev => (Array.isArray(prev) && prev.length > 0 ? prev : (Array.isArray(loadedMessages) && loadedMessages.length > 0 ? loadedMessages : prev)), { save: false });
      });
      translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
    } else {
      // when closing: persist chat ONCE and resume background
      suspendBackgroundRef.current = false;
      translateY.value = withTiming(500, { duration: 260 }, (finished) => {
        if (finished) {
          runOnJS(saveChat)(messagesRef.current);
        }
      });
      try { if (backgroundLottieRef.current && typeof backgroundLottieRef.current.play === 'function') backgroundLottieRef.current.play(); } catch (e) {}
      runOnJS(Keyboard.dismiss)();
      handleStopGenerating();
    }
  }, [isChatPanelVisible, loadedMessages, saveChat, handleStopGenerating, translateY, setMessagesSafe]);

  const context = useSharedValue({ y: 0 });
  const dragGesture = Gesture.Pan()
    .onStart(() => { context.value = { y: translateY.value }; })
    .onUpdate((ev) => { translateY.value = Math.max(0, context.value.y + ev.translationY); })
    .onEnd(() => {
      if (translateY.value > 140) runOnJS(setChatPanelVisible)(false);
      else translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
    });
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
        try { flatListRef.current.scrollToOffset({ offset: 0, animated: true }); } catch (e) {}
      }, 80);
    }
  }, [visibleMessages.length]);

  const disableAnimations = messages.length > 12; // lower threshold for weaker devices

  const renderMessageItem = useCallback(({ item }) => {
    if (!item) return null;
    // ✨ [FIXED] تمرير isChatPanelVisible كـ showTyping
    return <MessageItem
        message={item}
        onLongPressMessage={handleLongPressMessage}
        disableAnim={disableAnimations}
        showTyping={isChatPanelVisible}
    />;
  }, [handleLongPressMessage, disableAnimations, isChatPanelVisible]); // ✨ [FIXED] إضافة isChatPanelVisible للاعتمادية

  const computePanelHeight = () => {
    const extra = isSending ? 80 : 30;
    return Math.min(maxPanelHeight, basePanelHeight + extra);
  };
  const panelHeight = computePanelHeight();

  const inputTextColor = Platform.OS === 'android' ? '#0b1220' : '#FFFFFF';
  const placeholderColor = '#9CA3AF';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}><FontAwesome5 name="arrow-left" size={22} color="white" /></Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{lessonTitle || 'Lesson'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => { Haptics.selectionAsync(); setChatPanelVisible(true); }} style={styles.headerIcon}>
            <FontAwesome5 name="comments" size={18} color="white" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          {!isChatPanelVisible && (
            <Pressable onPress={() => { Haptics.selectionAsync(); setChatPanelVisible(true); }}>
              <LottieView ref={backgroundLottieRef} source={require('../assets/images/robot.json')} autoPlay loop style={{ width: 220, height: 220 }} />
            </Pressable>
          )}
          <ActivityIndicator size="large" color={accent[0]} style={{ marginTop: 8 }} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* ✨ [FIXED] Always render the full markdown view for a consistent UX */}
          <ScrollView contentContainerStyle={styles.contentContainer} scrollEventThrottle={400}>
            <View style={{ writingDirection: 'rtl' }}>
              <Markdown style={markdownStyles}>{lessonContent || 'No content available.'}</Markdown>
            </View>

            {/* background robot Lottie visible when chat is closed - press to open chat */}
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              {!isChatPanelVisible && (
                <Pressable onPress={() => { Haptics.selectionAsync(); setChatPanelVisible(true); }}>
                  <LottieView ref={backgroundLottieRef} source={require('../assets/images/robot.json')} autoPlay loop style={{ width: 160, height: 160 }} />
                </Pressable>
              )}
            </View>
          </ScrollView>

          <GenerateKitButton onPress={() => router.push({ pathname: '/study-kit', params: { lessonId, lessonTitle, subjectId, pathId } })} />
          <FloatingActionButton onPress={() => setChatPanelVisible(true)} />

          <AnimatePresence>
            {isChatPanelVisible && (
              <View style={styles.overlayContainer} pointerEvents="box-none">
                {Platform.OS === 'ios' ? (
                  <BlurView intensity={60} tint="dark" style={styles.backdropBlur} pointerEvents="none" />
                ) : (
                  <View style={styles.backdropSimple} pointerEvents="none" />
                )}
                <Pressable style={styles.overlayBackground} onPress={() => setChatPanelVisible(false)} />

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
  );
}

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

  typingLottie: { width: 75, height: 75 },

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
  dragHandle: { width: 46, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)' },

  promptContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.56)', borderRadius: 14, borderWidth: 1, marginTop: 10, marginHorizontal: 10 },
  promptInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 10, paddingHorizontal: 14, fontSize: 15 },
  sendButton: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, marginRight: 0, marginLeft: 0 },
  stopButton: { backgroundColor: '#F87171' },

  swipeLeft: { backgroundColor: '#F59E0B', justifyContent: 'center', padding: 12, alignItems: 'center', flexDirection: 'row' },
  swipeRight: { backgroundColor: '#BBF7D0', justifyContent: 'center', padding: 12, alignItems: 'center', flexDirection: 'row' },

  toast: { position: 'absolute', top: 18, alignSelf: 'center', zIndex: 40 },
  toastInner: { backgroundColor: 'rgba(20,20,30,0.95)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center' },
  toastText: { color: 'white', fontSize: 13 },

  loadMore: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 6 },
  loadMoreText: { color: '#D1D5DB' },
});

const markdownStyles = StyleSheet.create({
  heading1: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginBottom: 12, borderBottomWidth: 1, borderColor: '#334155', paddingBottom: 8, textAlign: 'right' },
  body: { color: '#D1D5DB', fontSize: 16, lineHeight: 24, textAlign: 'right' },
  strong: { fontWeight: 'bold', color: '#10B981' },
});