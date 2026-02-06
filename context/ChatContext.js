// context/ChatContext.js
import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system'; 
import { apiService } from '../config/api';
import { useAppState } from './AppStateContext';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

const BOT_USER = { id: 'bot-fab', firstName: 'EduAI' };

// دالة لتحويل رسالة السيرفر إلى واجهة المستخدم
const mapDbMessageToUi = (dbMsg) => {
  const isBot = dbMsg.role === 'assistant' || dbMsg.role === 'model';
  
  const audioAttachment = dbMsg.attachments?.find(a => a.mime?.startsWith('audio/') || a.type === 'audio');
  const isAudio = !!audioAttachment;

  return {
    _id: dbMsg.id,
    id: dbMsg.id,
    text: dbMsg.content || '',
    createdAt: dbMsg.created_at,
    type: isBot ? 'bot' : 'user',
    author: isBot ? BOT_USER : { id: dbMsg.user_id || 'user', firstName: 'You' },
    attachments: dbMsg.attachments || [],
    widgets: dbMsg.metadata?.widgets || [],
    sources: dbMsg.metadata?.sources || [],
    direction: dbMsg.metadata?.direction || 'ltr',
    
    isAudio: isAudio,
    audioUri: audioAttachment ? (audioAttachment.url || audioAttachment.uri) : null,
    duration: audioAttachment?.duration || null,
    
    isLocal: false,
  };
};

export const ChatProvider = ({ children, user }) => {
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [unreadBotMessages, setUnreadBotMessages] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyCursor, setHistoryCursor] = useState(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [currentContext, setCurrentContext] = useState({ lessonId: null, title: null });
  const [sessionId, setSessionId] = useState(null);

  const isPanelVisibleRef = useRef(isPanelVisible);
  // const { handleServerReward } = useAppState(); // Uncomment if needed

  useEffect(() => {
    isPanelVisibleRef.current = isPanelVisible;
    if (isPanelVisible) setUnreadBotMessages(0);
  }, [isPanelVisible]);

  // ============================================================
  // 1️⃣ تعريف fetchHistory أولاً (تم النقل للأعلى وتغليفها بـ useCallback)
  // ============================================================
  const fetchHistory = useCallback(async (lessonId, cursor = null, isRefresh = false) => {
    if (!user?.uid) return;
    if (!isRefresh && !hasMoreHistory && cursor) return;

    setIsLoadingHistory(true);
    try {
      // إذا كان lessonId فارغاً أو null، نرسل 'general' أو نتركه undefined ليعالجه الباك اند
      const targetId = (lessonId && lessonId !== 'undefined' && lessonId !== 'null') 
                       ? lessonId 
                       : 'general'; // 👈 نحدد 'general' صراحة إذا لم يكن هناك ID

      console.log(`📥 Fetching History | User: ${user.uid} | Lesson: ${targetId}`);

      const params = { 
          userId: user.uid, 
          lessonId: targetId, 
          cursor: cursor 
      };
      
      const response = await apiService.get('/chat/history', params);
      
      console.log(`✅ History Loaded: ${response?.messages?.length || 0} messages`);

      if (response && response.messages) {
        const uiMessages = response.messages.map(mapDbMessageToUi);
        setMessages(prev => isRefresh ? uiMessages : [...prev, ...uiMessages]);
        setHistoryCursor(response.nextCursor);
        setHasMoreHistory(!!response.nextCursor);
        
        if (response.messages.length > 0 && response.messages[0].session_id) {
            setSessionId(response.messages[0].session_id);
        }
      }
    } catch (error) {
      console.error("❌ Failed to fetch history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user, hasMoreHistory]); // التبعيات

  // ============================================================
  // 2️⃣ openChatSession (تستخدم fetchHistory الآن بشكل صحيح)
  // ============================================================
  const openChatSession = useCallback(async (contextKey, metadata = {}) => {
    setIsPanelVisible(true);
    setUnreadBotMessages(0);
    
    // استخراج الـ ID
    const newLessonId = metadata.lessonId || (contextKey === 'general' ? null : contextKey.replace('lesson_', ''));
    
    console.log("🟢 Opening Session for Lesson ID:", newLessonId || 'General');

    // تحديث السياق
    setCurrentContext({ 
        lessonId: newLessonId, 
        title: metadata.lessonTitle 
    });

    // تصفير الواجهة
    setMessages([]); 
    setSessionId(null); 
    setHasMoreHistory(false);
    setHistoryCursor(null);

    // 🔥 التعديل: استدعاء جلب التاريخ دائماً، حتى لو كان newLessonId = null (للشات العام)
    await fetchHistory(newLessonId, null, true); 
    
  }, [fetchHistory]); // نعتمد على fetchHistory

  const closeChatPanel = useCallback(() => {
    setIsPanelVisible(false);
  }, []);

  const prepareFileForUpload = async (file) => {
    try {
      if (file.url || (file.uri && file.uri.startsWith('http'))) return null;
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      return {
        data: base64,
        mime: file.mimeType || 'application/octet-stream',
        name: file.name || `file_${Date.now()}`
      };
    } catch (e) {
      console.error("File prep error:", e);
      return null;
    }
  };

  const sendMessage = useCallback(async (text, contextData = {}) => {
    if (isSending) return;
    
    const hasFiles = contextData.files && contextData.files.length > 0;
    const isAudio = contextData.type === 'audio';
    
    if (!text?.trim() && !hasFiles && !isAudio) return;

    setIsSending(true);

    const tempId = Date.now().toString();
    const localMsg = {
      id: tempId,
      text: text || (isAudio ? "رسالة صوتية" : ""), 
      type: 'user',
      author: { id: user.uid, firstName: 'You' },
      createdAt: new Date().toISOString(),
      attachments: contextData.files || [],
      
      isAudio: isAudio,
      audioUri: isAudio ? (contextData.audioData?.audioUri || contextData.audioData?.uri) : null,
      duration: isAudio ? contextData.audioData?.duration : null,

      isLocal: true,
      status: 'sending'
    };

    setMessages(prev => [localMsg, ...prev]);
    
    const typingId = 'typing-' + tempId;
    setTimeout(() => {
        if(isSending) setMessages(prev => [{ id: typingId, type: 'typing', author: BOT_USER }, ...prev]);
    }, 600);

    try {
      let filesToUpload = [];

      if (hasFiles) {
        const processed = await Promise.all(contextData.files.map(prepareFileForUpload));
        filesToUpload = [...filesToUpload, ...processed.filter(f => f !== null)];
      }
      
     if (isAudio && (contextData.audioData?.uri || contextData.audioData?.audioUri)) {
         try {
             const validUri = contextData.audioData?.audioUri || contextData.audioData?.uri;
             const audioBase64 = await FileSystem.readAsStringAsync(validUri, { 
                 encoding: FileSystem.EncodingType.Base64 
             });
             
             filesToUpload.push({
                data: audioBase64,
                mime: 'audio/mp4', 
                name: `voice_${Date.now()}.m4a`
             });
         } catch (audioErr) {
             console.error("Audio conversion failed:", audioErr);
             throw new Error("فشل معالجة الصوت");
         }
      }

      // إرسال الرسالة
      const rawLessonId = contextData.lessonId || currentContext.lessonId;
      const targetLessonId = rawLessonId ? rawLessonId : 'general';
      const targetLessonTitle = contextData.lessonTitle || currentContext.title;

      console.log("📤 Sending Message to Lesson:", targetLessonId); 

      const payload = {
        userId: user.uid,
        message: text || (isAudio ? "قام المستخدم بإرسال رسالة صوتية..." : ""),
        files: filesToUpload,
        currentContext: {
            lessonId: targetLessonId,
            lessonTitle: targetLessonTitle,
            subjectId: contextData.subjectId
        },
        location: "Algeria", 
        webSearch: !!contextData.webSearch,
        sessionId: sessionId
      };

      const response = await apiService.post('/chat/process', payload);
      setMessages(prev => prev.filter(m => m.id !== typingId));

      if (response && response.reply) {
        if (response.sessionId) setSessionId(response.sessionId);

        const botMsg = {
          id: Date.now().toString(),
          text: response.reply,
          type: 'bot',
          author: BOT_USER,
          createdAt: new Date().toISOString(),
          widgets: response.widgets || [],
          sources: response.sources || [],
          direction: 'auto'
        };

        setMessages(prev => [botMsg, ...prev]);

        if (isPanelVisibleRef.current) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            setUnreadBotMessages(p => p + 1);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }

    } catch (error) {
      console.error("Message send error:", error);
      setMessages(prev => prev.filter(m => m.id !== typingId));
      setMessages(prev => [{
          id: 'err-' + Date.now(),
          type: 'bot',
          author: BOT_USER,
          text: 'حدث خطأ أثناء الإرسال.',
          isError: true
      }, ...prev]);
    } finally {
      setIsSending(false);
    }
  }, [user, currentContext, sessionId, isSending]);

  const deleteMessage = useCallback((msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
  }, []);

  const stopGeneration = useCallback(() => {
     setIsSending(false);
  }, []);

  const loadMoreMessages = useCallback(() => {
     if (!isLoadingHistory && hasMoreHistory) {
         fetchHistory(currentContext.lessonId, historyCursor);
     }
  }, [isLoadingHistory, hasMoreHistory, historyCursor, currentContext.lessonId, fetchHistory]);

  return (
    <ChatContext.Provider value={{
      messages,
      isSending,
      unreadBotMessages,
      isPanelVisible,
      isLoadingHistory,
      sendMessage,
      openChatSession,
      closeChatPanel,
      stopGeneration,
      deleteMessage,
      loadMoreMessages,
      currentContext
    }}>
      {children}
    </ChatContext.Provider>
  );
};