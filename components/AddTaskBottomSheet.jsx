// components/AddTaskBottomSheet.jsx
import React, { useState, forwardRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import AnimatedGradientButton from './AnimatedGradientButton';
import { useAppState } from '../context/AppStateContext';
import { getAllSubjectsForPath, getLessonsForSubject } from '../services/firestoreService'; // دوال جديدة

// مكون القائمة المنسدلة المخصص
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
          <ScrollView nestedScrollEnabled>
            {items.map(item => (
              <Pressable key={item.id} style={styles.pickerOption} onPress={() => {
                onValueChange(item.id);
                setIsOpen(false);
              }}>
                <Text style={styles.pickerOptionText}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const AddTaskBottomSheet = forwardRef(({ onTaskUpdate, editingTask, onVisibilityChange }, ref) => {
  const { user } = useAppState();
  const [title, setTitle] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);

  const isEditing = !!editingTask;

  // جلب المواد الدراسية عند فتح الـ BottomSheet
  useEffect(() => {
    const fetchSubjects = async () => {
      if (user?.selectedPathId) {
        setIsLoadingSubjects(true);
        const fetchedSubjects = await getAllSubjectsForPath(user.selectedPathId);
        setSubjects(fetchedSubjects);
        setIsLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [user?.selectedPathId]);

  // جلب الدروس عند اختيار مادة دراسية
  useEffect(() => {
    const fetchLessons = async () => {
      if (selectedSubject && user?.selectedPathId) {
        setIsLoadingLessons(true);
        setLessons([]); // إفراغ قائمة الدروس القديمة
        setSelectedLesson(null); // إعادة تعيين الدرس المختار
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

  useEffect(() => {
    if (isEditing) {
      setTitle(editingTask.title);
      // لا يتم تحميل بيانات الربط عند التعديل للحفاظ على البساطة
      setSelectedSubject(null);
      setSelectedLesson(null);
    } else {
      // إعادة تعيين كل شيء عند إضافة مهمة جديدة
      setTitle('');
      setSelectedSubject(null);
      setSelectedLesson(null);
    }
  }, [editingTask, isEditing]);

  const handleSave = () => {
    if (title.trim().length > 0) {
      const taskData = {
        title: title.trim(),
        relatedSubjectId: selectedSubject,
        relatedLessonId: selectedLesson,
      };
      onTaskUpdate(taskData, editingTask); // إرسال كائن البيانات
      ref.current?.close();
    }
  };

  const handleSheetChanges = useCallback((index) => {
    onVisibilityChange?.(index > -1);
  }, [onVisibilityChange]);

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={['65%', '85%']} // زيادة الارتفاع لاستيعاب القوائم
      enablePanDownToClose
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
        />
        
        {/* --- NEW: Link to Lesson Section --- */}
        {!isEditing && (
          <>
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
          </>
        )}

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
  input: { backgroundColor: '#334155', color: 'white', borderRadius: 12, padding: 18, fontSize: 16, marginBottom: 15, },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingBottom: 20 },
  cancelButton: { padding: 15, },
  cancelButtonText: { color: '#9CA3AF', fontSize: 16, fontWeight: '600', },
  // Picker Styles
  pickerContainer: { marginBottom: 15, },
  pickerLabel: { color: '#9CA3AF', fontSize: 14, marginBottom: 8, },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#334155', borderRadius: 12, padding: 18, },
  pickerHeaderText: { color: 'white', fontSize: 16, },
  pickerOptionsContainer: { backgroundColor: '#334155', borderRadius: 12, marginTop: 4, maxHeight: 150, },
  pickerOption: { padding: 18, borderBottomWidth: 1, borderBottomColor: '#4B5563', },
  pickerOptionText: { color: 'white', fontSize: 16, },
});

export default AddTaskBottomSheet;