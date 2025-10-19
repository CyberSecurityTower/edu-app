// app/(modal)/ai-chatbot.jsx

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Bubble, Composer, GiftedChat, InputToolbar, Send, MessageText } from 'react-native-gifted-chat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';

import { useAppState } from '../../context/AppStateContext';

const SESSIONS_KEY = '@chat_sessions_v2';
const RENDER_PROXY_URL = 'https://eduserver-1.onrender.com';

export default function AiChatbotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAppState();

  const [messages, setMessages] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sessionId = useRef(params.sessionId || null);

  // --- THE FIX: We consolidate the initial lesson ID into one stable ref ---
  // If we open the chat from a lesson link, this ref will hold the ID until the first message is sent.
  const initialLessonIdRef = useRef(params.contextLessonId || null);

  // Chat title: prefer contextLessonTitle, then title param, then fallback
  const [chatTitle, setChatTitle] = useState(params.contextLessonTitle || params.title || 'New Chat');

  const [isRenameModalVisible, setRenameModalVisible] = useState(false);
  const [renameText, setRenameText] = useState('');

  const BOT = { _id: 2, name: 'EduAI', avatar: require('../../assets/images/owl.png') };

  // Load stored session
  useEffect(() => {
    const loadChat = async () => {
      setIsLoading(true);
      if (params.sessionId) {
        sessionId.current = params.sessionId;
      }

      if (sessionId.current) {
        try {
          const allSessionsRaw = await AsyncStorage.getItem(SESSIONS_KEY);
          const allSessions = allSessionsRaw ? JSON.parse(allSessionsRaw) : {};
          const storedMessages = allSessions[sessionId.current]?.messages || [];
          setMessages(storedMessages.map(msg => ({ ...msg, createdAt: new Date(msg.createdAt) })));
        } catch (e) {
          console.error('Failed to load chat.', e);
        }
      }
      setIsLoading(false);
    };
    loadChat();
  }, [params.sessionId]);

  // Save chat on update
  useEffect(() => {
    const saveChat = async () => {
      if (isLoading || !sessionId.current) return;

      try {
        const allSessionsRaw = await AsyncStorage.getItem(SESSIONS_KEY);
        let allSessions = allSessionsRaw ? JSON.parse(allSessionsRaw) : {};

        allSessions[sessionId.current] = {
          messages: messages,
          title: chatTitle,
          isPinned: allSessions[sessionId.current]?.isPinned || false,
        };
        await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(allSessions));
      } catch (e) {
        console.error('Failed to save chat.', e);
      }
    };
    saveChat();
  }, [messages, chatTitle, isLoading]);

  // onSend — main message handler
  const onSend = useCallback(async (newMessages = []) => {
    const isNewChat = messages.length === 0;

    if (!sessionId.current) {
      sessionId.current = `chat_${Date.now()}`;
    }

    setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));
    setIsBotTyping(true);

    const userMessage = newMessages[0]?.text || '';

    // Auto-generate a chat title for brand new chats
    if (isNewChat) {
      try {
        const titleResponse = await fetch(`${RENDER_PROXY_URL}/generate-title`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage, language: 'Arabic' }),
        });
        if (titleResponse.ok) {
          const data = await titleResponse.json();
          if (data?.title) setChatTitle(data.title);
        } else {
          throw new Error('Failed to generate title');
        }
      } catch (error) {
        console.error('Title generation failed:', error);
        setChatTitle(userMessage.substring(0, 40) || 'New Chat');
      }
    }

    const currentHistory = messages.slice(-5).map(msg => ({
      role: msg.user._id === BOT._id ? 'model' : 'user',
      text: msg.text,
    })).reverse();

    try {
      // --- THE FIX: Get lessonId from initialLessonIdRef ONLY if it's the first message ---
      const lessonIdForServer = isNewChat ? initialLessonIdRef.current : null;

      const requestBody = {
        message: userMessage,
        userId: user?.uid,
        history: currentHistory,
        lessonId: lessonIdForServer, // This is now correctly sent only once
      };

      const chatResponse = await fetch(`${RENDER_PROXY_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      // --- FIX: Clear the ref after the first send, ensuring it's never sent again ---
      if (isNewChat && initialLessonIdRef.current) {
         initialLessonIdRef.current = null;
      }

      if (!chatResponse.ok) throw new Error('Server error');

      const data = await chatResponse.json();
      if (data?.reply) {
        const botMessage = {
          _id: Math.random().toString(36).substring(7),
          text: data.reply,
          createdAt: new Date(),
          user: BOT,
        };
        setMessages(previousMessages => GiftedChat.append(previousMessages, [botMessage]));
      }
    } catch (error) {
      console.error('Error fetching from proxy:', error);
      const errorMessage = {
        _id: Math.random().toString(36).substring(7),
        text: "Sorry, I'm having trouble connecting.",
        createdAt: new Date(),
        user: BOT,
      };
      setMessages(previousMessages => GiftedChat.append(previousMessages, [errorMessage]));
    } finally {
      setIsBotTyping(false);
    }
  }, [messages, user]);

  const handleRenamePress = () => {
    if (!sessionId.current) return;
    setRenameText(chatTitle);
    setRenameModalVisible(true);
  };

  const handleSaveRename = () => {
    if (renameText && renameText.trim() !== '') {
      setChatTitle(renameText.trim());
    }
    setRenameModalVisible(false);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Image source={require('../../assets/images/owl.png')} style={styles.emptyAvatar} />
      <Text style={styles.emptyTitle}>What's on your mind today?</Text>
    </View>
  );

  const renderMessageText = (props) => {
    const { currentMessage } = props;
    // Render Markdown for BOT messages
    if (currentMessage?.user?._id === BOT._id) {
      return (
        <View style={styles.markdownContainer}>
          <Markdown style={markdownStyles}>{currentMessage.text}</Markdown>
        </View>
      );
    }
    // Fallback for user messages
    return <MessageText {...props} textStyle={{ color: 'white' }} />;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#10B981" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/(modal)/chat-history')} style={styles.headerButton}>
          <FontAwesome5 name="bars" size={22} color="white" />
        </Pressable>

        <Pressable onPress={handleRenamePress} style={styles.titleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{chatTitle}</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <FontAwesome5 name="times" size={22} color="white" />
        </Pressable>
      </View>

      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={{ _id: user?.uid || 1 }}
        isTyping={isBotTyping}
        renderBubble={(props) => <Bubble {...props} wrapperStyle={{ right: styles.userBubble, left: styles.botBubble }} />}
        renderMessageText={renderMessageText}
        renderInputToolbar={(props) => <InputToolbar {...props} containerStyle={styles.inputToolbar} />}
        renderComposer={(props) => <Composer {...props} textInputStyle={styles.composer} />}
        renderSend={(props) => (
          <Send {...props} containerStyle={styles.sendContainer}>
            <FontAwesome5 name="paper-plane" size={22} color="#10B981" solid />
          </Send>
        )}
        renderChatEmpty={renderEmpty}
        placeholder="Ask EduAI..."
        messagesContainerStyle={{ paddingBottom: 10 }}
        bottomOffset={0}
      />

      {Platform.OS === 'ios' && <KeyboardAvoidingView behavior="padding" />}

      <Modal
        animationType="fade"
        transparent
        visible={isRenameModalVisible}
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRenameModalVisible(false)}>
          <Pressable style={styles.modalContainer} onPress={() => {}}>
            <Text style={styles.modalTitle}>Rename Chat</Text>
            <TextInput
              style={styles.modalInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Enter new name"
              placeholderTextColor="#8A94A4"
              autoFocus
            />
            <View style={styles.modalButtonContainer}>
              <Pressable style={styles.modalButton} onPress={() => setRenameModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: '#10B981', borderRadius: 8, paddingHorizontal: 15 }]}
                onPress={handleSaveRename}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  titleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '600', paddingHorizontal: 10 },
  headerButton: { padding: 10 },
  inputToolbar: { backgroundColor: '#0C0F27', borderTopColor: '#1E293B', paddingVertical: 8, paddingHorizontal: 10 },
  composer: { backgroundColor: '#1E293B', borderRadius: 25, paddingHorizontal: 15, paddingTop: Platform.OS === 'ios' ? 12 : 8, paddingBottom: Platform.OS === 'ios' ? 12 : 8, color: 'white', fontSize: 16, lineHeight: 20 },
  sendContainer: { justifyContent: 'center', alignItems: 'center', height: 44, width: 44, marginLeft: 5 },
  userBubble: { backgroundColor: '#3B82F6' },
  botBubble: { backgroundColor: '#334155' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: '20%', transform: [{ scaleY: -1 }] },
  emptyAvatar: { width: 80, height: 80, marginBottom: 20 },
  emptyTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', backgroundColor: '#1E293B', borderRadius: 12, padding: 20 },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 15 },
  modalInput: { backgroundColor: '#334155', color: 'white', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { padding: 10 },
  modalButtonText: { color: '#a7adb8ff', fontSize: 16, fontWeight: '600' },
  markdownContainer: { paddingHorizontal: 10, paddingVertical: 5 },
});

const markdownStyles = StyleSheet.create({
  body: { color: 'white', fontSize: 16, lineHeight: 24 },
  strong: { fontWeight: 'bold', color: '#34D399' },
  em: { fontStyle: 'italic' },
  list_item: { marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start' },
  bullet_list_icon: { color: '#34D399', marginRight: 8, fontSize: 16, lineHeight: 24 },
});