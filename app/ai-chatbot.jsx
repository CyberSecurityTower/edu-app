// app/ai-chatbot.jsx
import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { MotiView } from 'moti';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { apiService } from '../config/api';
import { STORAGE_KEYS } from '../config/appConfig';
import { useAppState } from '../context/AppStateContext';
import { useActionSheet } from '../context/ActionSheetContext';
import CustomInput from '../components/CustomInput';

const BOT_USER = { 
  id: 'bot-eduai', 
  firstName: 'EduAI', 
  avatarUrl: `https://ui-avatars.com/api/?name=EA&background=3B82F6&color=FFFFFF&bold=true` 
};

// الحصول على أبعاد الشاشة للتصميم المتجاوب
const { width, height } = Dimensions.get('window');

// --- المكونات الفرعية ---

const MessageRenderer = React.memo(({ message, onLongPress }) => {
  const isBot = message.author.id === BOT_USER.id;
  
  return (
    <Pressable 
      onLongPress={() => onLongPress(message)}
      accessibilityRole="button"
      accessibilityLabel={`${isBot ? 'Bot' : 'Your'} message: ${message.text.substring(0, 50)}...`}
      accessibilityHint="Long press to see options"
    >
      <View style={isBot ? styles.botMessageWrapper : styles.userMessageWrapper}>
        {isBot && <Image source={{ uri: BOT_USER.avatarUrl }} style={styles.botAvatar} />}
        <View style={isBot ? styles.botBubble : styles.userBubble}>
          <Markdown 
            style={isBot ? markdownStyles : { ...markdownStyles, body: { ...markdownStyles.body, color: 'white' } }}
            mergeStyle={true}
          >
            {message.text || '...'}
          </Markdown>
        </View>
      </View>
    </Pressable>
  );
});

const ErrorMessage = React.memo(({ message, onRetry }) => (
  <View style={styles.errorMessageWrapper}>
    <FontAwesome5 name="exclamation-triangle" size={18} color="#F87171" />
    <View style={{ flex: 1, marginHorizontal: 12 }}>
      <Text style={styles.errorTitle}>An Error Occurred</Text>
      <Text style={styles.errorMessageText}>{message.text}</Text>
    </View>
    {message.canRetry && (
      <Pressable 
        onPress={() => onRetry(message.retryPayload)} 
        style={styles.retryButton}
        accessibilityRole="button"
        accessibilityLabel="Retry sending message"
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    )}
  </View>
));

const IntroMessage = React.memo(({ onSuggestionPress }) => (
  <View>
    <MessageRenderer 
      message={{ 
        type: 'bot', 
        author: BOT_USER, 
        id: 'intro-msg-bubble', 
        text: "Hello! I'm EduAI, your personal learning assistant. How can I help you today?" 
      }} 
      onLongPress={() => {}} 
    />
    <View style={styles.suggestionContainer}>
      {["Summarize my last lesson", "Create a short quiz for me", "Analyze my performance"].map(text => (
        <Pressable 
          key={text} 
          style={styles.suggestionChip} 
          onPress={() => onSuggestionPress(text)}
          accessibilityRole="button"
          accessibilityLabel={`Suggestion: ${text}`}
        >
          <Text style={styles.suggestionText}>{text}</Text>
        </Pressable>
      ))}
    </View>
  </View>
));

const TypingIndicator = React.memo(() => (
  <MotiView 
    from={{ opacity: 0 }} 
    animate={{ opacity: 1 }} 
    transition={{ type: 'timing' }}
    style={styles.botMessageWrapper}
  >
    <Image source={{ uri: BOT_USER.avatarUrl }} style={styles.botAvatar} />
    <View style={[styles.botBubble, { paddingVertical: 14, flexDirection: 'row' }]}>
      <MotiView 
        from={{ scale: 0.5 }} 
        animate={{ scale: 1 }} 
        transition={{ type: 'timing', duration: 300, loop: true }} 
        style={styles.typingDot} 
      />
      <MotiView 
        from={{ scale: 0.5 }} 
        animate={{ scale: 1 }} 
        transition={{ type: 'timing', duration: 300, delay: 100, loop: true }} 
        style={styles.typingDot} 
      />
      <MotiView 
        from={{ scale: 0.5 }} 
        animate={{ scale: 1 }} 
        transition={{ type: 'timing', duration: 300, delay: 200, loop: true }} 
        style={styles.typingDot} 
      />
    </View>
  </MotiView>
));

// --- المكون الرئيسي للشاشة ---

export default function AiChatbotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAppState();
  const { openSheet, closeSheet } = useActionSheet();
  const chatUser = { id: user?.uid || 'guest-user' };

  const [messages, setMessages] = useState([]);
  const [chatTitle, setChatTitle] = useState('New Chat');
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  const abortControllerRef = useRef(null);
  const chatListRef = useRef(null);
  const simulationIntervalRef = useRef(null);
  const flatListRef = useRef(null);

  // تحسين حفظ المحادثة مع معالجة الأخطاء
  const saveChat = useCallback(async (sid, newMessages, newTitle) => {
    if (!sid) return;
    
    try {
      const allSessionsRaw = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
      const allSessions = allSessionsRaw ? JSON.parse(allSessionsRaw) : {};
      allSessions[sid] = {
        title: newTitle,
        messages: newMessages,
        isPinned: allSessions[sid]?.isPinned || false,
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(allSessions));
    } catch (error) {
      console.error('Error saving chat:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save chat history'
      });
    }
  }, []);

  useEffect(() => {
    const loadChat = async () => {
      try {
        const sid = params.sessionId ? String(params.sessionId) : null;
        setSessionId(sid);
        
        if (sid) {
          const allSessionsRaw = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
          const allSessions = allSessionsRaw ? JSON.parse(allSessionsRaw) : {};
          const stored = allSessions[sid] || {};
          setChatTitle(stored.title || 'Chat');
          setMessages(stored.messages || []);
        } else {
          setChatTitle(params.contextLessonTitle || 'New Chat');
          setMessages([{ type: 'intro', id: 'intro-msg' }]);
        }
      } catch (error) {
        console.error('Error loading chat:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load chat history'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadChat();
    
    return () => {
      abortControllerRef.current?.abort();
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, [params.sessionId]);

  // تحسين محاكاة البث مع إمكانية الإلغاء
  const startStreamingSimulation = useCallback((fullText, messageId) => {
    let currentText = '';
    let index = 0;
    
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
    
    setIsTyping(true);
    
    simulationIntervalRef.current = setInterval(() => {
      if (index < fullText.length) {
        currentText += fullText[index];
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, text: currentText } : m
        ));
        index++;
      } else {
        clearInterval(simulationIntervalRef.current);
        setIsTyping(false);
        // حفظ نهائي بعد اكتمال المحاكاة
        saveChat(sessionId, messages, chatTitle);
      }
    }, 20); // تعديل سرعة المحاكاة هنا
  }, [sessionId, messages, chatTitle, saveChat]);

  // تحسين معالجة الردود
  const processAndRespond = useCallback(async (userMessage, currentMessages, insertionIndex = -1) => {
    setIsSending(true);
    abortControllerRef.current = new AbortController();

    const typingIndicator = { type: 'typing', id: uuidv4() };
    let updatedMessages = [typingIndicator, userMessage, ...currentMessages];
    
    if (insertionIndex !== -1) {
      updatedMessages = [...currentMessages];
      updatedMessages.splice(insertionIndex, 0, userMessage, typingIndicator);
    }
    
    setMessages(updatedMessages);

    let currentSessionId = sessionId;
    let currentTitle = chatTitle;

    if (!currentSessionId) {
      currentSessionId = `chat_${Date.now()}`;
      setSessionId(currentSessionId);
      
      try {
        const { title } = await apiService.generateTitle(userMessage.text);
        currentTitle = title;
        setChatTitle(title);
      } catch (e) {
        currentTitle = userMessage.text.substring(0, 30);
        setChatTitle(currentTitle);
      }
    }

    const history = currentMessages
      .filter(m => m.type === 'user' || m.type === 'bot')
      .slice(0, 5)
      .map(msg => ({
        role: msg.author.id === BOT_USER.id ? 'model' : 'user', 
        text: msg.text,
      }))
      .reverse();

    try {
      const response = await apiService.getInteractiveChatReply({
        message: userMessage.text, 
        userId: user?.uid, 
        history,
      }, abortControllerRef.current.signal);

      const fullBotText = response.reply;
      const botResponse = { 
        type: 'bot', 
        author: BOT_USER, 
        id: uuidv4(), 
        text: '', 
        reactions: {} 
      };

      // استبدال مؤشر الكتابة برسالة البوت النهائية
      setMessages(prev => {
        const newMessages = prev.filter(m => m.id !== typingIndicator.id);
        const finalInsertionIndex = newMessages.findIndex(m => m.id === userMessage.id);
        newMessages.splice(finalInsertionIndex, 0, botResponse);
        return newMessages;
      });

      startStreamingSimulation(fullBotText, botResponse.id);

    } catch (error) {
      console.error('Chat API error:', error);
      if (error.name !== 'AbortError') {
        const errorMsg = {
          type: 'error', 
          id: uuidv4(), 
          text: error.message || "Failed to connect.",
          canRetry: true, 
          retryPayload: { userMessage, currentMessages, insertionIndex }
        };
        setMessages(prev => prev.map(m => m.id === typingIndicator.id ? errorMsg : m));
      } else {
        // إذا تم إلغاء الطلب، قم فقط بإزالة مؤشر الكتابة
        setMessages(prev => prev.filter(m => m.id !== typingIndicator.id));
      }
    } finally {
      setIsSending(false);
    }
  }, [sessionId, chatTitle, user?.uid, startStreamingSimulation]);

  // تحسين معالجة الإرسال
  const onSendPress = useCallback((text) => {
    if (isSending || !text.trim()) return;

    if (editingMessage) {
      const editIndex = messages.findIndex(m => m.id === editingMessage.id);
      if (editIndex > -1) {
        // تحديث رسالة المستخدم
        const updatedUserMessage = { ...messages[editIndex], text };
        // إزالة جميع الرسائل اللاحقة لإعادة إنشاء التدفق
        const historyForRegen = messages.slice(editIndex + 1);
        
        setMessages(prev => prev.map(m => m.id === editingMessage.id ? updatedUserMessage : m).slice(0, editIndex + 1));
        
        processAndRespond(updatedUserMessage, historyForRegen, editIndex);
      }
      setEditingMessage(null);
    } else {
      const userMessage = {
        type: 'user', 
        author: chatUser, 
        id: uuidv4(), 
        text,
        replyToId: replyingTo ? replyingTo.id : null,
      };
      const currentMessages = messages.filter(m => m.type !== 'intro' && m.type !== 'typing');
      setReplyingTo(null);
      processAndRespond(userMessage, currentMessages);
    }
  }, [isSending, editingMessage, messages, replyingTo, chatUser, processAndRespond]);

  const handleRetry = useCallback((payload) => {
    setMessages(prev => prev.filter(m => m.type !== 'error'));
    processAndRespond(payload.userMessage, payload.currentMessages, payload.insertionIndex);
  }, [processAndRespond]);

  const handleLongPressMessage = useCallback((message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isUserMessage = message.author.id === chatUser.id;

    const MessageActions = () => (
      <View style={styles.actionSheetContainer}>
        <Pressable 
          style={styles.actionSheetItem} 
          onPress={() => { 
            Clipboard.setStringAsync(message.text); 
            Toast.show({ type: 'success', text1: 'Copied to clipboard' }); 
            closeSheet(); 
          }}
          accessibilityRole="button"
          accessibilityLabel="Copy message text"
        >
          <FontAwesome5 name="copy" size={20} color="#a7adb8ff" style={styles.actionSheetIcon} />
          <Text style={styles.actionSheetText}>Copy Text</Text>
        </Pressable>
        {isUserMessage && (
          <Pressable 
            style={styles.actionSheetItem} 
            onPress={() => { 
              setEditingMessage(message); 
              closeSheet(); 
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit message"
          >
            <FontAwesome5 name="pen" size={20} color="#a7adb8ff" style={styles.actionSheetIcon} />
            <Text style={styles.actionSheetText}>Edit Message</Text>
          </Pressable>
        )}
        <Pressable 
          style={styles.actionSheetItem} 
          onPress={() => { 
            setReplyingTo(message); 
            closeSheet(); 
          }}
          accessibilityRole="button"
          accessibilityLabel="Reply to message"
        >
          <FontAwesome5 name="reply" size={20} color="#a7adb8ff" style={styles.actionSheetIcon} />
          <Text style={styles.actionSheetText}>Reply</Text>
        </Pressable>
      </View>
    );
    openSheet(<MessageActions />);
  }, [chatUser.id, closeSheet, openSheet]);

  const handleStopGenerating = useCallback(() => {
    abortControllerRef.current?.abort();
    if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    setIsSending(false);
    setIsTyping(false);
  }, []);

  // تحسين عرض العناصر مع useMemo
  const renderItem = useCallback(({ item, index }) => (
    <MotiView 
      from={{ opacity: 0, transform: [{ translateY: 20 }] }} 
      animate={{ opacity: 1, transform: [{ translateY: 0 }] }} 
      transition={{ type: 'timing', duration: 400 }}
      delay={index * 50} // تأخير بسيط لكل عنصر لتحسين التأثير البصري
    >
      {
        {
          'bot': <MessageRenderer message={item} onLongPress={handleLongPressMessage} />,
          'user': <MessageRenderer message={item} onLongPress={handleLongPressMessage} />,
          'error': <ErrorMessage message={item} onRetry={handleRetry} />,
          'intro': <IntroMessage onSuggestionPress={onSendPress} />,
          'typing': <TypingIndicator />,
        }[item.type]
      }
    </MotiView>
  ), [handleLongPressMessage, handleRetry, onSendPress]);

  // تحسين قائمة الرسائل
  const memoizedMessages = useMemo(() => {
    // عكس الترتيب للعرض من الأسفل إلى الأعلى
    return [...messages].reverse();
  }, [messages]);

  // التمرير التلقائي إلى الرسالة الجديدة
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, [messages, isLoading]);

  if (isLoading) return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color="#10B981" />
    </SafeAreaView>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <Pressable style={{ flex: 1 }} onPress={closeSheet}>
          <View style={styles.header}>
            <Pressable 
              onPress={() => router.push('/chat-history')} 
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Open chat history"
            >
              <FontAwesome5 name="bars" size={22} color="white" />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>{chatTitle}</Text>
            <Pressable 
              onPress={() => router.back()} 
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <FontAwesome5 name="times" size={22} color="white" />
            </Pressable>
          </View>

          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={{ flex: 1 }} 
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          >
            <FlatList
              ref={flatListRef}
              data={memoizedMessages}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              // إزالة الخاصية المعكوسة واستخدام البيانات المعكوسة بدلاً منها
              onContentSizeChange={() => {
                if (!isTyping) {
                  flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
                }
              }}
              // تحسين الأداء مع القوائم الطويلة
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={10}
              windowSize={10}
              getItemLayout={(data, index) => ({
                length: 100, // تقدير ارتفاع العنصر
                offset: 100 * index,
                index,
              })}
            />
            
            <CustomInput
              onSend={onSendPress}
              isEditing={!!editingMessage}
              onCancelEdit={() => setEditingMessage(null)}
              initialValue={editingMessage?.text || ''}
              isSending={isSending}
              onStop={handleStopGenerating}
              replyTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          </KeyboardAvoidingView>
        </Pressable>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// --- الأنماط ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0C0F27' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1E293B' 
  },
  headerTitle: { 
    flex: 1, 
    textAlign: 'center', 
    color: 'white', 
    fontSize: 18, 
    fontWeight: '600', 
    paddingHorizontal: 10 
  },
  headerButton: { 
    padding: 10,
    minWidth: 44, // الحد الأدنى لحجم النقرة القابلة للوصول
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { 
    paddingHorizontal: 8, 
    paddingTop: 10,
    paddingBottom: 20, // مساحة إضافية في الأسفل
  },
  
  // الرسائل
  botMessageWrapper: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginVertical: 8, 
    maxWidth: '90%', 
    alignSelf: 'flex-start' 
  },
  userMessageWrapper: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginVertical: 4, 
    maxWidth: '85%', 
    alignSelf: 'flex-end' 
  },
  botAvatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    marginRight: 8, 
    marginTop: 5, 
    backgroundColor: '#3B82F6' 
  },
  botBubble: { 
    backgroundColor: '#1E293B', 
    borderRadius: 18, 
    borderTopLeftRadius: 4, 
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  userBubble: { 
    backgroundColor: '#3B82F6', 
    borderRadius: 18, 
    borderBottomRightRadius: 4, 
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  
  // رسالة الخطأ
  errorMessageWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#3c2428', 
    borderRadius: 12, 
    padding: 12, 
    marginVertical: 8, 
    marginHorizontal: 10, 
    borderWidth: 1, 
    borderColor: '#5c3336' 
  },
  errorTitle: { 
    color: '#F87171', 
    fontWeight: 'bold' 
  },
  errorMessageText: { 
    color: '#FCA5A5', 
    fontSize: 13, 
    marginTop: 2 
  },
  retryButton: { 
    backgroundColor: '#452c30', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  retryButtonText: { 
    color: '#FECACA', 
    fontWeight: '600', 
    fontSize: 13 
  },

  // اقتراحات المقدمة
  suggestionContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'flex-start', 
    marginLeft: 48, 
    marginBottom: 10 
  },
  suggestionChip: { 
    backgroundColor: '#334155', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 16, 
    marginRight: 8, 
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  suggestionText: { 
    color: '#E2E8F0', 
    fontSize: 13 
  },

  // الإجراءات
  actionSheetContainer: { 
    padding: 20, 
    paddingBottom: 30 
  },
  actionSheetItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 15,
    minHeight: 50, // الحد الأدنى لحجم النقرة القابلة للوصول
  },
  actionSheetIcon: { 
    width: 35, 
    textAlign: 'center' 
  },
  actionSheetText: { 
    color: 'white', 
    fontSize: 16, 
    marginLeft: 15, 
    fontWeight: '600' 
  },
  
  // مؤشر الكتابة
  typingDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#9CA3AF', 
    marginHorizontal: 3 
  },
});

const markdownStyles = StyleSheet.create({
  body: { 
    color: '#E2E8F0', 
    fontSize: 16, 
    lineHeight: 24 
  },
  strong: { 
    fontWeight: 'bold', 
    color: '#34D399' 
  },
  paragraph: {
    marginVertical: 4,
  },
  code_inline: {
    backgroundColor: '#1E293B',
    color: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  code_block: {
    backgroundColor: '#1E293B',
    color: '#E2E8F0',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fence: {
    backgroundColor: '#1E293B',
    color: '#E2E8F0',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  blockquote: {
    backgroundColor: '#1E293B',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 8,
  },
  hr: {
    backgroundColor: '#1E293B',
    height: 1,
    marginVertical: 12,
  },
  link: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  table: {
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    marginVertical: 8,
  },
  th: {
    backgroundColor: '#1E293B',
    color: '#E2E8F0',
    padding: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  td: {
    color: '#E2E8F0',
    padding: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
});