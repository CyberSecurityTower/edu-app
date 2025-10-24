// components/AddTaskBottomSheet.jsx
import React from 'react';
import { useState, forwardRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Keyboard } from 'react-native';
import BottomSheet, { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import AnimatedGradientButton from './AnimatedGradientButton';
import { useAppState } from '../context/AppStateContext';
import { getAllSubjectsForPath, getLessonsForSubject } from '../services/firestoreService';

const CustomPicker = ({ label, items, selectedValue, onValueChange, placeholder, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = items.find(item => item.id === selectedValue)?.name || placeholder;

  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <Pressable style={styles.pickerHeader} onPress={() => !isLoading && setIsOpen(!isOpen)}>
        <Text style={styles.pickerHeaderText}>{selectedLabel}</Text>
        {isLoading ? <ActivityIndicator size="small" color="#9CA3AF" /> : <FontAwesome5 name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" />}
      </Pressable>
      {isOpen && (
        <View style={styles.pickerOptionsContainer}>
          <BottomSheetScrollView nestedScrollEnabled>
            {items.map(item => (
              <Pressable key={item.id} style={styles.pickerOption} onPress={() => {
                onValueChange(item.id);
                setIsOpen(false);
              }}>
                <Text style={styles.pickerOptionText}>{item.name}</Text>
              </Pressable>
            ))}
          </BottomSheetScrollView>
        </View>
      )}
    </View>
  );
};

const AddTaskBottomSheet = forwardRef(({ onTaskUpdate, onVisibilityChange }, ref) => {
  const { user } = useAppState();
  const [title, setTitle] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);

  const snapPoints = useMemo(() => ['50%', '85%'], []);

  const resetState = useCallback(() => {
    setTitle('');
    setSelectedSubject(null);
    setSelectedLesson(null);
    setLessons([]);
  }, []);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (user?.selectedPathId) {
        setIsLoadingSubjects(true);
        const fetchedSubjects = await getAllSubjectsForPath(user.selectedPathId);
        setSubjects(fetchedSubjects);
        setIsLoadingSubjects(false);
      }
    };
    // استدعاء الدالة فقط إذا كان هناك مستخدم ومسار محدد
    if (user?.selectedPathId) {
        fetchSubjects();
    }
  }, [user?.selectedPathId]);

  useEffect(() => {
    const fetchLessons = async () => {
      if (selectedSubject && user?.selectedPathId) {
        setIsLoadingLessons(true);
        setLessons([]);
        setSelectedLesson(null);
        const fetchedLessons = await getLessonsForSubject(user.selectedPathId, selectedSubject);
        setLessons(fetchedLessons);
        setIsLoadingLessons(false);
      } else {
        setLessons([]);
        setSelectedLesson(null);
      }
    };
    fetchLessons();
  }, [selectedSubject, user?.selectedPathId]);

  const handleSave = () => {
    if (title.trim().length > 0) {
      const taskData = {
        title: title.trim(),
        relatedSubjectId: selectedSubject,
        relatedLessonId: selectedLesson,
      };
      onTaskUpdate(taskData);
      ref.current?.close();
    }
  };

  const handleSheetChanges = useCallback((index) => {
    onVisibilityChange?.(index > -1);
    if (index === -1) {
      resetState();
      Keyboard.dismiss();
    }
  }, [onVisibilityChange, resetState]);

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleSheetChanges}
      backgroundComponent={({ style }) => ( <BlurView intensity={50} tint="dark" style={[style, styles.blurContainer]} /> )}
      handleIndicatorStyle={styles.handleIndicator}
      keyboardBlurBehavior="restore"
    >
      <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>New Task</Text>
        <BottomSheetTextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Review chapter 3..."
          placeholderTextColor="#8A94A4"
          style={styles.input}
        />
        
        <CustomPicker
          label="Link to Subject (Optional)"
          items={subjects}
          selectedValue={selectedSubject}
          onValueChange={setSelectedSubject}
          placeholder="Select a subject"
          isLoading={isLoadingSubjects}
        />
        {selectedSubject && (
          <CustomPicker
            label="Link to Lesson (Optional)"
            items={lessons}
            selectedValue={selectedLesson}
            onValueChange={setSelectedLesson}
            placeholder="Select a lesson"
            isLoading={isLoadingLessons}
          />
        )}

        <View style={styles.buttonContainer}>
            <Pressable onPress={() => ref.current?.close()} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <AnimatedGradientButton text={'Add Task'} onPress={handleSave} buttonHeight={55} buttonWidth={150} />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  blurContainer: { backgroundColor: 'rgba(30, 41, 59, 0.85)', borderRadius: 24, overflow: 'hidden', },
  handleIndicator: { backgroundColor: '#64748B', },
  contentContainer: { flexGrow: 1, paddingHorizontal: 25, paddingBottom: 40 },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 25, },
  input: { backgroundColor: '#334155', color: 'white', borderRadius: 12, padding: 18, fontSize: 16, marginBottom: 15, },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  cancelButton: { padding: 15, },
  cancelButtonText: { color: '#9CA3AF', fontSize: 16, fontWeight: '600', },
  pickerContainer: { 
    marginBottom: 15, 
    zIndex: 1000, // ✨ --- الإصلاح الحاسم هنا --- ✨
  },
  pickerLabel: { color: '#9CA3AF', fontSize: 14, marginBottom: 8, },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#334155', borderRadius: 12, padding: 18, },
  pickerHeaderText: { color: 'white', fontSize: 16, },
  pickerOptionsContainer: { 
    backgroundColor: '#334155', 
    borderRadius: 12, 
    marginTop: 4, 
    maxHeight: 150,
    // ✨ --- إضافة مهمة لضمان الظهور فوق كل شيء --- ✨
    position: 'absolute',
    top: 80, // يجب أن يكون بعد ارتفاع الـ header الخاص بالـ picker
    width: '100%',
    elevation: 5, // for Android
    zIndex: 2000, // zIndex أعلى لضمان الظهور
  },
  pickerOption: { padding: 18, borderBottomWidth: 1, borderBottomColor: '#4B5563', },
  pickerOptionText: { color: 'white', fontSize: 16, },
});

export default AddTaskBottomSheet;