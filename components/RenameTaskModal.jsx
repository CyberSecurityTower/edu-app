// components/RenameTaskModal.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, Pressable, TextInput } from 'react-native';
import AnimatedGradientButton from './AnimatedGradientButton';

const RenameTaskModal = ({ isVisible, onClose, onRename, task }) => {
  const [newTitle, setNewTitle] = useState(task?.title || '');

  useEffect(() => {
    if (task) {
      setNewTitle(task.title);
    }
  }, [task]);

  const handleSave = () => {
    if (newTitle.trim().length > 0) {
      onRename(newTitle.trim());
    }
  };

  return (
    <Modal animationType="fade" transparent visible={isVisible} onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={() => {}}>
          <Text style={styles.modalTitle}>Rename Task</Text>
          <TextInput
            style={styles.modalInput}
            value={newTitle}
            onChangeText={setNewTitle}
            autoFocus
            selectTextOnFocus
          />
          <View style={styles.modalButtonContainer}>
            <Pressable style={styles.modalButton} onPress={onClose}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </Pressable>
            <AnimatedGradientButton text="Save" onPress={handleSave} buttonWidth={120} buttonHeight={45} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 25,
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#334155',
    color: 'white',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 25,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalButton: {
    padding: 15,
  },
  modalButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RenameTaskModal;