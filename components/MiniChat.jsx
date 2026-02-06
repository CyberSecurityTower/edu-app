// components/MiniChat.jsx

import React, { useEffect, useState, useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { apiService } from '../config/api';
import { useChat } from '../context/ChatContext';
import { useAppState } from '../context/AppStateContext';
import { useLanguage } from '../context/LanguageContext';
import { reportContent } from '../services/supabaseService';

import CustomAlert from '../components/CustomAlert';
import MessageOptionsModal from './minichat/MessageOptionsModal';
import MiniChatPanel from './minichat/MiniChatPanel';

export default function MiniChat({ isVisible, onClose, lessonId, lessonTitle, user, accent }) {
  const { t, isRTL, language } = useLanguage();

  const { 
    messages,
    isSending, 
    sendMessage, 
    deleteMessage,     
    stopGeneration,
    openChatSession,
    loadMoreMessages,
    isLoadingHistory,
    currentContext 
  } = useChat();

  const { addPoints } = useAppState(); 
  
  const [promptText, setPromptText] = useState('');
  const [attachments, setAttachments] = useState([]); 
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [alertInfo, setAlertInfo] = useState({ isVisible: false });

  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // ✅ 1. منطق الفتح الآمن (Prevent Overwrite)
  useEffect(() => {
    if (!isVisible) return;

    // --- الحالة 1: تم تمرير معرف درس صريح (Props) ---
    // (يحدث فقط عند فتح الشات يدوياً من أيقونة الشات في الدرس)
    if (lessonId) {
        const targetId = `lesson_${lessonId}`;
        const isActiveSessionCorrect = currentContext?.lessonId === lessonId;

        if (!isActiveSessionCorrect) {
            console.log(`🔄 MiniChat: Switching to Prop Lesson: ${lessonId}`);
            openChatSession(targetId, {
                lessonId: lessonId,
                lessonTitle: lessonTitle,
                type: 'lesson',
                subjectId: null
            });
            // نجلب الاقتراحات فقط عند تغيير الجلسة
            fetchSuggestions();
        }
        return;
    }

    // --- الحالة 2: الاستخدام العام (Global/Fab) ---
    // هنا مربط الفرس: يجب ألا نقاطع الجلسة إذا كانت تحتوي على رسائل (مثل رسالة الشرح)
    
    // هل هناك رسائل معروضة حالياً؟ (مثل رسالة الشرح التي أضيفت للتو)
    if (messages.length > 0) {
        console.log("🛡️ MiniChat: Messages exist (e.g. Explain/Translation). Preventing reset.");
        return; 
    }

    // هل السياق موجود بالفعل؟
    if (currentContext) {
        console.log(`✅ MiniChat: Staying in context: ${currentContext.type}`);
        if (suggestions.length === 0) fetchSuggestions();
        return;
    }

    // --- الحالة 3: فراغ تام (لا رسائل ولا سياق) ---
    // هنا فقط نفتح المحادثة العامة
    console.log("⚪ MiniChat: Empty state. Initializing General.");
    openChatSession('general', { type: 'general' });
    fetchSuggestions();

  }, [isVisible, lessonId]); // ⚠️ الاعتمادات ثابتة لمنع التكرار

  const fetchSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const activeLessonId = lessonId || currentContext?.lessonId;
      const activeTitle = lessonTitle || currentContext?.title;
      const contextData = activeLessonId 
        ? { type: 'lesson', lessonId: activeLessonId, title: activeTitle } 
        : { type: 'general' };

      const response = await apiService.getChatSuggestions(user?.uid, contextData);
      setSuggestions(response?.suggestions?.slice(0, 3) || []);
    } catch (e) {
      setSuggestions(['لخص لي', 'شرح بسيط', 'كويز سريع']);
    } finally { 
      setIsLoadingSuggestions(false); 
    }
  };

  const handleSend = async (textOverride, options = {}) => {
    const text = typeof textOverride === 'string' ? textOverride : promptText;
    const currentAttachments = options.attachments || attachments;
    const isWebSearch = options.webSearch || false;
    const isAudio = options.type === 'audio';

    if (!text.trim() && currentAttachments.length === 0 && !isWebSearch && !isAudio) return;

    setPromptText('');
    setAttachments([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const activeLessonId = lessonId || currentContext?.lessonId;
    const activeLessonTitle = lessonTitle || currentContext?.title;

    await sendMessage(text, {
        files: currentAttachments,
        webSearch: isWebSearch,
        type: options.type,
        audioData: options.audioData,
        lessonId: activeLessonId,       
        lessonTitle: activeLessonTitle 
    });
  };

  const handleToolbarCopy = async (text) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLongPressMessage = useCallback((message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedMessage(message);
    setMenuVisible(true);
  }, []);

  const handleMenuAction = useCallback(async (actionId, message) => {
    if (!message) return;
    setMenuVisible(false);

    switch (actionId) {
      case 'edit':
        setPromptText(message.text);
        break;
      case 'resend':
        handleSend(message.text); 
        break;
      case 'delete':
        deleteMessage(message.id);
        break;
      case 'copy':
        await Clipboard.setStringAsync(message.text);
        break;
      case 'report':
        confirmReport(message);
        break;
    }
  }, [deleteMessage]);

  const confirmReport = (message) => {
    setAlertInfo({
      isVisible: true,
      title: "الإبلاغ عن محتوى",
      message: "هل أنت متأكد أن هذا الرد مسيء أو غير دقيق؟",
      buttons: [
        { text: "إلغاء", style: 'cancel', onPress: () => setAlertInfo({ isVisible: false }) },
        { text: "إبلاغ", style: 'destructive', onPress: async () => {
            setAlertInfo({ isVisible: false });
            reportContent(user?.uid, message.text, 'Flagged');
            setTimeout(() => setAlertInfo({ isVisible: true, title: "تم الإرسال", message: "شكراً لمساعدتك." }), 500);
          }
        }
      ]
    });
  };

 
const handleWidgetAction = useCallback((action) => {
  if (action.type === 'quiz_completed') {
       const { score, hiddenPrompt } = action.payload;
       
       if (score > 0 && typeof addPoints === 'function') {
            try { addPoints(score); } catch (err) {}
       }
       
       if (hiddenPrompt) {
           // التأكد من وجود سياق قبل الإرسال
           const activeLessonId = lessonId || currentContext?.lessonId;
           const activeTitle = lessonTitle || currentContext?.title;

           console.log("🚀 Sending Hidden Quiz Report:", { activeLessonId, hiddenPrompt }); // Debug log

           sendMessage(hiddenPrompt, { 
             isHidden: true, 
             isWidgetAction: true,
             lessonId: activeLessonId, // 👈 هام جداً
             lessonTitle: activeTitle
           }); 
       }
  }
}, [addPoints, sendMessage, lessonId, lessonTitle, currentContext]);

  return (
    <>
      <MiniChatPanel 
        isVisible={isVisible}
        onClose={onClose}
        promptText={promptText}
        setPromptText={setPromptText}
        isSending={isSending} 
        inputProps={{
            attachments: attachments,
            setAttachments: setAttachments
        }}
        messages={messages} 
        suggestions={suggestions}
        isLoadingSuggestions={isLoadingSuggestions}
        hasMoreMessages={true} 
        isLoadingOlder={isLoadingHistory}
        onLoadMore={loadMoreMessages} 
        onSend={handleSend}        
        onStop={stopGeneration} 
        onSuggestionPress={(text) => handleSend(text)}
        onWidgetAction={handleWidgetAction}
        onLongPressMessage={handleLongPressMessage}
        onCopy={handleToolbarCopy}
        accent={accent}
        isRTL={isRTL}
        placeholder={t('askAi') || "اسأل المعلم الذكي..."}
      />

      <MessageOptionsModal 
        visible={menuVisible}
        onClose={() => { setMenuVisible(false); setSelectedMessage(null); }}
        message={selectedMessage}
        onAction={handleMenuAction}
      />

      <CustomAlert 
        isVisible={alertInfo.isVisible} 
        onClose={() => setAlertInfo({ isVisible: false })} 
        title={alertInfo.title} 
        message={alertInfo.message} 
        buttons={alertInfo.buttons} 
      />
    </>
  );
}