
// components/timer/SettingsModal.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import { FontAwesome5 } from '@expo/vector-icons';
const AVAILABLE_ICONS = [
  'brain', 'hourglass-half', 'book', 'coffee', 'leaf', 'code',
  'music', 'couch', 'dumbbell', 'pen-alt', 'laptop-code', 'atom'
];

const toMinutes = (seconds) => (seconds / 60).toString();
const toSeconds = (minutes) => (parseInt(minutes, 10) || 0) * 60;

const SessionCounter = ({ count, onCountChange }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>Number of Sessions</Text>
    <View style={styles.counterContainer}>
      <Pressable style={styles.counterButton} onPress={() => onCountChange(Math.max(1, count - 1))}>
        <FontAwesome5 name="minus" size={16} color="#E5E7EB" />
      </Pressable>
      <Text style={styles.counterText}>{count}</Text>
      <Pressable style={styles.counterButton} onPress={() => onCountChange(count + 1)}>
        <FontAwesome5 name="plus" size={16} color="#E5E7EB" />
      </Pressable>
    </View>
  </View>
);

const SettingsModal = ({ isVisible, onClose, onSave, onDelete, modeToEdit }) => {
  const [mode, setMode] = useState(null);

  useEffect(() => {
    if (modeToEdit) {
      const editableMode = JSON.parse(JSON.stringify(modeToEdit));
      if (!editableMode.settings.sessions) {
        editableMode.settings.sessions = [{ focus: 25 * 60, break: 5 * 60 }];
      }
      setMode(editableMode);
    } else {
      setMode(null);
    }
  }, [modeToEdit]);

  const handleSave = () => {
    if (!mode || mode.name.trim() === '') {
      Alert.alert('Validation Error', 'Mode name cannot be empty.');
      return;
    }
    const modeToSave = {
      key: mode.key,
      name: mode.name,
      icon: mode.icon,
      settings: {
        sessions: mode.settings.sessions,
        autoStartNextSession: true,
        enableAudioNotifications: mode.settings.enableAudioNotifications,
      }
    };
    onSave(modeToSave);
  };

  const handleDelete = () => {
    if (mode.key.startsWith('default-')) {
        Alert.alert('Cannot Delete', 'Default modes cannot be deleted.');
        return;
    }
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete "${mode.name}"?`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => onDelete(mode.key) }],
      { cancelable: true }
    );
  };
  
  const handleSessionCountChange = (newCount) => {
    setMode(prev => {
      const currentSessions = prev.settings.sessions || [];
      const lastSession = currentSessions[currentSessions.length - 1] || { focus: 25 * 60, break: 5 * 60 };
      const newSessions = [...currentSessions];
      if (newCount > currentSessions.length) {
        for (let i = currentSessions.length; i < newCount; i++) {
          newSessions.push({ ...lastSession });
        }
      } else {
        newSessions.length = newCount;
      }
      return { ...prev, settings: { ...prev.settings, sessions: newSessions } };
    });
  };

  const handleSessionValueChange = (index, type, value) => {
    setMode(prev => {
      const newSessions = [...prev.settings.sessions];
      newSessions[index] = { ...newSessions[index], [type]: toSeconds(value) };
      return { ...prev, settings: { ...prev.settings, sessions: newSessions } };
    });
  };

  if (!mode) return null;

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
          <Pressable style={styles.modalBackdrop} onPress={onClose}>
            {/* ✅ FIX: onStartShouldSetResponder is moved here to correctly handle touch events and fix scrolling. */}
            <MotiView
              from={{ opacity: 0, scale: 0.8, translateY: 50 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={styles.motiViewContainer}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalContainer}>
                {/* The main content is now a View, not a ScrollView */}
                <View style={styles.contentContainer}>
                  <Text style={styles.modalTitle}>{mode.key.startsWith('custom') ? 'New Mode' : 'Edit Mode'}</Text>
                  
                  <TextInput
                    style={[styles.input, styles.modeNameInput]}
                    value={mode.name}
                    onChangeText={(text) => setMode(prev => ({ ...prev, name: text }))}
                    placeholder="Mode Name"
                    placeholderTextColor="#9CA3AF"
                  />
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Icon</Text>
                    <View style={styles.iconGrid}>
                      {AVAILABLE_ICONS.map(iconName => (
                        <Pressable key={iconName} style={[styles.iconButton, mode.icon === iconName && styles.iconButtonActive]} onPress={() => setMode(prev => ({ ...prev, icon: iconName }))}>
                          <FontAwesome5 name={iconName} size={22} color={mode.icon === iconName ? '#FFFFFF' : '#E5E7EB'} />
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <SessionCounter count={mode.settings.sessions.length} onCountChange={handleSessionCountChange} />

                  {/* ✅ NEW: A dedicated, height-limited ScrollView for the sessions list */}
                  <ScrollView style={styles.sessionsList} nestedScrollEnabled={true}>
                    {mode.settings.sessions.map((session, index) => (
                      <View key={index} style={styles.sessionRow}>
                        <Text style={styles.sessionLabel}>Session {index + 1}</Text>
                        <View style={styles.sessionInputContainer}>
                          <View style={styles.inputGroup}>
                            <Text style={styles.sessionInputLabel}>Focus (min)</Text>
                            <TextInput style={styles.sessionInput} value={toMinutes(session.focus)} onChangeText={(text) => handleSessionValueChange(index, 'focus', text)} keyboardType="numeric" />
                          </View>
                          <View style={styles.inputGroup}>
                            <Text style={styles.sessionInputLabel}>Break (min)</Text>
                            <TextInput style={styles.sessionInput} value={toMinutes(session.break)} onChangeText={(text) => handleSessionValueChange(index, 'break', text)} keyboardType="numeric" />
                          </View>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.buttonRow}>
                  {!mode.key.startsWith('default-') && (
                     <Pressable style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
                        <FontAwesome5 name="trash" size={16} color="#F87171" />
                     </Pressable>
                  )}
                  <Pressable style={[styles.button, styles.saveButton]} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </Pressable>
                </View>
              </View>
            </MotiView>
          </Pressable>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  motiViewContainer: { width: '92%', maxHeight: '85%' },
  modalContainer: { backgroundColor: 'rgba(30, 41, 59, 0.95)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden', flexShrink: 1 },
  // ✅ NEW: A container for the main content area
  contentContainer: { padding: 25 },
  modalTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  modeNameInput: { marginBottom: 18, textAlign: 'center', fontSize: 18, padding: 16 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { color: '#9CA3AF', fontSize: 14, marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 10, padding: 14, color: 'white', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconButton: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 2, borderColor: 'transparent' },
  iconButtonActive: { borderColor: '#34D399', backgroundColor: 'rgba(52, 211, 153, 0.2)' },
  counterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 10, padding: 8, marginBottom: 15 },
  counterButton: { padding: 10, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  counterText: { color: 'white', fontSize: 20, fontWeight: 'bold', marginHorizontal: 20 },
  
  // ✅ NEW: Style for the scrollable sessions list
  sessionsList: {
    maxHeight: 150, // Height for approx 1.5 items
    marginHorizontal: -10, // Offset padding for better scroll appearance
    paddingHorizontal: 10,
  },
  sessionRow: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, padding: 15, marginBottom: 12 },
  sessionLabel: { color: 'white', fontWeight: '600', marginBottom: 10 },
  sessionInputContainer: { flexDirection: 'row', gap: 10 },
  inputGroup: { flex: 1 },
  sessionInputLabel: { color: '#9CA3AF', fontSize: 13, marginBottom: 6, textAlign: 'center' },
  sessionInput: { backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: 8, padding: 12, color: 'white', fontSize: 16, textAlign: 'center' },
  
  buttonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 25, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(30, 41, 59, 0.95)' },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  deleteButton: { backgroundColor: 'rgba(248, 113, 113, 0.1)', marginRight: 'auto', paddingHorizontal: 20 },
  saveButton: { backgroundColor: '#10B981', flex: 1, marginLeft: 10 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default SettingsModal;