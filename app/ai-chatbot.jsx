import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FastMarkdownText from 'react-native-markdown-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { v4 as uuidv4 } from 'uuid';
import CustomInput from '../components/CustomInput';
import { apiService } from '../config/api';
import { STORAGE_KEYS } from '../config/appConfig';
import { useActionSheet } from '../context/ActionSheetContext';
import { useAppState } from '../context/AppStateContext';

const BOT_USER = { 
  id: 'bot-eduai', 
  firstName: 'EduAI', 
  avatarUrl: `https://ui-avatars.com/api/?name=EA&background=3B82F6&color=FFFFFF&bold=true` 
};
// plain-object markdown styles (so we can spread & override safely)
const markdownStyles = {
  body: { 
    color: '#F3F4F6',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  strong: {
    fontWeight: 'bold',
    color: '#34D399',
  },
};
// --- المكونات الفرعية ---

const MessageRenderer = React.memo(({ message, onLongPress, onReactionPress, currentUserId }) => { 
   const isBot = message.author?.id === BOT_USER.id;


  const renderReactions = () => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) return null;
    return (
      <View style={isBot ? styles.botReactionsContainer : styles.userReactionsContainer}>
        {Object.entries(message.reactions).map(([emoji, userIds]) => {
          if (!userIds || userIds.length === 0) return null;
          const isReactedByUser = userIds.includes(currentUserId);
          return (
            <Pressable key={emoji} style={[styles.reactionChip, isReactedByUser && styles.reactedChip]} onPress={() => onReactionPress(message.id, emoji)}>
              <Text style={styles.reactionText}>{emoji} {userIds.length}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  };
  // from int in languages (x) in 10  or int parameter, 
  return (
    <View>
       <Pressable 
        onLongPress={() => onLongPress(message)}
        style={isBot ? styles.botMessageWrapper : styles.userMessageWrapper}
      >
        {isBot && <Image source={{ uri: BOT_USER.avatarUrl }} style={styles.botAvatar} />}
        <View style={[isBot ? styles.botBubble : styles.userBubble]}>
            {message.replyToText && (
                <View style={[styles.replyBubble, { backgroundColor: isBot ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }]}>
                   <Text style={[styles.replyText, {color: isBot ? '#CBD5E1' : 'white'}]} numberOfLines={1}>{message.replyToText}</Text>
                </View>
            )}

          <FastMarkdownText
  styles={isBot ? markdownStyles : {
    ...markdownStyles,
    body: { ...markdownStyles.body, color: 'white', fontWeight: '600' },

  }}
>

            {message.text || '...'}
          </FastMarkdownText>

        </View>
      </Pressable>
      {renderReactions()}
    </View>
  );
});

const ErrorMessage = React.memo(({ message, onRetry }) => (
  <View style={styles.errorMessageWrapper}>
    <FontAwesome5 name="exclamation-triangle" size={18} color="#F87171" />
    <View style={{ flex: 1, marginHorizontal: 12 }}>
      <Text style={styles.errorTitle}>Network Error</Text>
      <Text style={styles.errorMessageText}>{message.text}</Text>
    </View>
    {message.canRetry && (
      <Pressable onPress={() => onRetry(message.retryPayload)} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    )}
  </View>
));

const IntroMessage = React.memo(({ onSuggestionPress }) => (
  <View>
    <MessageRenderer 
      message={{ author: BOT_USER, id: 'intro-msg-bubble', text: "Hello! I'm EduAI, your personal learning assistant. How can I help you today?" }} 
      onLongPress={() => {}} 
      onReactionPress={() => {}}
      currentUserId={'intro'}
    />
    <View style={styles.suggestionContainer}>
      {["Summarize my last lesson", "Create a short quiz for me", "Analyze my performance"].map(text => (
        <Pressable key={text} style={styles.suggestionChip} onPress={() => onSuggestionPress(text)}>
          <Text style={styles.suggestionText}>{text}</Text>
        </Pressable>
      ))}
    </View>
  </View>
));

const TypingIndicator = React.memo(() => (
  <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.botMessageWrapper}>
    <Image source={{ uri: BOT_USER.avatarUrl }} style={styles.botAvatar} />
    <View style={[styles.botBubble, { paddingVertical: 14, flexDirection: 'row' }]}>
      {[0, 1, 2].map(i => (
        <MotiView 
          key={i} 
          from={{ translateY: 0 }} 
          animate={{ translateY: -5 }} 
          transition={{ 
            type: 'timing', 
            duration: 300, 
            delay: i * 150, 
            loop: true, 
            repeatReverse: true 
          }} 
          style={styles.typingDot} 
        />
      ))}
    </View>
  </MotiView>
));

// --- المكون الرئيسي للشاشة ---

export default function AiChatbotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAppState();
  const { openSheet, closeSheet } = useActionSheet();
  const chatUserId = user?.uid || 'guest-user';
  const chatUser = React.useMemo(() => ({ id: chatUserId }), [chatUserId]);

  const { 
    contextLessonId, 
    contextLessonTitle, 
    lessonContentContext, 
    initialMessage // ✨ استقبال الرسالة الأولية
  } = params || {};

  const [messages, setMessages] = useState([]);
  const [chatTitle, setChatTitle] = useState('New Chat');
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  
  const abortControllerRef = useRef(null);
  const flatListRef = useRef(null);

  const saveChat = useCallback(async (sid, newMessages, newTitle) => {
    if (!sid) return;
    try {
      const allSessionsRaw = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
      const allSessions = allSessionsRaw ? JSON.parse(allSessionsRaw) : {};
      const currentSession = allSessions[sid] || {};
      allSessions[sid] = {
        title: newTitle || currentSession.title,
        messages: newMessages.filter(m => m.type !== 'intro'),
        isPinned: currentSession.isPinned || false,
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(allSessions));
    } catch (error) { console.error('Error saving chat:', error); }
  }, []);
  
const isSendingRef = useRef(false);
const processAndRespond = useCallback(async (currentSessionId, currentTitle, userMessage, messageHistory, isRetry = false) => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);
    abortControllerRef.current = new AbortController();
    const typingIndicator = { type: 'typing', id: uuidv4(), author: BOT_USER };

    setMessages(prev => {
        let newMessages = prev.filter(m => m.type !== 'intro' && m.type !== 'typing' && m.type !== 'error');
        if (!isRetry) {
            newMessages = [userMessage, ...newMessages];
        }
        return [typingIndicator, ...newMessages];
    });
    
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

    const historyForAPI = messageHistory.slice(-5).map(msg => ({
      role: msg.author?.id === BOT_USER.id ? 'model' : 'user',
      text: msg.text || '',
    }));

    let finalUserMessageText = userMessage.text;
    const isFirstMessageOfSession = messageHistory.length === 0;
    if (lessonContentContext && isFirstMessageOfSession) {
        const contextSnippet = typeof lessonContentContext === 'string' 
            ? lessonContentContext.substring(0, 1500) 
            : 'No content available.';
        finalUserMessageText = `[CONTEXT: The user is in a lesson about: "${contextSnippet}..."] ${userMessage.text}`;
    }

    try {
        const response = await apiService.getInteractiveChatReply({ 
            message: finalUserMessageText, 
            userId: user?.uid, 
            history: historyForAPI 
        }, abortControllerRef.current.signal);

        const botResponse = { type: 'bot', author: BOT_USER, id: uuidv4(), text: response.reply, reactions: {} };

        setMessages(prev => {
            const newMessages = [botResponse, ...prev.filter(m => m.id !== typingIndicator.id)];
            saveChat(currentSessionId, newMessages, currentTitle);
            return newMessages;
        });
    } catch (error) {
        if (error.name !== 'AbortError') {
            const errorMsg = { 
                type: 'error', 
                id: uuidv4(), 
                text: error.message || "Failed to connect.", 
                canRetry: true, 
                retryPayload: { userMessage, messageHistory } // Pass the correct payload for retry
            };
            setMessages(prev => prev.map(m => m.id === typingIndicator.id ? errorMsg : m));
        } else {
            setMessages(prev => prev.filter(m => m.id !== typingIndicator.id));
        }
    } finally {
        isSendingRef.current = false;
        setIsSending(false);
    }
}, [user?.uid, saveChat, lessonContentContext]);

   
const onSendPress = useCallback(async (text) => {
    if (isSending || !text.trim()) return;

    const currentMessages = messages.filter(m => m.type !== 'intro' && m.type !== 'typing' && m.type !== 'error');

    if (editingMessage) {
        const editIndex = messages.findIndex(m => m.id === editingMessage.id);
        if (editIndex > -1) {
            // History is everything OLDER than the edited message. In an inverted list, that's everything after its index.
            const historyForRegen = messages.slice(editIndex + 1).filter(m => m.type !== 'intro');
            const updatedUserMessage = { ...editingMessage, text: text.trim() };
            
            // Optimistically update the UI: remove subsequent conversation and show the edited message.
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[editIndex] = updatedUserMessage;
                return newMessages.slice(editIndex); // This keeps the edited message and all older ones.
            });
            
            // Regenerate the response from this point.
            processAndRespond(sessionId, chatTitle, updatedUserMessage, historyForRegen.reverse(), true);
        }
        setEditingMessage(null);
    } else {
        let currentSessionId = sessionId;
        let currentTitle = chatTitle;

        if (!currentSessionId) {
            currentSessionId = `chat_${Date.now()}`;
            setSessionId(currentSessionId);
            try {
                const { title } = await apiService.generateTitle(text.trim());
                currentTitle = title;
                setChatTitle(title);
            } catch (e) {
                currentTitle = text.trim().substring(0, 30);
                setChatTitle(currentTitle);
            }
        }

        const replyingToMessage = replyingTo ? messages.find(m => m.id === replyingTo.id) : null;
        const userMessage = {
            type: 'user', author: chatUser, id: uuidv4(), text: text.trim(),
            replyToId: replyingTo ? replyingTo.id : null,
            replyToText: replyingToMessage ? replyingToMessage.text : null,
            reactions: {},
        };
        setReplyingTo(null);
        
        processAndRespond(currentSessionId, currentTitle, userMessage, currentMessages, false);
    }
}, [isSending, editingMessage, messages, replyingTo, chatUser, processAndRespond, sessionId, chatTitle]);
  
  // ENHANCEMENT: Fixed retry logic
  const handleRetry = useCallback((payload) => {
    if (isSending) return;
    // Correctly destructure the payload
    const { userMessage, messageHistory } = payload;
    
    // Call processAndRespond with all required arguments.
    processAndRespond(sessionId, chatTitle, userMessage, messageHistory, true);

}, [processAndRespond, isSending, sessionId, chatTitle]);

  const handleReactionPress = useCallback((messageId, clickedEmoji) => {
    setMessages(prev => {
      const newMessages = prev.map(msg => {
        if (msg.id === messageId) {
          const newReactions = { ...(msg.reactions || {}) };
          let userExistingReaction = null;

          // Find if the user has already reacted
          for (const emoji in newReactions) {
            if (newReactions[emoji]?.includes(chatUser.id)) {
              userExistingReaction = emoji;
              break;
            }
          }

          // If user reacted before, remove the old reaction
          if (userExistingReaction) {
            newReactions[userExistingReaction] = newReactions[userExistingReaction].filter(id => id !== chatUser.id);
            if (newReactions[userExistingReaction].length === 0) delete newReactions[userExistingReaction];
          }

          // If the new reaction is different from the old one, add it
          if (userExistingReaction !== clickedEmoji) {
            const userList = newReactions[clickedEmoji] || [];
            newReactions[clickedEmoji] = [...userList, chatUser.id];
          }
          
          return { ...msg, reactions: newReactions };
        }
        return msg;
      });
      
      // Save the updated messages array to storage
      saveChat(sessionId, newMessages.filter(m => m.type !== 'intro'), chatTitle);
      return newMessages;
    });
    closeSheet();
}, [chatUser.id, closeSheet, saveChat, sessionId, chatTitle]);

  const handleLongPressMessage = useCallback((message) => {
    if(message.type === 'intro' || message.type === 'typing' || message.type === 'error') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isUserMessage = message.author?.id === chatUserId; // أو chatUser.id حسب ما تستخدم
    const EMOJIS = ['❤️','😂','😮','😢','😡','👍'];

    const MessageActions = () => (
      <View style={styles.actionSheetContainer}>
        <View style={styles.reactionRow}>
          {EMOJIS.map(emoji => (
            <Pressable key={emoji} style={styles.reactionButton} onPress={() => handleReactionPress(message.id, emoji)}>
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.actionSheetItem} onPress={() => { Clipboard.setStringAsync(message.text); Toast.show({ type: 'success', text1: 'Copied to clipboard' }); closeSheet(); }}>
          <FontAwesome5 name="copy" size={20} color="#a7adb8ff" style={styles.actionSheetIcon} />
          <Text style={styles.actionSheetText}>Copy Text</Text>
        </Pressable>
        {isUserMessage && (
          <Pressable style={styles.actionSheetItem} onPress={() => { setEditingMessage(message); closeSheet(); }}>
            <FontAwesome5 name="pen" size={20} color="#a7adb8ff" style={styles.actionSheetIcon} />
            <Text style={styles.actionSheetText}>Edit Message</Text>
          </Pressable>
        )}
        <Pressable style={styles.actionSheetItem} onPress={() => { setReplyingTo(message); closeSheet(); }}>
          <FontAwesome5 name="reply" size={20} color="#a7adb8ff" style={styles.actionSheetIcon} />
          <Text style={styles.actionSheetText}>Reply</Text>
        </Pressable>
      </View>
    );
    openSheet(<MessageActions />);
  }, [chatUser.id, closeSheet, openSheet, handleReactionPress]);

  const handleStopGenerating = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsSending(false);
    setMessages(prev => prev.filter(m => m.type !== 'typing'));
  }, []);

  const renderItem = useCallback(({ item }) => {
    return (
      <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 300 }}>
        {
          {
            'bot': <MessageRenderer message={item} onLongPress={handleLongPressMessage} onReactionPress={handleReactionPress} currentUserId={chatUser.id} />,
            'user': <MessageRenderer message={item} onLongPress={handleLongPressMessage} onReactionPress={handleReactionPress} currentUserId={chatUser.id} />,
            'error': <ErrorMessage message={item} onRetry={handleRetry} />,
            'intro': <IntroMessage onSuggestionPress={onSendPress} />,
            'typing': <TypingIndicator />,
          }[item.type]
        }
      </MotiView>
    );
  }, [handleLongPressMessage, handleReactionPress, handleRetry, onSendPress, chatUser.id]);
  
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
          setMessages(stored.messages ? [...stored.messages].reverse() : []);
        } else {
          setChatTitle(contextLessonTitle || 'New Chat');
          
          // ✨ التعديل الصحيح: استدعاء onSendPress بدلاً من processAndRespond
          if (initialMessage) {
            // لا نعرض أي رسائل هنا، onSendPress سيتولى كل شيء
            setMessages([]); 
            // استدعاء onSendPress سيقوم بإنشاء الجلسة، توليد العنوان، وإرسال الرسالة
            setTimeout(() => {
                onSendPress(initialMessage);
            }, 100);
          } else {
            // الحالة الافتراضية: محادثة جديدة فارغة
            setMessages([{ type: 'intro', id: 'intro-msg' }]);
          }
        }
      } catch (error) { 
        console.error('Error loading chat:', error); 
        setMessages([{ type: 'intro', id: 'intro-msg' }]); // Fallback
      } finally { 
        setIsLoading(false); 
      }
    };

    loadChat();
  }, [params.sessionId]); 

useEffect(() => {
    return () => {
        handleStopGenerating();
    };
}, [handleStopGenerating]);

useEffect(() => {
  if (!isSending) {
    setReplyingTo(null);
    setEditingMessage(null);
  }
}, [isSending]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.push('/chat-history')} style={styles.headerButton}><FontAwesome5 name="bars" size={22} color="white" /></Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>{chatTitle}</Text>
            <Pressable onPress={() => router.back()} style={styles.headerButton}><FontAwesome5 name="times" size={22} color="white" /></Pressable>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={Platform.select({ ios: 64, default: 0 })}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              inverted 
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
            />
            
            <CustomInput
              onSend={onSendPress}
              isEditing={!!editingMessage}
              onCancelEdit={() => setEditingMessage(null)}
              editingValue={editingMessage?.text || ''}
              isSending={isSending}
              onStop={handleStopGenerating}
              replyTo={replyingTo ? messages.find(m => m.id === replyingTo.id) : null}
              onCancelReply={() => setReplyingTo(null)}
            />
          </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

  // --- الأنماط (Styles) ---
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0C0F27' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
    headerTitle: { flex: 1, textAlign: 'center', color: 'white', fontSize: 18, fontWeight: '600', paddingHorizontal: 10 },
    headerButton: { padding: 10 },
    listContent: { paddingHorizontal: 15, paddingBottom: 10 },
    botMessageWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 8, maxWidth: '85%', alignSelf: 'flex-start' },
    userMessageWrapper: { flexDirection: 'row-reverse', alignItems: 'flex-start', marginVertical: 4, maxWidth: '80%', alignSelf: 'flex-end' },
    botAvatar: { width: 35, height: 35, borderRadius: 16, marginRight: 10, marginTop: 5, resizeMode: 'cover' },
    botBubble: { backgroundColor: '#ffffffd5', borderRadius: 18, borderTopLeftRadius: 6, padding: 12 },
    userBubble: { backgroundColor: '#3B82F6', borderRadius: 18, borderBottomRightRadius: 6, padding: 12 },
    errorMessageWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3c2428', borderRadius: 12, padding: 12, marginVertical: 8, marginHorizontal: 10, borderWidth: 1, borderColor: '#5c3336' },
    errorTitle: { color: '#F87171', fontWeight: 'bold' },
    errorMessageText: { color: '#FCA5A5', fontSize: 13, marginTop: 2 },
    retryButton: { backgroundColor: '#452c30', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    retryButtonText: { color: '#FECACA', fontWeight: '600' },
    suggestionContainer: { flexDirection: 'row', flexWrap: 'wrap', marginLeft: 50, marginBottom: 10 },
    suggestionChip: { backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 8, marginTop: 8 },
    suggestionText: { color: '#cddff7ff', fontSize: 13 },
    actionSheetContainer: { paddingHorizontal: 20, paddingBottom: 30 },
    reactionRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#334155' },
    reactionButton: { padding: 10 },
    reactionEmoji: { fontSize: 28 },
    actionSheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
    actionSheetIcon: { width: 35, textAlign: 'center' },
    actionSheetText: { color: 'white', fontSize: 16, marginLeft: 15, fontWeight: '600' },
    typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9CA3AF', marginHorizontal: 3 },
    replyBubble: { borderLeftWidth: 3, borderLeftColor: '#34D399', paddingLeft: 10, marginBottom: 8, opacity: 0.9, borderRadius: 4, paddingVertical: 4, paddingRight: 4 },
    replyText: { fontSize: 13, fontStyle: 'italic' },
    botReactionsContainer: { flexDirection: 'row', alignSelf: 'flex-start', marginLeft: 50, marginTop: 2 },
    userReactionsContainer: { flexDirection: 'row-reverse', alignSelf: 'flex-end', marginRight: 5, marginTop: 2 },
    reactionChip: { backgroundColor: '#334155', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, marginHorizontal: 2 },
    reactedChip: { backgroundColor: '#3B82F6' },
    reactionText: { color: 'white', fontSize: 12 },
  });

