// components/CustomInput.jsx
import React, { useState, useEffect } from 'react';
import { View, TextInput, Pressable, StyleSheet, Text, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';

const CustomInput = ({ 
  onSend, 
  isEditing, 
  onCancelEdit, 
  editingValue = '', 
  isSending, 
  onStop,
  replyTo,
  onCancelReply
}) => {
  const [text, setText] = useState('');

  // هذا التأثير يعمل فقط عند الدخول في وضع التعديل
  useEffect(() => {
    if (isEditing) {
      setText(editingValue);
    }
  }, [isEditing, editingValue]);

  const handleSend = () => {
    if (text.trim() && !isSending) {
      onSend(text.trim());
      // لا تقم بمسح النص عند التعديل، الشاشة الرئيسية ستفعل ذلك
      if (!isEditing) {
        setText('');
      }
    }
  };

  const handlePress = () => {
    if (isSending) onStop();
    else handleSend();
  };

  const getButtonIcon = () => {
    if (isSending) return "stop";
    if (isEditing) return "check";
    return "paper-plane";
  };

  return (
    <View style={styles.outerContainer}>
      <AnimatePresence>
        {(replyTo || isEditing) && (
          <MotiView 
            from={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }} 
            style={styles.banner}
          >
            <View style={{flex: 1}}>
              <Text style={styles.bannerTitle}>
                {isEditing ? "Editing Message" : `Replying to ${replyTo.author.firstName}`}
              </Text>
              {replyTo && <Text style={styles.bannerText} numberOfLines={1}>{replyTo.text}</Text>}
            </View>
            <Pressable onPress={isEditing ? onCancelEdit : onCancelReply} style={styles.cancelButton}>
              <FontAwesome5 name="times" size={14} color="#FCA5A5" />
            </Pressable>
          </MotiView>
        )}
      </AnimatePresence>
      <View style={[styles.inputContainer, (isEditing || replyTo) && styles.bannerActiveContainer]}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Ask EduAI anything..."
          placeholderTextColor="#8A94A4"
          multiline
          editable={!isSending}
        />
        <Pressable onPress={handlePress} style={styles.sendButton}>
          <FontAwesome5 name={getButtonIcon()} size={20} color="white" solid />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    backgroundColor: '#0C0F27',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  banner: {
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  bannerTitle: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  bannerText: { color: '#CBD5E1', fontSize: 12, marginTop: 2 },
  cancelButton: { padding: 5, marginLeft: 10 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1E293B',
    borderRadius: 25,
    paddingLeft: 20,
    minHeight: 50,
  },
  bannerActiveContainer: { borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  textInput: {
    flex: 1, color: 'white', fontSize: 16,
    paddingTop: Platform.OS === 'ios' ? 14 : 12,
    paddingBottom: Platform.OS === 'ios' ? 14 : 12,
    paddingRight: 10, maxHeight: 120,
  },
  sendButton: { padding: 15 },
});

export default CustomInput;