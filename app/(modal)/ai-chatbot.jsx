import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Import from here
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { GiftedChat, Bubble, InputToolbar, Send, Composer } from 'react-native-gifted-chat';
import { useAppState } from '../../context/AppStateContext';

export default function AiChatbotScreen() {
  const router = useRouter();
  const { user } = useAppState();
  const [messages, setMessages] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);

  const BOT = {
    _id: 2,
    name: 'EduAI',
    avatar: 'https://ui-avatars.com/api/?name=AI&background=8A2BE2&color=FFFFFF&size=128',
  };

  useEffect(() => {
    setMessages([
      {
        _id: 1,
        text: `Hello ${user?.firstName}! I'm your personal AI study assistant. How can I help you today?`,
        createdAt: new Date(),
        user: BOT,
      },
    ]);
  }, []);

  const onSend = useCallback((messages = []) => {
    setMessages(previousMessages => GiftedChat.append(previousMessages, messages));
    setIsBotTyping(true);

    const userMessage = messages[0].text.toLowerCase();
    
    setTimeout(() => {
      let botResponse = "I'm still learning! Soon I'll be able to answer your questions about any lesson.";
      if (userMessage.includes('summary')) {
        botResponse = "I can help with that! Which lesson would you like me to summarize?";
      } else if (userMessage.includes('quiz')) {
        botResponse = "Quizzes are a great way to study! Tell me the topic, and I'll create one for you soon.";
      }

      const botMessage = {
        _id: Math.random().toString(36).substring(7),
        text: botResponse,
        createdAt: new Date(),
        user: BOT,
      };
      
      setIsBotTyping(false);
      setMessages(previousMessages => GiftedChat.append(previousMessages, [botMessage]));
    }, 2000);
  }, []);

  const renderBubble = (props) => ( <Bubble {...props} wrapperStyle={{ right: styles.userBubble, left: styles.botBubble }} textStyle={{ right: styles.userText, left: styles.botText }} timeTextStyle={{ right: { color: '#a7adb8ff' }, left: { color: '#a7adb8ff' } }} /> );
  const renderInputToolbar = (props) => ( <InputToolbar {...props} containerStyle={styles.inputToolbar} primaryStyle={{ alignItems: 'center' }} /> );
  const renderComposer = (props) => ( <Composer {...props} textInputStyle={styles.composer} /> );
  const renderSend = (props) => ( <Send {...props} containerStyle={styles.sendContainer}><FontAwesome5 name="paper-plane" size={22} color="#10B981" solid /></Send> );

  return (
    // --- THE FINAL FIX IS HERE ---
    // 1. Use SafeAreaView with flex: 1 and ignore the bottom edge
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <FontAwesome5 name="times" size={24} color="#a7adb8ff" />
        </Pressable>
      </View>
      
      {/* 2. Wrap GiftedChat in a simple View with flex: 1 */}
      <View style={{ flex: 1 }}>
        <GiftedChat
          messages={messages}
          onSend={onSend}
          user={{ _id: user?.uid || 1 }}
          renderBubble={renderBubble}
          renderInputToolbar={renderInputToolbar}
          renderComposer={renderComposer}
          renderSend={renderSend}
          placeholder="Ask me anything..."
          alwaysShowSend
          isTyping={isBotTyping}
          messagesContainerStyle={styles.messagesContainer}
          // This tells GiftedChat not to add its own bottom offset
          bottomOffset={0} 
        />
        
        {/* 3. Let KeyboardAvoidingView handle the bottom padding */}
        {Platform.OS === 'ios' && <KeyboardAvoidingView behavior="padding" />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1, 
    borderBottomColor: '#1E293B',
  },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  closeButton: { padding: 5 },
  
  messagesContainer: {
    paddingBottom: 10,
  },
  userBubble: {
    backgroundColor: '#3B82F6',
    borderTopRightRadius: 5,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  botBubble: {
    backgroundColor: '#334155',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  userText: { color: 'white', fontSize: 16 },
  botText: { color: 'white', fontSize: 16, writingDirection: 'auto' },
  inputToolbar: {
    backgroundColor: '#0C0F27',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  composer: {
    backgroundColor: '#1E293B',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 10 : 5,
    paddingBottom: Platform.OS === 'ios' ? 10 : 5,
    color: 'white',
    fontSize: 16,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    height: '10%',
  },
});