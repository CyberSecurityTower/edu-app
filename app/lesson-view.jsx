// LessonViewScreen.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
  const textStyles = isBot ? styles.botTextMarkdown : styles.userTextMarkdown;
  const wrapperStyle = isBot ? styles.botMessageWrapper : styles.userMessageWrapper;
  const bubbleStyle = isBot ? styles.botBubble : styles.userBubble;

  return (
    <MotiView
      from={{ opacity: 0, translateY: isBot ? 6 : 0 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 260 }}
      style={wrapperStyle}
    >
      <View style={bubbleStyle}>
        <FastMarkdownText styles={textStyles}>
          {message.text}
        </FastMarkdownText>
      </View>
    </MotiView>
  );
}, (prev, next) => prev.message.id === next.message.id && prev.message.text === next.message.text);

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
  const CHAT_KEY = `mini_chat_${lessonId}_${chatUserId}`;

  const [lessonContent, setLessonContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isChatPanelVisible, setChatPanelVisible] = useState(false);
  const [promptText, setPromptText] = useState('');

  const [messages, setMessages] = useState([]); // newest-first
  const [loadedMessages, setLoadedMessages] = useState([]); // messages loaded from storage (newest-first)
  const [isSending, setIsSending] = useState(false);

  const translateY = useSharedValue(500);
  const context = useSharedValue({ y: 0 });
  const flatListRef = useRef(null);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  // ---------- Storage helpers ----------
  const saveChat = useCallback(async (currentMessages) => {
    try {
      // keep only persistent types, reverse to store oldest-first (for readability)
      const storable = currentMessages.filter(m => m.type !== 'typing' && m.type !== 'intro').reverse();
      // offload to next tick to avoid blocking UI
      setTimeout(async () => {
        try { await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(storable)); } catch (e) { /* ignore */ }
      }, 0);
    } catch (error) {
      console.error('Error saving mini-chat:', error);
    }
  }, [CHAT_KEY]);

  const loadChat = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(CHAT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // store as newest-first in state for faster updates
        setLoadedMessages(parsed.reverse());
      } else {
        setLoadedMessages([]);
      }
    } catch (error) {
      console.error('Error loading mini-chat:', error);
      setLoadedMessages([]);
    }
  }, [CHAT_KEY]);

  // ---------- Cancel generation ----------
  const handleStopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      try { abortControllerRef.current.abort(); } catch (e) {}
      abortControllerRef.current = null;
    }
    setIsSending(false);
    // remove typing indicator
    setMessages(prev => prev.filter(m => m.type !== 'typing'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  // ---------- Process & respond ----------
  const processAndRespond = useCallback(async (userMessage, history) => {
    // prevent concurrent sends
    if (isSending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const typingIndicator = { type: 'typing', id: uuidv4(), author: BOT_USER };
    // put typing + user message at top (newest-first)
    setMessages(prev => [typingIndicator, userMessage, ...prev.filter(m => m.type !== 'typing' && m.type !== 'intro')]);
    setIsSending(true);

    abortControllerRef.current = new AbortController();

    const historyForAPI = history.slice(-5).map(msg => ({
      role: msg.author?.id === BOT_USER.id ? 'model' : 'user',
      text: msg.text || '',
    }));

    const contextSnippet = typeof lessonContent === 'string' ? lessonContent.substring(0, 1500) : 'No content available.';
    const finalUserMessageText = `[CONTEXT: The user is in a lesson about: "${lessonTitle}". Content snippet: ${contextSnippet}...] ${userMessage.text}`;

    try {
      const response = await apiService.getInteractiveChatReply({
        message: finalUserMessageText,
        userId: user?.uid,
        history: historyForAPI,
      }, abortControllerRef.current.signal);

      const botResponse = { type: 'bot', author: BOT_USER, id: uuidv4(), text: response.reply, reactions: {} };

      setMessages(prev => {
        const newMessages = [botResponse, ...prev.filter(m => m.id !== typingIndicator.id)];
        // save in background
        runOnJS(saveChat)(newMessages);
        return newMessages;
      });
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('AI Chat Error:', error);
        const errorMessage = { type: 'bot', id: uuidv4(), author: BOT_USER, text: '⚠️ Network Error: Could not reach EduAI tutor. Please check your connection and try again.' };
        setMessages(prev => [errorMessage, ...prev.filter(m => m.id !== typingIndicator.id)]);
      } else {
        // aborted: just remove typing indicator
        setMessages(prev => prev.filter(m => m.id !== typingIndicator.id));
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  }, [isSending, lessonContent, lessonTitle, saveChat, user?.uid]);

  // ---------- Handle send button ----------
  const handleSendPrompt = useCallback(() => {
    if (isSending) {
      handleStopGenerating();
      return;
    }
    const trimmed = promptText.trim();
    if (trimmed.length === 0) return;

    setPromptText('');
    Keyboard.dismiss();

    const userMessage = { type: 'user', author: chatUser, id: uuidv4(), text: trimmed, reactions: {} };
    const currentMessages = messages.filter(m => m.type !== 'typing').reverse(); // oldest-first for history
    processAndRespond(userMessage, currentMessages);
  }, [promptText, isSending, chatUser, messages, processAndRespond, handleStopGenerating]);

  // ---------- Initial lesson + load chat ----------
  useEffect(() => {
    mountedRef.current = true;
    const loadLessonData = async () => {
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
      } catch (error) {
        console.error('Failed to load lesson:', error);
        Alert.alert('Error', 'Could not load lesson content or progress.');
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    };
    loadLessonData();
    return () => { mountedRef.current = false; };
  }, [lessonId, user?.uid, subjectId, pathId, totalLessons, loadChat]);

  // ---------- Show/hide chat panel ----------
  useEffect(() => {
  if (isChatPanelVisible) {
    // نستخدم النسخة الوظيفية: نتحقق من الحالة السابقة داخلياً دون إضافة messages كتبعّي
    setMessages(prev => (prev.length === 0 ? loadedMessages : prev));
    translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
  } else {
    translateY.value = withSpring(500, { damping: 18, stiffness: 120 });
    // نحفظ المحادثة الحالية إن وجدت
    runOnJS(saveChat)(/* نرغب بحفظ أحدث الرسائل إذا كانت موجودة */);
    runOnJS(Keyboard.dismiss)();
    handleStopGenerating();
  }
  // ملاحظة: لا تُدرج `messages` هنا — هذا يمنع الحلقة.
}, [isChatPanelVisible, loadedMessages, translateY, saveChat, handleStopGenerating]);


  // ---------- Gesture & animated style ----------
  const gesture = Gesture.Pan()
    .onStart(() => { context.value = { y: translateY.value }; })
    .onUpdate((ev) => { translateY.value = Math.max(0, context.value.y + ev.translationY); })
    .onEnd(() => {
      if (translateY.value > 140) {
        runOnJS(setChatPanelVisible)(false);
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
      }
    });

  const animatedPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // ---------- Intro & final messages ----------
  const introMessage = useMemo(() => ({
    type: 'bot',
    id: 'intro',
    text: `Hello! I'm FAB, your AI tutor. Ask me anything about "${lessonTitle || 'this lesson'}"`,
    author: BOT_USER,
  }), [lessonTitle]);

  const finalMessages = useMemo(() => (messages.length === 0 ? [introMessage] : messages), [messages, introMessage]);

  const renderMessageItem = useCallback(({ item }) => {
    if (!item) return null;
    if (item.type === 'typing') return <TypingIndicator />;
    return <MessageItem message={item} />;
  }, []);

  // ---------- auto-scroll to top (newest) when messages change ----------
  useEffect(() => {
    if (!flatListRef.current) return;
    try {
      // small delay to let list layout
      setTimeout(() => {
        flatListRef.current?.scrollToOffset?.({ offset: 0, animated: true });
      }, 80);
    } catch (e) { /* ignore */ }
  }, [finalMessages.length]);

  // ---------- UI ----------
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
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
              <Pressable style={styles.overlay} onPress={() => setChatPanelVisible(false)}>
                <GestureDetector gesture={gesture}>
                  <Animated.View style={[styles.chatPanelContainer, animatedPanelStyle]}>
                    <Pressable onPress={() => {}} style={{ width: '100%' }}>
                      <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="dark" style={styles.glassPane}>
                        <View style={styles.dragHandleContainer}>
                          <View style={styles.dragHandle} />
                        </View>

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
                        />

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
                          />
                          <Pressable
                            style={styles.sendButton}
                            onPress={handleSendPrompt}
                            disabled={promptText.trim().length === 0 && !isSending}
                          >
                            <FontAwesome5
                              name={isSending ? "stop" : "paper-plane"}
                              size={20}
                              color={isSending ? "#F87171" : "white"}
                              solid
                            />
                          </Pressable>
                        </View>

                      </BlurView>
                    </Pressable>
                  </Animated.View>
                </GestureDetector>
              </Pressable>
            )}
          </AnimatePresence>
        </View>
      )}
    </SafeAreaView>
  );
}

// ----------------- Styles -----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerIcon: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentContainer: { padding: 20, paddingBottom: 220 },

  messagesList: { flexGrow: 0, maxHeight: 220, minHeight: 40, paddingHorizontal: 10 },
  messagesListContent: { paddingTop: 5, paddingBottom: 5 },

  botMessageWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 4, maxWidth: '85%', alignSelf: 'flex-start' },
  userMessageWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 4, maxWidth: '85%', alignSelf: 'flex-end' },
  botBubble: { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 12, borderBottomLeftRadius: 4, padding: 10 },
  userBubble: { backgroundColor: '#3B82F6', borderRadius: 12, borderBottomRightRadius: 4, padding: 10 },

  botTextMarkdown: { body: { color: 'white', fontSize: 14 }, strong: { fontWeight: 'bold', color: '#34D399' } },
  userTextMarkdown: { body: { color: 'white', fontSize: 14, fontWeight: '500' }, strong: { fontWeight: 'bold', color: '#E5E7EB' } },

  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9CA3AF', marginHorizontal: 3 },

  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'transparent' },
  chatPanelContainer: { width: '100%', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 120, maxHeight: '80%' },
  glassPane: { width: '100%', borderRadius: 25, overflow: 'hidden', borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: Platform.OS === 'android' ? 'rgba(30,41,59,0.75)' : 'transparent', paddingTop: 15, paddingBottom: 15, paddingHorizontal: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 18 },
  dragHandleContainer: { alignItems: 'center', paddingVertical: 8 },
  dragHandle: { width: 40, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255, 255, 255, 0.25)' },

  promptContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginTop: 10, marginHorizontal: 10 },
  promptInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 10, paddingHorizontal: 16, color: 'white', fontSize: 15 },
  sendButton: { padding: 14, backgroundColor: '#3B82F6', borderRadius: 12, marginRight: 5, marginLeft: 5 },
});

const markdownStyles = StyleSheet.create({
  heading1: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginBottom: 15, borderBottomWidth: 1, borderColor: '#334155', paddingBottom: 10, textAlign: 'right' },
  body: { color: '#D1D5DB', fontSize: 17, lineHeight: 28, textAlign: 'right' },
  strong: { fontWeight: 'bold', color: '#10B981' },
});
