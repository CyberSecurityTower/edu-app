// LessonViewScreen.jsx
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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import FastMarkdownText from 'react-native-markdown-text';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { v4 as uuidv4 } from 'uuid';
import * as Haptics from 'expo-haptics';
import { GestureDetector, Gesture, Swipeable } from 'react-native-gesture-handler';
import { MotiView, AnimatePresence } from 'moti';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import FloatingActionButton from '../components/FloatingActionButton';
import GenerateKitButton from '../components/GenerateKitButton';
import { apiService } from '../config/api';
import { useAppState } from '../context/AppStateContext';
import { getLessonContent, updateLessonProgress } from '../services/firestoreService';

const NOTES_KEY = 'edu_notes_v1';
const BOT_USER = { id: 'bot-fab', firstName: 'FAB' };

// helpers
const WINDOW = Dimensions.get('window');
const DEFAULT_VISIBLE = 12; // how many recent messages to render initially (oldest-first length)
const VISIBLE_INCREMENT = 12;
const MAX_PANEL_RATIO = 0.72; // panel max height relative to screen
const BASE_PANEL_RATIO = 0.38; // base panel height relative to screen
const BOTTOM_EMPTY_SPACE = 60; // px free space at bottom to lift chat

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

// ----------------- MessageItem -----------------
const MessageItem = React.memo(function MessageItem({ message, onLongPressMessage, isCardsMode }) {
  // handle 'seen' marker specially
  if (message.type === 'seen') {
    const isUser = message.author?.id !== BOT_USER.id;
    return (
      <View style={[styles.seenWrapper, isUser ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
        <View style={styles.seenBadge}>
          <Text style={styles.seenText}>Seen</Text>
        </View>
      </View>
    );
  }

  if (message.type === 'typing') {
    return <TypingIndicator />;
  }

  const isBot = message.author?.id === BOT_USER.id;

  const CardInner = (
    <MotiView
      from={{ opacity: 0, translateY: isBot ? 8 : 6, scale: 0.985 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: 'timing', duration: 300 }}
      style={isBot ? styles.botMessageWrapper : styles.userMessageWrapper}
    >
      <Pressable
        onLongPress={() => onLongPressMessage && onLongPressMessage(message)}
        android_ripple={{ color: 'rgba(255,255,255,0.02)' }}
        accessibilityLabel={isBot ? 'bot message' : 'user message'}
      >
        <View style={isBot ? styles.botBubble : styles.userBubble}>
          <FastMarkdownText styles={isBot ? styles.botTextMarkdown : styles.userTextMarkdown}>
            {message.text}
          </FastMarkdownText>
        </View>
      </Pressable>
    </MotiView>
  );

  if (isCardsMode) {
    const renderLeftActions = () => (
      <View style={styles.swipeLeft}>
        <FontAwesome5 name="star" size={18} color="white" />
        <Text style={{ color: 'white', marginLeft: 8 }}>Save</Text>
      </View>
    );
    const renderRightActions = () => (
      <View style={styles.swipeRight}>
        <FontAwesome5 name="copy" size={18} color="#042C2B" />
        <Text style={{ color: '#042C2B', marginLeft: 8 }}>Copy</Text>
      </View>
    );

    return (
      <Swipeable
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        overshootRight={false}
        overshootLeft={false}
      >
        {CardInner}
      </Swipeable>
    );
  }

  return CardInner;
}, (prev, next) => prev.message?.id === next.message?.id && prev.message?.text === next.message?.text);

// ----------------- TypingIndicator -----------------
const TypingIndicator = React.memo(() => (
  <MotiView style={styles.botMessageWrapper} from={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <View style={[styles.botBubble, { paddingVertical: 10, flexDirection: 'row' }]}>
      {[0, 1, 2].map(i => (
        <MotiView
          key={i}
          from={{ translateY: 0 }}
          animate={{ translateY: -5 }}
          transition={{ type: 'timing', duration: 320, delay: i * 140, loop: true, repeatReverse: true }}
          style={styles.typingDot}
        />
      ))}
    </View>
  </MotiView>
));

// ----------------- Screen -----------------
export default function LessonViewScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAppState();

  const { lessonId, lessonTitle, subjectId, pathId, totalLessons } = params || {};
  const chatUserId = user?.uid || 'guest-user';
  const chatUser = useMemo(() => ({ id: chatUserId }), [chatUserId]);
  const CHAT_KEY = useMemo(() => `mini_chat_${lessonId}_${chatUserId}`, [lessonId, chatUserId]);

  const accent = useMemo(() => getAccentFromSubject(subjectId), [subjectId]);

  const [lessonContent, setLessonContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isChatPanelVisible, setChatPanelVisible] = useState(false);
  const [promptText, setPromptText] = useState('');

  // messages stored oldest-first (index 0 oldest, last is newest)
  const [messages, setMessages] = useState([]); // oldest-first
  const messagesRef = useRef([]);
  const [loadedMessages, setLoadedMessages] = useState([]); // oldest-first (from storage)
  const [isSending, setIsSending] = useState(false);

  // visible window (performance)
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE);

  // UI states
  const [cardsMode, setCardsMode] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastAnim = useRef(new RNAnimated.Value(0)).current;

  // references & seen mechanics
  const translateY = useSharedValue(500);
  const flatListRef = useRef(null);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);
  const saveTimeoutRef = useRef(null);

  // seen timers and maps
  const seenTimersRef = useRef({});        // seenId -> timeoutId
  const seenToTypingRef = useRef({});     // seenId -> typingId
  const responsePendingRef = useRef({});  // seenId -> boolean

  // scroll tracking to avoid auto-scroll when user reading older messages
  const isAtBottomRef = useRef(true);

  // dynamic panel height
  const windowHeight = WINDOW.height;
  const basePanelHeight = Math.round(windowHeight * BASE_PANEL_RATIO);
  const maxPanelHeight = Math.round(windowHeight * MAX_PANEL_RATIO);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ---------- toast ----------
  const showToast = useCallback((text = 'FAB sent a reply') => {
    setToastVisible(true);
    RNAnimated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    Haptics.selectionAsync();
    setTimeout(() => {
      RNAnimated.timing(toastAnim, { toValue: 0, duration: 240, useNativeDriver: true }).start(() => setToastVisible(false));
    }, 3000);
  }, [toastAnim]);

  const onToastPress = useCallback(() => {
    setChatPanelVisible(true);
    RNAnimated.timing(toastAnim, { toValue: 0, duration: 240, useNativeDriver: true }).start(() => setToastVisible(false));
  }, [toastAnim]);

  // ---------- save/load ----------
  const saveChat = useCallback((maybeMessages) => {
    try {
      const src = Array.isArray(maybeMessages) ? maybeMessages : messagesRef.current || [];
      if (!Array.isArray(src)) return;
      const storable = src.filter(m => m && m.type !== 'typing' && m.type !== 'intro' && m.type !== 'seen');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        AsyncStorage.setItem(CHAT_KEY, JSON.stringify(storable)).catch(e => console.error('AsyncStorage.setItem error:', e));
      }, 300);
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
      setLoadedMessages(parsed); // oldest-first as stored
    } catch (e) {
      console.error('Error loading mini-chat:', e);
      setLoadedMessages([]);
    }
  }, [CHAT_KEY]);

  // ---------- notes ----------
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

  // ---------- cleanup on unmount ----------
  useEffect(() => {
    return () => {
      // clear seen timers
      try {
        Object.values(seenTimersRef.current).forEach(t => clearTimeout(t));
      } catch (e) {}
      // abort any pending API
      try { if (abortControllerRef.current) abortControllerRef.current.abort(); } catch (e) {}
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // ---------- cancel ----------
  const handleStopGenerating = useCallback(() => {
    try { if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; } } catch (e) {}
    setIsSending(false);
    // remove typing markers
    setMessages(prev => prev.filter(m => m.type !== 'typing' && m.type !== 'seen'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  // ---------- process & respond with SEEN logic ----------
  const processAndRespond = useCallback(async (userMessage, history) => {
    if (isSending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const seenId = uuidv4();
    // append userMessage then 'seen' marker
    setMessages(prev => {
      const next = [...prev, userMessage, { type: 'seen', id: seenId, author: userMessage.author }];
      runOnJS(saveChat)(next);
      return next;
    });

    setIsSending(true);
    abortControllerRef.current = new AbortController();
    responsePendingRef.current[seenId] = false;

    // start API call immediately
    const apiPromise = apiService.getInteractiveChatReply({
      message: `[CONTEXT: The user is in a lesson about: "${lessonTitle}". Content snippet: ${typeof lessonContent === 'string' ? lessonContent.substring(0,1500) : 'No content available.'}...] ${userMessage.text}`,
      userId: user?.uid,
      history: Array.isArray(history) ? history.slice(-5).map(msg => ({ role: msg.author?.id === BOT_USER.id ? 'model' : 'user', text: msg.text || '' })) : [],
    }, abortControllerRef.current.signal);

    // random seen delay 2000-4000ms
    const delayMs = 2000 + Math.floor(Math.random() * 2000);
    const t = setTimeout(() => {
      // if response already arrived -> do nothing
      if (responsePendingRef.current[seenId]) return;
      // convert seen -> typing
      const typingId = uuidv4();
      seenToTypingRef.current[seenId] = typingId;
      setMessages(prev => prev.map(m => (m.id === seenId ? { type: 'typing', id: typingId, author: BOT_USER } : m)));
    }, delayMs);
    seenTimersRef.current[seenId] = t;

    try {
      const response = await apiPromise;
      responsePendingRef.current[seenId] = true;

      const botResponse = { type: 'bot', author: BOT_USER, id: uuidv4(), text: response?.reply ?? 'Sorry, no reply.', reactions: {} };
      setMessages(prev => {
        // if we've converted to typing -> replace typing id
        const typingId = seenToTypingRef.current[seenId];
        if (typingId) {
          const replaced = prev.map(m => (m.id === typingId ? botResponse : m));
          runOnJS(saveChat)(replaced);
          return replaced;
        }
        // else replace seen marker directly
        const replaced = prev.map(m => (m.id === seenId ? botResponse : m));
        runOnJS(saveChat)(replaced);
        return replaced;
      });

      Haptics.selectionAsync();
      if (!isChatPanelVisible) runOnJS(showToast)('FAB replied — اضغط للفتح');
    } catch (error) {
      if (error?.name === 'AbortError') {
        // cleanup markers
        setMessages(prev => prev.filter(m => m.id !== seenId && m.id !== seenToTypingRef.current[seenId]));
      } else {
        console.error('AI Chat Error:', error);
        const errorMessage = { type: 'bot', id: uuidv4(), author: BOT_USER, text: '⚠️ Network Error: Could not reach EduAI tutor. Please check your connection and try again.' };
        setMessages(prev => {
          const typingId = seenToTypingRef.current[seenId];
          if (typingId) {
            const replaced = prev.map(m => (m.id === typingId ? errorMessage : m));
            runOnJS(saveChat)(replaced);
            return replaced;
          }
          const replaced = prev.map(m => (m.id === seenId ? errorMessage : m));
          runOnJS(saveChat)(replaced);
          return replaced;
        });
      }
    } finally {
      // cleanup
      try { clearTimeout(seenTimersRef.current[seenId]); } catch (e) {}
      delete seenTimersRef.current[seenId];
      delete seenToTypingRef.current[seenId];
      delete responsePendingRef.current[seenId];
      setIsSending(false);
      abortControllerRef.current = null;
    }
  }, [lessonContent, lessonTitle, saveChat, user?.uid, isChatPanelVisible, showToast]);

  // ---------- send prompt ----------
  const handleSendPrompt = useCallback(() => {
    if (isSending) { handleStopGenerating(); return; }
    const text = (promptText || '').trim();
    if (text.length === 0) return;
    setPromptText('');
    Keyboard.dismiss();

    const userMessage = { type: 'user', author: chatUser, id: uuidv4(), text, reactions: {} };
    const history = messagesRef.current.filter(m => m.type !== 'typing' && m.type !== 'seen').slice(-50);
    processAndRespond(userMessage, history);
    // immediate light haptic to signal send
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [promptText, isSending, chatUser, processAndRespond, handleStopGenerating]);

  // ---------- long press options ----------
  const handleLongPressMessage = useCallback((message) => {
    Alert.alert(
      'اختيارات الرسالة',
      'اختر إجراء',
      [
        { text: 'نسخ', onPress: async () => { await Clipboard.setStringAsync(message.text || ''); Alert.alert('Copied'); } },
        { text: 'حفظ كملاحظة', onPress: () => saveMessageToNotes(message) },
        { text: 'إعادة السؤال', onPress: () => { setPromptText(message.text || ''); setChatPanelVisible(true); } },
        { text: 'إلغاء', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [saveMessageToNotes]);

  // ---------- load initial lesson + chat ----------
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
    return () => { mountedRef.current = false; if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [lessonId, user?.uid, subjectId, pathId, totalLessons, loadChat]);

  // when loadedMessages change and chat opened, merge into messages if messages empty
  useEffect(() => {
    if (isChatPanelVisible) {
      InteractionManager.runAfterInteractions(() => {
        setMessages(prev => (Array.isArray(prev) && prev.length > 0 ? prev : (Array.isArray(loadedMessages) && loadedMessages.length > 0 ? loadedMessages : prev)));
      });
      translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
    } else {
      // slide out then save
      translateY.value = withTiming(500, { duration: 260 }, (finished) => {
        if (finished) runOnJS(saveChat)(messagesRef.current);
      });
      runOnJS(Keyboard.dismiss)();
      handleStopGenerating();
    }
  }, [isChatPanelVisible, loadedMessages, saveChat, handleStopGenerating, translateY]);

  // ---------- drag gesture ----------
  const context = useSharedValue({ y: 0 });
  const dragGesture = Gesture.Pan()
    .onStart(() => { context.value = { y: translateY.value }; })
    .onUpdate((ev) => { translateY.value = Math.max(0, context.value.y + ev.translationY); })
    .onEnd(() => {
      if (translateY.value > 140) runOnJS(setChatPanelVisible)(false);
      else translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
    });

  const animatedPanelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  // ---------- visible messages window (performance) ----------
  const visibleMessages = useMemo(() => {
    // messages is oldest-first; show last `visibleCount`
    if (!Array.isArray(messages) || messages.length === 0) return [];
    const start = Math.max(0, messages.length - visibleCount);
    return messages.slice(start);
  }, [messages, visibleCount]);

  const canLoadMore = messages.length > visibleCount || (loadedMessages.length > messages.length);

  // ---------- auto-scroll behavior ----------
  const onScroll = useCallback((ev) => {
    const { contentOffset, layoutMeasurement, contentSize } = ev.nativeEvent;
    // distance from bottom (since list is inverted, bottom offset is different)
    const distanceFromBottom = contentOffset.y; // when inverted, offset 0 is bottom
    isAtBottomRef.current = distanceFromBottom < 80;
  }, []);

  useEffect(() => {
    // when visibleMessages change, scroll to bottom only if user is at bottom
    if (!flatListRef.current) return;
    if (isAtBottomRef.current) {
      setTimeout(() => {
        try {
          // for inverted FlatList, scrollToOffset({offset: 0}) scrolls to bottom
          flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        } catch (e) {}
      }, 80);
    }
  }, [visibleMessages.length]);

  // ---------- render item ----------
  const renderMessageItem = useCallback(({ item }) => {
    if (!item) return null;
    return <MessageItem message={item} onLongPressMessage={handleLongPressMessage} isCardsMode={cardsMode} />;
  }, [handleLongPressMessage, cardsMode]);

  // ---------- UI: dynamic panel height calculation ----------
  const computePanelHeight = () => {
    const extra = isSending ? 80 : 30;
    const desired = Math.min(maxPanelHeight, basePanelHeight + extra);
    return desired;
  };
  const panelHeight = computePanelHeight();

  // ---------- UI return ----------
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon} accessibilityLabel="back">
          <FontAwesome5 name="arrow-left" size={22} color="white" />
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{lessonTitle || 'Lesson'}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => setCardsMode(v => !v)} style={{ marginRight: 10 }}>
            <FontAwesome5 name={cardsMode ? 'th-large' : 'list'} size={18} color="white" />
          </Pressable>

          <Pressable onPress={() => { Haptics.selectionAsync(); setChatPanelVisible(true); }} style={styles.headerIcon} accessibilityLabel="open chat">
            <FontAwesome5 name="comments" size={18} color="white" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContent}><ActivityIndicator size="large" color={accent[0]} /></View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.contentContainer} scrollEventThrottle={400}>
            <View style={{ writingDirection: 'rtl' }}>
              <Markdown style={markdownStyles}>{lessonContent || 'No content available.'}</Markdown>
            </View>
          </ScrollView>

          <GenerateKitButton onPress={() => router.push({ pathname: '/study-kit', params: { lessonId, lessonTitle, subjectId, pathId } })} />
          <FloatingActionButton onPress={() => setChatPanelVisible(true)} />

          <AnimatePresence>
            {isChatPanelVisible && (
              <View style={styles.overlayContainer} pointerEvents="box-none">
                <Pressable style={styles.overlayBackground} onPress={() => setChatPanelVisible(false)} accessibilityLabel="close chat background" />

                <Animated.View style={[styles.chatPanelContainer, animatedPanelStyle, { height: panelHeight }]}>
                  <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="dark" style={styles.glassPane}>
                    <LinearGradient
                      colors={[accent[1] + '10', 'rgba(0,0,0,0.6)']}
                      start={[0, 0]}
                      end={[0, 1]}
                      style={StyleSheet.absoluteFill}
                    />

                    <GestureDetector gesture={dragGesture}>
                      <View style={styles.dragHandleContainer} accessible accessibilityRole="button" accessibilityLabel="drag handle to close">
                        <View style={[styles.dragHandle, { backgroundColor: 'rgba(255,255,255,0.18)' }]} />
                      </View>
                    </GestureDetector>

                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90} style={{ flex: 1 }}>
                      {/* Load more earlier messages button */}
                      { (messagesRef.current.length > visibleMessages.length) && (
                        <Pressable onPress={() => { setVisibleCount(v => v + VISIBLE_INCREMENT); Haptics.selectionAsync(); }} style={styles.loadMore}>
                          <Text style={styles.loadMoreText}>تحميل رسائل أقدم</Text>
                        </Pressable>
                      )}

                      <FlatList
                        ref={flatListRef}
                        data={visibleMessages.slice().reverse()} // reverse so newest-last appear at bottom with inverted=true
                        keyExtractor={(item) => String(item.id)}
                        renderItem={renderMessageItem}
                        contentContainerStyle={[styles.messagesListContent, { paddingBottom: BOTTOM_EMPTY_SPACE }]}
                        keyboardShouldPersistTaps="handled"
                        style={styles.messagesList}
                        initialNumToRender={6}
                        maxToRenderPerBatch={6}
                        windowSize={5}
                        removeClippedSubviews={true}
                        inverted={true}
                        onScroll={onScroll}
                      />
                    </KeyboardAvoidingView>

                    <View style={[styles.promptContainer, { borderColor: accent[0] + '20' }]}>
                      <TextInput
                        style={styles.promptInput}
                        placeholder={isSending ? "Waiting for response..." : "Ask a quick question..."}
                        placeholderTextColor="#9CA3AF"
                        value={promptText}
                        onChangeText={setPromptText}
                        onSubmitEditing={handleSendPrompt}
                        editable={!isSending}
                        returnKeyType="send"
                        accessibilityLabel="Chat input"
                      />
                      <Pressable
                        style={[styles.sendButton, isSending ? styles.stopButton : null, { backgroundColor: accent[0] }]}
                        onPress={handleSendPrompt}
                        disabled={promptText.trim().length === 0 && !isSending}
                        accessibilityLabel={isSending ? 'stop generating' : 'send message'}
                      >
                        <FontAwesome5 name={isSending ? "stop" : "paper-plane"} size={18} color="white" solid />
                      </Pressable>
                    </View>
                  </BlurView>
                </Animated.View>
              </View>
            )}
          </AnimatePresence>

          {/* toast (top center) */}
          {toastVisible && (
            <RNAnimated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate ? toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) : 0 }] }]}>
              <TouchableOpacity onPress={onToastPress} style={styles.toastInner}>
                <Text style={styles.toastText}>FAB replied — اضغط للفتح</Text>
              </TouchableOpacity>
            </RNAnimated.View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

// ----------------- styles -----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerIcon: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentContainer: { padding: 20, paddingBottom: 220 },

  messagesList: { flex: 1, paddingHorizontal: 10 },
  messagesListContent: { paddingTop: 8, paddingBottom: 8 },

  botMessageWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 6, maxWidth: '85%', alignSelf: 'flex-start' },
  userMessageWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 6, maxWidth: '85%', alignSelf: 'flex-end' },

  botBubble: { backgroundColor: '#0F1724', borderRadius: 14, borderBottomLeftRadius: 6, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  userBubble: { backgroundColor: '#0EA5A4', borderRadius: 14, borderBottomRightRadius: 6, padding: 12 },

  botTextMarkdown: { body: { color: '#F8FAFC', fontSize: 15, lineHeight: 22 }, strong: { fontWeight: '700', color: '#7EE787' } },
  userTextMarkdown: { body: { color: '#042C2B', fontSize: 15, lineHeight: 22, fontWeight: '600' }, strong: { fontWeight: '700', color: '#052427' } },

  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#94A3B8', marginHorizontal: 4 },

  // seen styles
  seenWrapper: { marginVertical: 6, maxWidth: '85%' },
  seenBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)' },
  seenText: { color: '#94A3B8', fontSize: 12 },

  overlayContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  overlayBackground: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'transparent' },
  chatPanelContainer: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 0 },

  glassPane: { width: '100%', borderRadius: 20, overflow: 'hidden', borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: Platform.OS === 'android' ? 'rgba(8,10,18,0.88)' : 'transparent', paddingTop: 10, paddingBottom: 6, paddingHorizontal: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 20 },

  dragHandleContainer: { alignItems: 'center', paddingVertical: 8 },
  dragHandle: { width: 46, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },

  promptContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, borderWidth: 1, marginTop: 10, marginHorizontal: 10 },
  promptInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 10, paddingHorizontal: 14, color: 'white', fontSize: 15 },
  sendButton: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, marginRight: 8, marginLeft: 6 },
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
  heading1: { color: '#FFFFFF', fontSize: 25, fontWeight: '700', marginBottom: 10, borderBottomWidth: 1, borderColor: '#334155', paddingBottom: 8, textAlign: 'right' },
  body: { color: '#D1D5DB', fontSize: 16, lineHeight: 24, textAlign: 'right' },
  strong: { fontWeight: 'bold', color: '#10B981' },
});
