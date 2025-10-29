import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Alert, TextInput, Keyboard, Platform, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { MotiView, AnimatePresence } from 'moti';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, withTiming } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import * as Haptics from 'expo-haptics';
import FastMarkdownText from 'react-native-markdown-text'; // ✨ [NEW] بديل أسرع لعرض نصوص المحادثة

import FloatingActionButton from '../components/FloatingActionButton';
import { getLessonContent, updateLessonProgress } from '../services/firestoreService';
import { useAppState } from '../context/AppStateContext';
import GenerateKitButton from '../components/GenerateKitButton';
import { apiService } from '../config/api';
import { STORAGE_KEYS } from '../config/appConfig';

// تعريف ثابت لشخصية الروبوت
const BOT_USER = { id: 'bot-fab', firstName: 'FAB' };

// --- ✨ [OPTIMIZATION] مكون الرسالة (MessageItem) معزول ومُحسّن ---
const MessageItem = React.memo(({ message }) => {
    const isBot = message.author?.id === BOT_USER.id;
    // استخدام FastMarkdownText لتحسين أداء العرض النصي
    const renderMarkdown = (text) => (
        <FastMarkdownText styles={isBot ? styles.botTextMarkdown : styles.userTextMarkdown}>
            {text}
        </FastMarkdownText>
    );

    return (
        <MotiView 
            from={{ opacity: 0, translateY: isBot ? 10 : 0 }} 
            animate={{ opacity: 1, translateY: 0 }} 
            transition={{ type: 'timing', duration: 300 }}
            style={isBot ? styles.botMessageWrapper : styles.userMessageWrapper}
        >
            <View style={isBot ? styles.botBubble : styles.userBubble}>
                {renderMarkdown(message.text)}
            </View>
        </MotiView>
    );
});

// --- ✨ [OPTIMIZATION] مكون مؤشر الكتابة (TypingIndicator) معزول ومُحسّن ---
const TypingIndicator = React.memo(() => (
    <MotiView style={styles.botMessageWrapper} from={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <View style={[styles.botBubble, { paddingVertical: 10, flexDirection: 'row' }]}>
            {[0, 1, 2].map(i => (
                <MotiView 
                    key={i} 
                    from={{ translateY: 0 }} 
                    animate={{ translateY: -5 }} 
                    transition={{ type: 'timing', duration: 300, delay: i * 150, loop: true, repeatReverse: true }} 
                    style={styles.typingDot} 
                />
            ))}
        </View>
    </MotiView>
));
// -------------------------------------------------------------------


export default function LessonViewScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAppState();
    const chatUserId = user?.uid || 'guest-user';
    const chatUser = useMemo(() => ({ id: chatUserId }), [chatUserId]);
    
    const { lessonId, lessonTitle, subjectId, pathId, totalLessons } = params || {};
    const CHAT_KEY = `mini_chat_${lessonId}_${chatUserId}`; 

    const [lessonContent, setLessonContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isChatPanelVisible, setChatPanelVisible] = useState(false);
    const [promptText, setPromptText] = useState('');
    
    const [messages, setMessages] = useState([]);
    const [isSending, setIsSending] = useState(false);
    
    const translateY = useSharedValue(500);
    const context = useSharedValue({ y: 0 });
    const flatListRef = useRef(null);
    const abortControllerRef = useRef(null);

    // --- منطق حفظ وتحميل المحادثة (useCallback) ---
    const saveChat = useCallback(async (currentMessages) => {
        try {
            const storableMessages = currentMessages
                .filter(m => m.type !== 'typing' && m.type !== 'intro')
                .reverse(); 
            await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(storableMessages));
        } catch (error) {
            console.error('Error saving mini-chat:', error);
        }
    }, [CHAT_KEY]);

    const loadChat = useCallback(async () => {
        try {
            const storedMessagesRaw = await AsyncStorage.getItem(CHAT_KEY);
            if (storedMessagesRaw) {
                const storedMessages = JSON.parse(storedMessagesRaw);
                setMessages(storedMessages.reverse());
            } else {
                setMessages([]);
            }
        } catch (error) {
            console.error('Error loading mini-chat:', error);
        }
    }, [CHAT_KEY]);

    // ✨ [NEW] دالة لإيقاف عملية الإرسال
    const handleStopGenerating = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort(); // إلغاء طلب الشبكة
            setIsSending(false);
            setMessages(prev => prev.filter(m => m.type !== 'typing'));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
    }, []);

    // --- منطق التواصل مع الذكاء الاصطناعي (useCallback) ---
    const processAndRespond = useCallback(async (userMessage, history) => {
        if (isSending) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsSending(true);
        abortControllerRef.current = new AbortController();
        const typingIndicator = { type: 'typing', id: uuidv4(), author: BOT_USER };

        setMessages(prev => [typingIndicator, userMessage, ...prev.filter(m => m.type !== 'typing' && m.type !== 'intro')]);
        
        const historyForAPI = history.slice(-5).map(msg => ({
            role: msg.author?.id === BOT_USER.id ? 'model' : 'user',
            text: msg.text || '',
        }));

        const contextSnippet = typeof lessonContent === 'string' 
            ? lessonContent.substring(0, 1500) 
            : 'No content available.';
        const finalUserMessageText = `[CONTEXT: The user is in a lesson about: "${lessonTitle}". Content snippet: ${contextSnippet}...] ${userMessage.text}`;

        try {
            const response = await apiService.getInteractiveChatReply({ 
                message: finalUserMessageText, 
                userId: user?.uid, 
                history: historyForAPI 
            }, abortControllerRef.current.signal);

            const botResponse = { type: 'bot', author: BOT_USER, id: uuidv4(), text: response.reply, reactions: {} };

            setMessages(prev => {
                const newMessages = [botResponse, ...prev.filter(m => m.id !== typingIndicator.id)];
                runOnJS(saveChat)(newMessages); 
                return newMessages;
            });
        } catch (error) {
            if (error.name !== 'AbortError') { // تجاهل الخطأ إذا كان سببه الإلغاء اليدوي
                console.error('AI Chat Error:', error);
                Alert.alert("Network Error", "Could not reach EduAI tutor. Please check your connection."); // ✨ [IMPROVEMENT] رسالة خطأ واضحة
            }
            setMessages(prev => prev.filter(m => m.id !== typingIndicator.id));
        } finally {
            setIsSending(false);
        }
    }, [isSending, user?.uid, lessonContent, lessonTitle, saveChat]);
    
    // --- دالة الإرسال الرئيسية (useCallback) ---
    const handleSendPrompt = useCallback(() => {
        if (isSending) { // ✨ [MODIFIED] إذا كان يرسل، فزر الإرسال يعمل كزر إيقاف
            handleStopGenerating();
            return;
        }

        if (promptText.trim().length === 0) return;
        
        const text = promptText.trim();
        setPromptText('');
        Keyboard.dismiss();

        const userMessage = { type: 'user', author: chatUser, id: uuidv4(), text: text, reactions: {} };
        const currentMessages = messages.filter(m => m.type !== 'typing').reverse(); 
        processAndRespond(userMessage, currentMessages);
        
    }, [promptText, isSending, chatUser, messages, processAndRespond, handleStopGenerating]);
    
    // ... (منطق تحميل الدرس، إظهار وإخفاء النافذة، Gesture يبقى كما هو)

    useEffect(() => {
        let mounted = true;
        const loadLessonData = async () => {
          if (!user?.uid || !lessonId || !subjectId || !pathId) {
            if (mounted) setIsLoading(false);
            return;
          }
          setIsLoading(true);
          try {
            const contentData = await getLessonContent(lessonId);
            if (mounted) {
              if (contentData) setLessonContent(contentData.content);
              const total = parseInt(totalLessons, 10) || 1;
              await updateLessonProgress(user.uid, pathId, subjectId, lessonId, 'current', total);
              await loadChat();
            }
          } catch (error) {
            console.error("Failed to load lesson:", error);
            Alert.alert("Error", "Could not load lesson content or progress.");
          } finally {
            if (mounted) setIsLoading(false);
          }
        };
        loadLessonData();
        return () => { mounted = false; };
    }, [lessonId, user?.uid, subjectId, pathId, totalLessons, loadChat]);

    useEffect(() => {
        if (isChatPanelVisible) {
            translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
        } else {
            translateY.value = withSpring(500, { damping: 18, stiffness: 120 });
            if (messages.length > 0) runOnJS(saveChat)(messages);
            runOnJS(Keyboard.dismiss)();
            // ✨ [IMPROVEMENT] إيقاف أي عملية إرسال معلقة عند إغلاق النافذة
            handleStopGenerating();
        }
    }, [isChatPanelVisible, messages, saveChat, handleStopGenerating]);

    const gesture = Gesture.Pan()
        .onStart(() => { context.value = { y: translateY.value }; })
        .onUpdate((event) => { translateY.value = Math.max(0, context.value.y + event.translationY); })
        .onEnd(() => {
            if (translateY.value > 100) {
                runOnJS(setChatPanelVisible)(false);
            } else {
                translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
            }
        });
    const animatedPanelStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));
    
    const introMessage = useMemo(() => ({ 
        type: 'bot', 
        id: 'intro', 
        text: `Hello! I'm FAB, your AI tutor. Ask me anything about "${lessonTitle}"`,
        author: BOT_USER
    }), [lessonTitle]);

    const finalMessages = useMemo(() => messages.length === 0 ? [introMessage] : messages, [messages, introMessage]);
    
    const renderMessageItem = useCallback(({ item }) => {
        if (item.type === 'typing') return <TypingIndicator />;
        return <MessageItem message={item} />;
    }, []);


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
                    <ScrollView
                        contentContainerStyle={styles.contentContainer}
                        scrollEventThrottle={400}
                    >
                        <View style={{ writingDirection: 'rtl' }}>
                            {/* ✨ [IMPROVEMENT] استخدام Markdown للعرض الثابت أسرع من FastMarkdown */}
                            <Markdown style={markdownStyles}>{lessonContent || 'No content available.'}</Markdown>
                        </View>
                    </ScrollView>
                    
                    {/* Floating Buttons */}
                    <GenerateKitButton onPress={() => router.push({ pathname: '/study-kit', params: { lessonId, lessonTitle, subjectId, pathId } })} />
                    <FloatingActionButton onPress={() => setChatPanelVisible(true)} />

                    {/* --- النافذة الزجاجية المُحدّثة --- */}
                    <AnimatePresence>
                        {isChatPanelVisible && (
                            <Pressable style={styles.overlay} onPress={() => setChatPanelVisible(false)}>
                                <GestureDetector gesture={gesture}>
                                    <Animated.View style={[styles.chatPanelContainer, animatedPanelStyle]}>
                                        <Pressable onPress={() => { /* تمنع الإغلاق عند الضغط داخل النافذة */ }} style={{ width: '100%' }}>
                                            <BlurView
                                                intensity={Platform.OS === 'ios' ? 70 : 100}
                                                tint="dark"
                                                style={styles.glassPane}
                                            >
                                                <View style={styles.dragHandleContainer}>
                                                    <View style={styles.dragHandle} />
                                                </View>
                                                
                                                <FlatList
                                                    ref={flatListRef}
                                                    data={finalMessages}
                                                    keyExtractor={item => String(item.id)}
                                                    renderItem={renderMessageItem}
                                                    contentContainerStyle={styles.messagesListContent}
                                                    inverted
                                                    keyboardShouldPersistTaps="handled"
                                                    style={styles.messagesList}
                                                    initialNumToRender={10}
                                                    maxToRenderPerBatch={5}
                                                    windowSize={10}
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
                                                        disabled={promptText.trim().length === 0 && !isSending} // ✨ [FIXED] يمكن الضغط على stop حتى لو كان النص فارغًا
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

// --- الأنماط المُحدّثة والنهائية ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0C0F27' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
    headerIcon: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    contentContainer: { padding: 20, paddingBottom: 220 },

    // --- أنماط FlatList والرسائل (لتحقيق الأداء الخيالي) ---
    messagesList: {
        flexGrow: 0, 
        maxHeight: 220, 
        minHeight: 40,
        paddingHorizontal: 10,
    },
    messagesListContent: {
        paddingTop: 5,
        paddingBottom: 5,
    },
    botMessageWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 4, maxWidth: '85%', alignSelf: 'flex-start' },
    userMessageWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 4, maxWidth: '85%', alignSelf: 'flex-end' },
    botBubble: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, borderBottomLeftRadius: 4, padding: 10 },
    userBubble: { backgroundColor: '#3B82F6', borderRadius: 12, borderBottomRightRadius: 4, padding: 10 },
    // ✨ [IMPROVEMENT] أنماط نصوص المحادثة (عادية لـ Markdown)
    botText: { color: 'transparent', fontSize: 14 , color:"white"}, // نتركها فارغة ونستخدم FastMarkdown
    userText: { color: 'transparent', fontSize: 14, fontWeight: '500' }, // نتركها فارغة ونستخدم FastMarkdown
    // ✨ [NEW] أنماط FastMarkdownText
    botTextMarkdown: { body: { color: 'white', fontSize: 14 }, strong: { fontWeight: 'bold', color: '#34D399' } },
    userTextMarkdown: { body: { color: 'white', fontSize: 14, fontWeight: '500' }, strong: { fontWeight: 'bold', color: '#E5E7EB' } },
    
    typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9CA3AF', marginHorizontal: 3 },

    // --- أنماط النافذة المعدّلة ---
    overlay: { 
        position: 'absolute', 
        top: 0, bottom: 0, left: 0, right: 0, 
        justifyContent: 'flex-end', 
        alignItems: 'center', 
        backgroundColor: 'transparent'
    },
    chatPanelContainer: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingBottom: 120, 
        maxHeight: '80%', 
        
    },
    glassPane: {
        width: '100%',
        borderRadius: 25,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        backgroundColor: Platform.OS === 'android' ? 'rgba(30, 41, 59, 0.75)' : 'transparent',
        paddingTop: 15,
        paddingBottom: 15, 
        paddingHorizontal: 5, 
        
        shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 24,
    },
    dragHandleContainer: { alignItems: 'center', paddingVertical: 8 },
    dragHandle: { width: 40, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255, 255, 255, 0.25)' },

    promptContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        marginTop: 10,
        marginHorizontal: 10,
    },
    promptInput: {
        flex: 1,
        paddingVertical: Platform.OS === 'ios' ? 16 : 12,
        paddingHorizontal: 16,
        color: 'white',
        fontSize: 15,
    },
    sendButton: {
        padding: 16,
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        marginRight: 5,
        marginLeft: 5,
    },
});

const markdownStyles = StyleSheet.create({
    heading1: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginBottom: 15, borderBottomWidth: 1, borderColor: '#334155', paddingBottom: 10, textAlign: 'right' },
    body: { color: '#D1D5DB', fontSize: 17, lineHeight: 28, textAlign: 'right' },
    strong: { fontWeight: 'bold', color: '#10B981' },
});