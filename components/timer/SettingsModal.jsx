
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

const SettingsInput = ({ label, value, onChangeText, keyboardType = 'numeric' }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholderTextColor="#9CA3AF"
    />
  </View>
);

const SettingsModal = ({ isVisible, onClose, onSave, onDelete, modeToEdit }) => {
  const [mode, setMode] = useState(null);

  useEffect(() => {
    if (modeToEdit) {
      const editableMode = JSON.parse(JSON.stringify(modeToEdit));
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
    onSave(mode);
  };

  const handleDelete = () => {
    if (mode.key.startsWith('default-')) {
        Alert.alert('Cannot Delete', 'Default modes cannot be deleted.');
        return;
    }
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete "${mode.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(mode.key) },
      ],
      { cancelable: true }
    );
  };

  const updateSetting = (key, value) => {
    setMode(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value },
    }));
  };

  if (!mode) return null;

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
          <Pressable style={styles.modalBackdrop} onPress={onClose}>
            <MotiView
              from={{ opacity: 0, scale: 0.8, translateY: 50 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onStartShouldSetResponder={() => true}
              style={styles.motiViewContainer} // ✅ Use a style here to control layout
            >
              {/* ✅ Main container for content and buttons */}
              <View style={styles.modalContainer}>
                {/* ✅ Scrollable content area */}
                <ScrollView
                  style={styles.scrollArea}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.modalTitle}>{mode.key.startsWith('custom') ? 'New Mode' : 'Edit Mode'}</Text>
                  
                  <SettingsInput
                    label="Mode Name"
                    value={mode.name}
                    onChangeText={(text) => setMode(prev => ({ ...prev, name: text }))}
                    keyboardType="default"
                  />
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Icon</Text>
                    <View style={styles.iconGrid}>
                      {AVAILABLE_ICONS.map((iconName) => {
                        const isActive = mode.icon === iconName;
                        return (
                          <Pressable
                            key={iconName}
                            style={[styles.iconButton, isActive && styles.iconButtonActive]}
                            onPress={() => setMode(prev => ({ ...prev, icon: iconName }))}
                          >
                            <FontAwesome5 name={iconName} size={22} color={isActive ? '#FFFFFF' : '#E5E7EB'} />
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <SettingsInput
                    label="Focus Duration (minutes)"
                    value={toMinutes(mode.settings.focusDuration)}
                    onChangeText={(text) => updateSetting('focusDuration', toSeconds(text))}
                  />
                  <SettingsInput
                    label="Short Break (minutes)"
                    value={toMinutes(mode.settings.shortBreakDuration)}
                    onChangeText={(text) => updateSetting('shortBreakDuration', toSeconds(text))}
                  />
                  <SettingsInput
                    label="Long Break (minutes)"
                    value={toMinutes(mode.settings.longBreakDuration)}
                    onChangeText={(text) => updateSetting('longBreakDuration', toSeconds(text))}
                  />
                  <SettingsInput
                    label="Sessions per Cycle"
                    value={mode.settings.pomodorosPerCycle.toString()}
                    onChangeText={(text) => updateSetting('pomodorosPerCycle', parseInt(text, 10) || 1)}
                  />
                </ScrollView>

                {/* ✅ FIXED Button area, outside of the ScrollView */}
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  // ✅ NEW: Style for MotiView to constrain size
  motiViewContainer: {
    width: '92%',
    maxHeight: '85%',
  },
  // ✅ MODIFIED: This is now the main wrapper for scroll + buttons
  modalContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden', // Important to keep rounded corners
    flexShrink: 1, // Ensure it doesn't grow beyond maxHeight
  },
  // ✅ NEW: Style for the scrollable part
  scrollArea: {
    flexGrow: 0,
  },
  // ✅ NEW: Padding is now applied here
  scrollContent: {
    padding: 25,
  },
  modalTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 25,
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 14,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconButtonActive: {
    borderColor: '#34D399',
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
  },
  // ✅ MODIFIED: This is now the fixed bottom bar
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(30, 41, 59, 0.95)', // Match modal background
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    marginRight: 'auto',
    paddingHorizontal: 20,
  },
  saveButton: {
    backgroundColor: '#10B981',
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SettingsModal;