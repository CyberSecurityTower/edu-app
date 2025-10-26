// components/CustomInput.jsx
import React from 'react';
import { useState, useEffect } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';

const CustomInput = ({ onSend, isEditing, onCancelEdit, initialValue = '', isSending, onStop }) => {
  const [text, setText] = useState(initialValue);

  useEffect(() => {
    setText(initialValue);
  }, [initialValue]);

  const handleSend = () => {
    if (text.trim() && !isSending) {
      onSend(text.trim());
      if (!isEditing) {
        setText('');
      }
    }
  };

  const handlePress = () => {
    if (isSending) {
      onStop();
    } else {
      handleSend();
    }
  };

  return (
    <View style={styles.outerContainer}>
      {isEditing && (
        <MotiView 
          from={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: 30 }} 
          style={styles.editingBanner}
        >
          <Pressable onPress={onCancelEdit} style={styles.cancelEditButton}>
            <FontAwesome5 name="times" size={14} color="#FCA5A5" />
          </Pressable>
        </MotiView>
      )}
      <View style={[styles.inputContainer, isEditing && styles.editingInputContainer]}>
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
          <FontAwesome5 name={isSending ? "stop" : (isEditing ? "check" : "paper-plane")} size={20} color="white" solid />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 10,
    backgroundColor: '#0C0F27',
  },
  editingBanner: {
    backgroundColor: '#452c30',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cancelEditButton: {
    padding: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 25,
    paddingLeft: 15,
    minHeight: 50,
  },
  editingInputContainer: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    borderColor: '#F87171',
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  sendButton: {
    padding: 12,
    marginLeft: 5,
  },
});

export default CustomInput;