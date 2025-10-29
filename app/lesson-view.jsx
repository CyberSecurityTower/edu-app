// LessonViewScreen.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import FastMarkdownText from 'react-native-markdown-text';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import * as Haptics from 'expo-haptics';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { MotiView, AnimatePresence } from 'moti';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import FloatingActionButton from '../components/FloatingActionButton';
import GenerateKitButton from '../components/GenerateKitButton';
import { apiService } from '../config/api';
import { useAppState } from '../context/AppStateContext';
import { getLessonContent, updateLessonProgress } from '../services/firestoreService';

const BOT_USER = { id: 'bot-fab', firstName: 'FAB' };

// ----------------- MessageItem -----------------
const MessageItem = React.memo(function MessageItem({ message }) {
  const isBot = message.author?.id === BOT_USER.id;
  return (
    <MotiView
      from={{ opacity: 0, translateY: isBot ? 6 : 0 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 220 }}
      style={isBot ? styles.botMessageWrapper : styles.userMessageWrapper}
      accessibilityLabel={isBot ? 'bot message' : 'user message'}
    >
      <View style={isBot ? styles.botBubble : styles.userBubble}>
        <FastMarkdownText styles={isBot ? styles.botTextMarkdown : styles.userTextMarkdown}>
          {message.text}
        </FastMarkdownText>
      </View>
    </MotiView>
  );
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

// ----------------- Main Screen -----------------
export default function LessonViewScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAppState();

  const { lessonId, lessonTitle, subjectId, pathId, totalLessons } = params || {};
  const chatUserId = user?.uid || 'guest-user';
  const chatUser = useMemo(() => ({ id: chatUserId }), [chatUserId]);
  const CHAT_KEY = useMemo(() => `mini_chat_${lessonId}_${chatUserId}`, [lessonId, chatUserId]);

  const [lessonContent, setLessonContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isChatPanelVisible, setChatPanelVisible] = useState(false);
  const [promptText, setPromptText] = useState('');

  // newest-first messages
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  const [loadedMessages, setLoadedMessages] = useState([]); // newest-first
  const [isSending, setIsSending] = useState(false);

  const translateY = useSharedValue(500);
  const flatListRef = useRef(null);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  // debounce save (simple)
  const saveTimeoutRef = useRef(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ---------- safe save with debounce ----------
  const saveChat = useCallback((maybeMessages) => {
    try {
      const src = Array.isArray(maybeMessages) ? maybeMessages : messagesRef.current || [];
      if (!Array.isArray(src)) return;
      const storable = src.filter(m => m && m.type !== 'typing' && m.type !== 'intro').slice().reverse();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        AsyncStorage.setItem(CHAT_KEY, JSON.stringify(storable)).catch(e => {
          console.error('AsyncStorage.setItem error:', e);
        });
      }, 400); // debounce 400ms
    } catch (e) {
      console.error('Error saving mini-chat:', e);
    }
  }, [CHAT_KEY]);

  // ---------- load chat ----------
  const loadChat = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(CHAT_KEY);
      if (!raw) {
        setLoadedMessages([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setLoadedMessages([]);
        return;
      }
      setLoadedMessages(parsed.slice().reverse()); // newest-first
    } catch (e) {
      console.error('Error loading mini-chat:', e);
      setLoadedMessages([]);
    }
  }, [CHAT_KEY]);

  // ---------- cancel generation ----------
  const handleStopGenerating = useCallback(() => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    } catch (e) {}
    setIsSending(false);
    setMessages(prev => prev.filter(m => m.type !== 'typing'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  // ---------- process & respond ----------
  const processAndRespond = useCallback(async (userMessage, history) => {
    if (isSending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const typingIndicator = { type: 'typing', id: uuidv4(), author: BOT_USER };
    setMessages(prev => [typingIndicator, userMessage, ...prev.filter(m => m.type !== 'typing' && m.type !== 'intro')]);
    setIsSending(true);

    abortControllerRef.current = new AbortController();

    const historyForAPI = Array.isArray(history) ? history.slice(-5).map(msg => ({
      role: msg.author?.id === BOT_USER.id ? 'model' : 'user',
      text: msg.text || '',
    })) : [];

    const contextSnippet = typeof lessonContent === 'string' ? lessonContent.substring(0, 1500) : 'No content available.';
    const finalUserMessageText = `[CONTEXT: The user is in a lesson about: "${lessonTitle}". Content snippet: ${contextSnippet}...] ${userMessage.text}`;

    try {
      const response = await apiService.getInteractiveChatReply({
        message: finalUserMessageText,
        userId: user?.uid,
        history: historyForAPI,
      }, abortControllerRef.current.signal);

      const botResponse = { type: 'bot', author: BOT_USER, id: uuidv4(), text: response?.reply ?? 'Sorry, no reply.', reactions: {} };

      setMessages(prev => {
        const newMessages = [botResponse, ...prev.filter(m => m.id !== typingIndicator.id)];
        runOnJS(saveChat)(newMessages);
        return newMessages;
      });
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('AI Chat Error:', error);
        const errorMessage = { type: 'bot', id: uuidv4(), author: BOT_USER, text: '⚠️ Network Error: Could not reach EduAI tutor. Please check your connection and try again.' };
        setMessages(prev => [errorMessage, ...prev.filter(m => m.id !== typingIndicator.id)]);
        runOnJS(saveChat)(messagesRef.current);
      } else {
        setMessages(prev => prev.filter(m => m.id !== typingIndicator.id));
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  // exclude isSending to avoid recreating on every send
  }, [lessonContent, lessonTitle, saveChat, user?.uid]);

  // ---------- send prompt ----------
  const handleSendPrompt = useCallback(() => {
    if (isSending) {
      handleStopGenerating();
      return;
    }
    const text = (promptText || '').trim();
    if (text.length === 0) return;

    setPromptText('');
    Keyboard.dismiss();

    const userMessage = { type: 'user', author: chatUser, id: uuidv4(), text, reactions: {} };
    const history = messagesRef.current.filter(m => m.type !== 'typing').slice().reverse();
    processAndRespond(userMessage, history);
  }, [promptText, isSending, chatUser, processAndRespond, handleStopGenerating]);

  // ---------- load lesson + chat ----------
  useEffect(() => {
    mountedRef.current = true;
    const load = async () => {
      if (!user?.uid || !lessonId || !subjectId || !pathId) {
        if (mountedRef.current) setIsLoading(false);
        return;
      }
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

  // ---------- open/close chat panel ----------
  useEffect(() => {
    if (isChatPanelVisible) {
      // avoid heavy setState during animation/interaction — use InteractionManager
      InteractionManager.runAfterInteractions(() => {
        setMessages(prev => (Array.isArray(prev) && prev.length > 0 ? prev : (Array.isArray(loadedMessages) && loadedMessages.length > 0 ? loadedMessages : prev)));
      });
      translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
    } else {
      translateY.value = withSpring(500, { damping: 18, stiffness: 120 });
      runOnJS(saveChat)(messagesRef.current);
      runOnJS(Keyboard.dismiss)();
      handleStopGenerating();
    }
  }, [isChatPanelVisible, loadedMessages, saveChat, handleStopGenerating, translateY]);

  // ---------- drag gesture (only on handle) ----------
  const context = useSharedValue({ y: 0 });
  const dragGesture = Gesture.Pan()
    .onStart(() => { context.value = { y: translateY.value }; })
    .onUpdate((ev) => { translateY.value = Math.max(0, context.value.y + ev.translationY); })
    .onEnd(() => {
      if (translateY.value > 140) {
        runOnJS(setChatPanelVisible)(false);
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
      }
    });

  const animatedPanelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  // ---------- intro/final messages ----------
  const introMessage = useMemo(() => ({
    type: 'bot',
    id: 'intro',
    text: `Hello! I'm FAB, your AI tutor. Ask me anything about "${lessonTitle || 'this lesson'}"`,
    author: BOT_USER,
  }), [lessonTitle]);

  const finalMessages = useMemo(() => (Array.isArray(messages) && messages.length > 0 ? messages : [introMessage]), [messages, introMessage]);

  const renderMessageItem = useCallback(({ item }) => {
    if (!item) return null;
    if (item.type === 'typing') return <TypingIndicator />;
    return <MessageItem message={item} />;
  }, []);

  // auto-scroll newest (index 0) when message count changes
  useEffect(() => {
    if (!flatListRef.current) return;
    setTimeout(() => {
      try { flatListRef.current?.scrollToOffset?.({ offset: 0, animated: true }); } catch (e) {}
    }, 90);
  }, [finalMessages.length]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon} accessibilityLabel="back">
          <FontAwesome5 name="arrow-left" size={22} color="white" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{lessonTitle || 'Lesson'}</Text>
        <View style={{ width: 50 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContent}><ActivityIndicator size="large" color="#10B981" /></View>
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
                {/* background to close when tapping outside */}
                <Pressable style={styles.overlayBackground} onPress={() => setChatPanelVisible(false)} accessibilityLabel="close chat background" />

                {/* chat panel above background */}
                <Animated.View style={[styles.chatPanelContainer, animatedPanelStyle]}>
                  <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="dark" style={styles.glassPane}>
                    {/* drag handle (only this element handles the pan gesture) */}
                    <GestureDetector gesture={dragGesture}>
                      <View style={styles.dragHandleContainer} accessible accessibilityRole="button" accessibilityLabel="drag handle to close">
                        <View style={styles.dragHandle} />
                      </View>
                    </GestureDetector>

                    {/* messages: user can freely scroll here */}
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
                      <FlatList
                        ref={flatListRef}
                        data={finalMessages}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={renderMessageItem}
                        contentContainerStyle={styles.messagesListContent}
                        inverted
                        keyboardShouldPersistTaps="handled"
                        style={styles.messagesList}
                        initialNumToRender={8}
                        maxToRenderPerBatch={6}
                        windowSize={10}
                        removeClippedSubviews={true}
                        accessibilityLabel="chat messages"
                      />
                    </KeyboardAvoidingView>

                    {/* input */}
                    <View style={styles.promptContainer}>
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
                        style={[styles.sendButton, isSending ? styles.stopButton : null]}
                        onPress={handleSendPrompt}
                        disabled={promptText.trim().length === 0 && !isSending}
                        accessibilityLabel={isSending ? 'stop generating' : 'send message'}
                      >
                        <FontAwesome5
                          name={isSending ? "stop" : "paper-plane"}
                          size={18}
                          color="white"
                          solid
                        />
                      </Pressable>
                    </View>
                  </BlurView>
                </Animated.View>
              </View>
            )}
          </AnimatePresence>
        </View>
      )}
    </SafeAreaView>
  );
}

// ----------------- Styles -----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerIcon: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentContainer: { padding: 20, paddingBottom: 220 },

  // messages
  messagesList: { flexGrow: 0, maxHeight: 320, minHeight: 80, paddingHorizontal: 10 },
  messagesListContent: { paddingTop: 8, paddingBottom: 8 },

  botMessageWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 6, maxWidth: '85%', alignSelf: 'flex-start' },
  userMessageWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 6, maxWidth: '85%', alignSelf: 'flex-end' },

  // new high-contrast colors
  botBubble: { backgroundColor: '#bac7dcff', borderRadius: 14, borderBottomLeftRadius: 6, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  userBubble: { backgroundColor: '#0EA5A4', borderRadius: 14, borderBottomRightRadius: 6, padding: 12 },

  botTextMarkdown: { body: { color: '#F8FAFC', fontSize: 15, lineHeight: 22 }, strong: { fontWeight: '700', color: '#7EE787' } },
  userTextMarkdown: { body: { color: '#042C2B', fontSize: 15, lineHeight: 22, fontWeight: '600' }, strong: { fontWeight: '700', color: '#052427' } },

  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#94A3B8', marginHorizontal: 4 },

  // overlay + panel
  overlayContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  overlayBackground: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'transparent' },
  chatPanelContainer: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 40, maxHeight: '82%' },

  glassPane: { width: '100%', borderRadius: 20, overflow: 'hidden', borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: Platform.OS === 'android' ? 'rgba(8,10,18,0.88)' : 'transparent', paddingTop: 10, paddingBottom: 10, paddingHorizontal: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 20 },

  dragHandleContainer: { alignItems: 'center', paddingVertical: 8 },
  dragHandle: { width: 46, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },

  promptContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginTop: 10, marginHorizontal: 10 },
  promptInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 10, paddingHorizontal: 14, color: 'white', fontSize: 15 },
  sendButton: { paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#0EA5A4', borderRadius: 12, marginRight: 8, marginLeft: 6 },
  stopButton: { backgroundColor: '#F87171' },
});

const markdownStyles = StyleSheet.create({
  heading1: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', marginBottom: 12, borderBottomWidth: 1, borderColor: '#334155', paddingBottom: 8, textAlign: 'right' },
  body: { color: '#D1D5DB', fontSize: 16, lineHeight: 24, textAlign: 'right' },
  strong: { fontWeight: 'bold', color: '#10B981' },
});
