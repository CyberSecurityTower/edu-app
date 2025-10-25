// app/ai-chatbot.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { Chat, defaultTheme } from '@flyerhq/react-native-chat-ui';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

import { apiService } from '../config/api';
import { STORAGE_KEYS } from '../config/appConfig';
import { useAppState } from '../context/AppStateContext';

const BOT_USER = { id: 'bot-eduai', firstName: 'EduAI', imageUrl: '' };

// ✨ [NEW] A more advanced component for rendering bot messages
const BotMessage = ({ message }) => {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(message.text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({
      type: 'eduai_notification',
      text1: 'Copied to clipboard!',
      position: 'bottom',
      visibilityTime: 1500,
    });
  };

  return (
    <View style={styles.botMessageWrapper}>
      <Image source={{ uri: BOT_USER.imageUrl }} style={styles.botAvatar} />
      <View style={styles.botBubble}>
        <View style={styles.botHeader}>
          <Text style={styles.botName}>{BOT_USER.firstName}</Text>
          <Pressable onPress={handleCopy} style={styles.actionButton}>
            <FontAwesome5 name="copy" size={16} color="#9CA3AF" />
          </Pressable>
        </View>
        <Markdown style={markdownStyles}>{message.text || '...'}</Markdown>
      </View>
    </View>
  );
};


const AiChatbotScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAppState();

  const chatUser = { id: user?.uid || 'guest-user' };

  const [messages, setMessages] = useState([]);
  const [chatTitle, setChatTitle] = useState('New Chat');
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const initialContext = {
    lessonId: params.contextLessonId || null,
    lessonTitle: params.contextLessonTitle || null,
  };

  useEffect(() => {
    const loadChat = async () => {
      const existingSessionId = params.sessionId ? String(params.sessionId) : null;
      setSessionId(existingSessionId);

      if (existingSessionId) {
        try {
          const allSessionsRaw = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
          const allSessions = allSessionsRaw ? JSON.parse(allSessionsRaw) : {};
          const stored = allSessions[existingSessionId] || {};
          
          setChatTitle(stored.title || 'Chat');
          const storedMessages = (stored.messages || []).map(msg => ({ ...msg, createdAt: new Date(msg.createdAt).getTime() }));
          setMessages(storedMessages);
        } catch (e) { console.error('Failed to load chat.', e); }
      } else {
        setChatTitle(initialContext.lessonTitle || 'New Chat');
        setMessages([]);
      }
      setIsLoading(false);
    };
    loadChat();
  }, [params.sessionId, initialContext.lessonTitle]);

  const saveChat = useCallback(async (sid, newMessages, newTitle) => {
    if (!sid) return;
    try {
      const allSessionsRaw = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
      let allSessions = allSessionsRaw ? JSON.parse(allSessionsRaw) : {};
      allSessions[sid] = {
        messages: newMessages,
        title: newTitle,
        isPinned: allSessions[sid]?.isPinned || false,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(allSessions));
    } catch (e) { console.error('Failed to save chat.', e); }
  }, []);

  const onSendPress = useCallback(async (partialMessage) => {
    if (isSending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSending(true);

    const userMessage = { author: chatUser, createdAt: Date.now(), id: uuidv4(), text: partialMessage.text, type: 'text' };
    const botMessagePlaceholder = { author: BOT_USER, createdAt: Date.now() + 1, id: uuidv4(), text: '', type: 'text' };
    
    let updatedMessages = [botMessagePlaceholder, userMessage, ...messages];
    setMessages(updatedMessages);

    let currentSessionId = sessionId;
    let currentTitle = chatTitle;
    const isNewChat = !currentSessionId;

    if (isNewChat) {
      currentSessionId = `chat_${Date.now()}`;
      setSessionId(currentSessionId);
      try {
        const { title } = await apiService.generateTitle(userMessage.text);
        if (title) { currentTitle = title; setChatTitle(title); }
      } catch (error) {
        console.error('Title generation failed:', error);
        currentTitle = userMessage.text.substring(0, 40);
        setChatTitle(currentTitle);
      }
    }

    const history = messages.slice(0, 5).map(msg => ({
      role: msg.author.id === BOT_USER.id ? 'model' : 'user',
      text: msg.text,
    })).reverse();

    try {
      const response = await apiService.startChatStream({
        message: userMessage.text, userId: user?.uid, history,
        lessonId: isNewChat ? initialContext.lessonId : null,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        streamedText += decoder.decode(value, { stream: true });
        setMessages(prev => prev.map(m => m.id === botMessagePlaceholder.id ? { ...m, text: streamedText } : m));
      }
      
      const finalBotMessage = { ...botMessagePlaceholder, text: streamedText };
      const finalMessages = [finalBotMessage, userMessage, ...messages];
      await saveChat(currentSessionId, finalMessages, currentTitle);

    } catch (error) {
      console.error('Error fetching from server:', error);
      const errorMessage = { ...botMessagePlaceholder, text: "Sorry, I'm having trouble connecting. Please try again." };
      setMessages(prev => prev.map(m => m.id === botMessagePlaceholder.id ? errorMessage : m));
    } finally {
      setIsSending(false);
    }
  }, [isSending, messages, sessionId, chatTitle, user, saveChat, initialContext.lessonId, chatUser]);

  const renderMessage = ({ message }) => {
    if (message.author.id === BOT_USER.id) {
      return <BotMessage message={message} />;
    }
    // Let the default renderer handle user messages
    return null;
  };

  if (isLoading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#10B981" style={{ flex: 1 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/chat-history')} style={styles.headerButton}><FontAwesome5 name="bars" size={22} color="white" /></Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{chatTitle}</Text>
        <Pressable onPress={() => router.back()} style={styles.headerButton}><FontAwesome5 name="times" size={22} color="white" /></Pressable>
      </View>

      <Chat
        messages={messages}
        onSendPress={onSendPress}
        user={chatUser}
        theme={{
          ...defaultTheme,
          colors: { ...defaultTheme.colors, background: '#0C0F27', inputBackground: '#1E293B', primary: '#3B82F6', secondary: '#334155', text: 'white', primaryText: 'white', secondaryText: '#a7adb8ff' },
          fonts: { ...defaultTheme.fonts, inputTextStyle: { ...defaultTheme.fonts.inputTextStyle, color: 'white' } },
        }}
        renderMessage={renderMessage}
        sendButtonVisibilityMode="always"
        isTyping={isSending}
        typingIndicatorOptions={{
            typingIndicatorContainerStyle: {
                marginLeft: 12,
            }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerTitle: { flex: 1, textAlign: 'center', color: 'white', fontSize: 18, fontWeight: '600', paddingHorizontal: 10 },
  headerButton: { padding: 10 },
  // ✨ [NEW] Styles for the enhanced bot message
  botMessageWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, marginLeft: 8, maxWidth: '90%' },
  botAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8, marginTop: 5 },
  botBubble: { backgroundColor: '#1E293B', borderRadius: 12, borderTopLeftRadius: 0, padding: 12, flex: 1 },
  botHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  botName: { color: '#9CA3AF', fontWeight: 'bold' },
  actionButton: { padding: 4 },
});

const markdownStyles = StyleSheet.create({
  body: { color: 'white', fontSize: 16, lineHeight: 24 },
  strong: { fontWeight: 'bold', color: '#34D399' },
  list_item: { marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start' },
  bullet_list_icon: { color: '#34D399', marginRight: 8, fontSize: 16, lineHeight: 24 },
  code_block: { backgroundColor: '#0F172A', color: '#E5E7EB', padding: 12, borderRadius: 8, fontFamily: 'monospace' },
});

export default AiChatbotScreen;
