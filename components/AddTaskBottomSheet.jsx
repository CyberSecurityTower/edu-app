// components/AddTaskBottomSheet.jsx
import React, { useState, forwardRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import BottomSheet, { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import AnimatedGradientButton from './AnimatedGradientButton';

const AddTaskBottomSheet = forwardRef(({ onTaskUpdate, editingTask, onVisibilityChange }, ref) => {
  const [title, setTitle] = useState('');
  const isEditing = !!editingTask;

  useEffect(() => {
    if (isEditing) {
      setTitle(editingTask.title);
    } else {
      setTitle('');
    }
  }, [editingTask, isEditing]);

  const handleSave = () => {
    if (title.trim().length > 0) {
      onTaskUpdate(title.trim(), editingTask);
      ref.current?.close();
    }
  };

  // ✨ NEW: Callback to notify parent component about visibility changes
  const handleSheetChanges = useCallback((index) => {
    onVisibilityChange?.(index > -1); // true if sheet is open, false if closed
  }, [onVisibilityChange]);

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={['45%']}
      enablePanDownToClose
      // ✨ NEW: Added the onChange handler
      onChange={handleSheetChanges}
      backgroundComponent={({ style }) => ( <BlurView intensity={50} tint="dark" style={[style, styles.blurContainer]} /> )}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{isEditing ? 'Rename Task' : 'New Task'}</Text>
        <BottomSheetTextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Review chapter 3..."
          placeholderTextColor="#8A94A4"
          style={styles.input}
          selectTextOnFocus={isEditing}
        />
        <View style={styles.buttonContainer}>
            <Pressable onPress={() => ref.current?.close()} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <AnimatedGradientButton text={isEditing ? 'Save' : 'Add Task'} onPress={handleSave} buttonHeight={55} buttonWidth={150} />
        </View>
      </View>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  blurContainer: { backgroundColor: 'rgba(30, 41, 59, 0.85)', borderRadius: 24, overflow: 'hidden', },
  handleIndicator: { backgroundColor: '#64748B', },
  contentContainer: { flex: 1, paddingHorizontal: 25, paddingTop: 10, },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 25, },
  input: { backgroundColor: '#334155', color: 'white', borderRadius: 12, padding: 18, fontSize: 16, marginBottom: 25, },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, },
  cancelButton: { padding: 15, },
  cancelButtonText: { color: '#9CA3AF', fontSize: 16, fontWeight: '600', }
});

export default AddTaskBottomSheet;