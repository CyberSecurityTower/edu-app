import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, Image } from 'react-native'; // Import Image
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { GiftedChat, Bubble, InputToolbar, Send, Composer, Avatar } from 'react-native-gifted-chat'; // Import Avatar
import { useAppState } from '../../context/AppStateContext';

export default function AiChatbotScreen() {
  const router = useRouter();
  const { user } = useAppState();
  const [messages, setMessages] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);

  const BOT = {
    _id: 2,
    name: 'EduAI',
    avatar: require('../../assets/images/owl.png'),
  };

  useEffect(() => { /* ... (no changes here) ... */ }, []);
  const onSend = useCallback((messages = []) => { /* ... (no changes here) ... */ }, []);

  const renderBubble = (props) => ( <Bubble {...props} wrapperStyle={{ right: styles.userBubble, left: styles.botBubble }} textStyle={{ right: styles.userText, left: styles.botText }} /> );
  const renderInputToolbar = (props) => ( <InputToolbar {...props} containerStyle={styles.inputToolbar} primaryStyle={{ alignItems: 'center' }} /> );
  const renderComposer = (props) => ( <Composer {...props} textInputStyle={styles.composer} /> );
  const renderSend = (props) => ( <Send {...props} containerStyle={styles.sendContainer}><FontAwesome5 name="paper-plane" size={22} color="#10B981" solid /></Send> );

  // --- THE FIX IS HERE (Part 1): Create a custom avatar renderer ---
  const renderAvatar = (props) => {
    // We don't want to show an avatar for the user's messages
    if (props.currentMessage.user._id === (user?.uid || 1)) {
      return null;
    }
    // For the bot, we render the Avatar component with a custom size
    return (
      <Avatar
        {...props}
        imageStyle={{
          left: {
            width: 44,  // New width (default is 36)
            height: 44, // New height (default is 36)
            borderRadius: 22, // Half of the width/height
          }
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <FontAwesome5 name="times" size={24} color="#a7adb8ff" />
          </Pressable>
        </View>
        
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
          bottomOffset={0}
          // --- THE FIX IS HERE (Part 2): Pass the custom renderer ---
          renderAvatar={renderAvatar}
          // Align the bot's message bubble with the top of the avatar
          alignTop
        />
        
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