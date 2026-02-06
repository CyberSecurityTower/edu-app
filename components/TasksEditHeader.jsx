// components/TasksEditHeader.jsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';

const ActionButton = ({ icon, onPress, disabled = false }) => (
  <Pressable onPress={onPress} disabled={disabled} style={[styles.actionButton, disabled && styles.disabledButton]}>
    <FontAwesome5 name={icon} size={20} color={disabled ? '#6B7280' : '#E5E7EB'} />
  </Pressable>
);

const TasksEditHeader = ({ selectedCount, onCancel, onPin, onDelete, onRename }) => {
  const canRename = selectedCount === 1;

  return (
    <MotiView
      from={{ opacity: 0, translateY: -20 }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: -20 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.container}
    >
      <View style={styles.leftSection}>
        <Pressable onPress={onCancel} style={styles.cancelButton}>
          <FontAwesome5 name="times" size={24} color="#9CA3AF" />
        </Pressable>
        <Text style={styles.title}>{selectedCount} Selected</Text>
      </View>
      <View style={styles.rightSection}>
        <ActionButton icon="thumbtack" onPress={onPin} />
        <ActionButton icon="pen" onPress={onRename} disabled={!canRename} />
        <ActionButton icon="trash-alt" onPress={onDelete} />
      </View>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 70,
    paddingBottom: 20,
    marginBottom: 10,
  },
  leftSection: { flexDirection: 'row', alignItems: 'center' },
  cancelButton: { padding: 10, marginRight: 10 },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionButton: { padding: 10 },
  disabledButton: { opacity: 0.4 },
});

export default TasksEditHeader;