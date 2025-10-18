
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { GiftedChat, Bubble, InputToolbar, Send, Composer, Avatar } from 'react-native-gifted-chat';
import { useAppState } from '../../context/AppStateContext';

// --- Firebase Imports ---
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';

export default function AiChatbotScreen() {
  const router = useRouter();
  const { user } = useAppState();
  const [messages, setMessages] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);

  const BOT_USER = {
    _id: 2,
    name: 'EduAI',
    avatar: require('../../assets/images/owl.png'),
  };

  useEffect(() => {
    // Initial welcome message
    setMessages([
      {
        _id: 1,
        text: `Hello ${user?.firstName || 'there'}! I'm your personal AI study assistant. How can I help you today? 🧠`,
        createdAt: new Date(),
        user: BOT_USER,
      },
    ]);
  }, []);

  // --- CLEANED AND FINAL onSend FUNCTION ---
  const onSend = useCallback((newMessages = []) => {
    // 1. Add user's message to the chat screen immediately
    setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));
    setIsBotTyping(true);

    const userMessageText = newMessages[0].text;

    // 2. Get a reference to our deployed Cloud Function
    const askEduAIFunction = httpsCallable(functions, 'askEduAI');

    // 3. Call the function with the user's message
    askEduAIFunction({ message: userMessageText })
      .then((result) => {
        // 4. When the function returns a result, create the bot's message
        const botResponse = result.data.reply;
        const botMessage = {
          _id: Math.random().toString(36).substring(7),
          text: botResponse,
          createdAt: new Date(),
          user: BOT_USER,
        };
        // 5. Add the bot's message to the screen
        setMessages(previousMessages => GiftedChat.append(previousMessages, [botMessage]));
      })
      .catch((error) => {
        console.error("Error calling Cloud Function:", error.message);
        // Handle errors gracefully by showing a user-friendly error message
        const errorMessage = {
          _id: Math.random().toString(36).substring(7),
          text: "Sorry, I'm having a little trouble connecting right now. Please try again in a moment. 🛠️",
          createdAt: new Date(),
          user: BOT_USER,
        };
        setMessages(previousMessages => GiftedChat.append(previousMessages, [errorMessage]));
      })
      .finally(() => {
        // 6. Stop the typing indicator regardless of success or failure
        setIsBotTyping(false);
      });
  }, []);

  // --- RENDER FUNCTIONS (No changes needed here) ---
  const renderBubble = (props) => ( <Bubble {...props} wrapperStyle={{ right: styles.userBubble, left: styles.botBubble }} textStyle={{ right: styles.userText, left: styles.botText }} timeTextStyle={{ right: { color: '#a7adb8ff' }, left: { color: '#a7adb8ff' } }} /> );
  const renderInputToolbar = (props) => ( <InputToolbar {...props} containerStyle={styles.inputToolbar} primaryStyle={{ alignItems: 'center' }} /> );
  const renderComposer = (props) => ( <Composer {...props} textInputStyle={styles.composer} /> );
  const renderSend = (props) => ( <Send {...props} containerStyle={styles.sendContainer}><FontAwesome5 name="paper-plane" size={22} color="#10B981" solid /></Send> );
  const renderAvatar = (props) => {
    if (props.currentMessage.user._id === BOT_USER._id) {
      return ( <Image source={props.currentMessage.user.avatar} style={styles.avatar} /> );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <FontAwesome5 name="times" size={24} color="#a7adb8ff" />
        </Pressable>
      </View>
      
      <View style={{ flex: 1 }}>
        <GiftedChat
          messages={messages}
          onSend={onSend}
          user={{ _id: user?.uid || 1 }}
          renderBubble={renderBubble}
          renderInputToolbar={renderInputToolbar}
          renderComposer={renderComposer}
          renderSend={renderSend}
          renderAvatar={renderAvatar}
          showAvatarForEveryMessage={true}
          placeholder="Ask me anything..."
          alwaysShowSend
          isTyping={isBotTyping}
          messagesContainerStyle={styles.messagesContainer}
          bottomOffset={0} 
        />
        
        {Platform.OS === 'ios' && <KeyboardAvoidingView behavior="padding" />}
      </View>
    </SafeAreaView>
  );
}

// --- STYLES (No changes needed here) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  closeButton: { padding: 5 },
  messagesContainer: { paddingBottom: 10 },
  userBubble: { backgroundColor: '#3B82F6', borderTopRightRadius: 5, borderTopLeftRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  botBubble: { backgroundColor: '#334155', borderTopLeftRadius: 5, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  userText: { color: 'white', fontSize: 16 },
  botText: { color: 'white', fontSize: 16, writingDirection: 'auto' },
  inputToolbar: { backgroundColor: '#0C0F27', borderTopWidth: 1, borderTopColor: '#1E293B', paddingVertical: 8, paddingHorizontal: 10 },
  composer: { backgroundColor: '#1E293B', borderRadius: 25, paddingHorizontal: 15, paddingTop: Platform.OS === 'ios' ? 10 : 5, paddingBottom: Platform.OS === 'ios' ? 10 : 5, color: 'white', fontSize: 16 },
  sendContainer: { justifyContent: 'center', alignItems: 'center', height: 44, width: 44, marginLeft: 5 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginBottom: 5 },
});