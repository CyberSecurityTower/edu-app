import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { GiftedChat, Bubble, InputToolbar, Send } from 'react-native-gifted-chat';
import { useAppState } from '../../context/AppStateContext';

export default function AiChatbotScreen() {
  const router = useRouter();
  const { user } = useAppState();
  const [messages, setMessages] = useState([]);

  // The AI bot user object
  const BOT = {
    _id: 2,
    name: 'EduAI',
    avatar: 'https://ui-avatars.com/api/?name=AI&background=8A2BE2&color=FFFFFF&size=128',
  };

  useEffect(() => {
    // Set the initial welcome message from the bot
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
    // 1. Add the user's message to the chat
    setMessages(previousMessages =>
      GiftedChat.append(previousMessages, messages),
    );

    // 2. Simulate a bot response (the "fake" logic)
    const userMessage = messages[0].text.toLowerCase();
    
    // Add a "typing..." indicator
    // This part is a bit tricky in GiftedChat, we'll keep it simple for now.

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

      setMessages(previousMessages =>
        GiftedChat.append(previousMessages, [botMessage]),
      );
    }, 1500); // Simulate a 1.5 second delay
  }, []);

  // --- Customizing the appearance ---
  const renderBubble = (props) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: { backgroundColor: '#3B82F6' }, // User's bubble
        left: { backgroundColor: '#334155' }, // Bot's bubble
      }}
      textStyle={{
        right: { color: 'white' },
        left: { color: 'white' },
      }}
    />
  );

  const renderInputToolbar = (props) => (
    <InputToolbar {...props} containerStyle={styles.inputToolbar} />
  );

  const renderSend = (props) => (
    <Send {...props} containerStyle={styles.sendContainer}>
      <FontAwesome5 name="paper-plane" size={22} color="#10B981" solid />
    </Send>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <FontAwesome5 name="times" size={24} color="#a7adb8ff" />
        </Pressable>
      </View>
      
      <GiftedChat
        messages={messages}
        onSend={messages => onSend(messages)}
        user={{ _id: user?.uid || 1 }} // Current user's ID
        renderBubble={renderBubble}
        renderInputToolbar={renderInputToolbar}
        renderSend={renderSend}
        placeholder="Ask me anything about your studies..."
        alwaysShowSend
      />
      
      {/* This is needed for iOS to not have the keyboard hide the input */}
      {Platform.OS === 'android' && <KeyboardAvoidingView behavior="padding" />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  closeButton: { padding: 5 },
  inputToolbar: {
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    padding: 5,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 5,
  },
});