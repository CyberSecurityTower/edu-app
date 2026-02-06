// components/SmartAddTaskModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Modal, View, Text, TextInput, Pressable, StyleSheet, 
  Switch, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, 
  Keyboard, Alert, ScrollView, ActivityIndicator 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MotiView, AnimatePresence } from 'moti';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';

// الخدمات
import { getAllSubjectsForPath, getLessonsForSubject } from '../services/supabaseService';

// قاموس الترجمة الداخلي
const TRANSLATIONS = {
  ar: {
    newTask: 'مهمة جديدة ✨',
    titlePlaceholder: 'ماذا تريد أن تنجز اليوم؟',
    linkSubject: 'ربط بمادة (اختياري)',
    selectLesson: 'اختر الدرس',
    reminder: 'تذكير',
    remindMe: 'ذكرني في الموعد',
    saveTask: 'حفظ المهمة',
    error: 'خطأ',
    missingTitle: 'يرجى كتابة عنوان للمهمة',
    invalidDate: 'الوقت المحدد قد مضى!',
    noSubjects: 'لا توجد مواد متاحة',
    noLessons: 'لا توجد دروس',
    loading: 'جاري التحميل...',
    changeTime: 'تغيير الوقت والتاريخ 📅',
    at: 'في تمام الساعة',
  },
  en: {
    newTask: 'New Task ✨',
    titlePlaceholder: 'What do you want to achieve?',
    linkSubject: 'Link Subject (Optional)',
    selectLesson: 'Select Lesson',
    reminder: 'Reminder',
    remindMe: 'Remind me',
    saveTask: 'Save Task',
    error: 'Error',
    missingTitle: 'Please enter a task title',
    invalidDate: 'Selected time has passed!',
    noSubjects: 'No subjects found',
    noLessons: 'No lessons found',
    loading: 'Loading...',
    changeTime: 'Change Time & Date 📅',
    at: 'at',
  },
  fr: {
    newTask: 'Nouvelle Tâche ✨',
    titlePlaceholder: 'Que voulez-vous accomplir ?',
    linkSubject: 'Lier une matière (Optionnel)',
    selectLesson: 'Choisir une leçon',
    reminder: 'Rappel',
    remindMe: 'Rappel-moi',
    saveTask: 'Enregistrer',
    error: 'Erreur',
    missingTitle: 'Veuillez entrer un titre',
    invalidDate: 'Le temps sélectionné est passé !',
    noSubjects: 'Aucune matière trouvée',
    noLessons: 'Aucune leçon trouvée',
    loading: 'Chargement...',
    changeTime: 'Changer l\'heure et la date 📅',
    at: 'à',
  }
};

export default function SmartAddTaskModal({ isVisible, onClose, onAddTask, language = 'ar', pathId }) {
  // الحالة (State)
  const [title, setTitle] = useState('');
  const [hasReminder, setHasReminder] = useState(false);
  const [date, setDate] = useState(new Date());
  
  // بيانات Supabase
  const [subjects, setSubjects] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);

  // الاختيارات
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Android Picker
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');

  // النصوص المترجمة
  const t = useMemo(() => TRANSLATIONS[language] || TRANSLATIONS.en, [language]);
  const isRTL = language === 'ar';

  // عند فتح المودال
  useEffect(() => {
    if (isVisible) {
      setTitle('');
      setHasReminder(false);
      setSelectedSubject(null);
      setSelectedLesson(null);
      setLessons([]);
      
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      setDate(nextHour);

      loadSubjects();
    }
  }, [isVisible, pathId]);

  // دالة جلب المواد
  const loadSubjects = async () => {
    if (!pathId) return;
    setLoadingSubjects(true);
    try {
      const data = await getAllSubjectsForPath(pathId);
      setSubjects(data || []);
    } catch (e) {
      console.error("Failed to load subjects", e);
    } finally {
      setLoadingSubjects(false);
    }
  };

  // اختيار المادة
  const handleSelectSubject = async (subject) => {
    Haptics.selectionAsync();
    if (selectedSubject?.id === subject.id) {
      setSelectedSubject(null);
      setSelectedLesson(null);
      setLessons([]);
    } else {
      setSelectedSubject(subject);
      setSelectedLesson(null);
      
      // جلب الدروس
      setLoadingLessons(true);
      try {
        // نمرر null للمسار لأننا نحتاج فقط معرف المادة هنا، أو حسب تصميم الدالة في السيرفس
        const lessonData = await getLessonsForSubject(pathId, subject.id);
        setLessons(lessonData || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingLessons(false);
      }
    }
  };

  const handleSelectLesson = (lesson) => {
    Haptics.selectionAsync();
    setSelectedLesson(selectedLesson?.id === lesson.id ? null : lesson);
  };

  const handleToggleReminder = async (value) => {
    Haptics.selectionAsync();
    if (value) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') return;
      }
      setHasReminder(true);
    } else {
      setHasReminder(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) {
      if (Platform.OS === 'android' && pickerMode === 'date') {
        setDate(selectedDate);
        setPickerMode('time');
        setTimeout(() => setShowPicker(true), 100);
      } else {
        setDate(selectedDate);
      }
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t.error, t.missingTitle);
      return;
    }

    if (hasReminder && date < new Date()) {
      Alert.alert(t.error, t.invalidDate);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    onAddTask({
      title,
      dueDate: hasReminder ? date.toISOString() : null,
      hasReminder,
      subject: selectedSubject,
      lesson: selectedLesson,
    });
    
    onClose();
  };

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <View style={styles.overlay}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
          
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <MotiView 
                from={{ translateY: 300, opacity: 0 }}
                animate={{ translateY: 0, opacity: 1 }}
                exit={{ translateY: 300, opacity: 0 }}
                transition={{ type: 'spring', damping: 18 }}
                style={styles.container}
              >
                {/* المقبض العلوي */}
                <View style={styles.handleBar} />
                
                <Text style={styles.headerTitle}>{t.newTask}</Text>

                {/* حقل الإدخال */}
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                    placeholder={t.titlePlaceholder}
                    placeholderTextColor="#64748B"
                    value={title}
                    onChangeText={setTitle}
                    autoFocus
                  />
                </View>

                {/* قسم المواد */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t.linkSubject}</Text>
                  
                  {loadingSubjects ? (
                    <ActivityIndicator color="#38BDF8" style={{ alignSelf: isRTL ? 'flex-end' : 'flex-start' }} />
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      {subjects.map((sub) => {
                        const isActive = selectedSubject?.id === sub.id;
                        const color = sub.color || '#64748B';
                        return (
                          <Pressable 
                            key={sub.id} 
                            onPress={() => handleSelectSubject(sub)}
                            style={[
                              styles.chip, 
                              isActive && { backgroundColor: color, borderColor: color }
                            ]}
                          >
                            <View style={[styles.dot, { backgroundColor: isActive ? '#fff' : color }]} />
                            <Text style={[styles.chipText, isActive && styles.activeChipText]}>{sub.name}</Text>
                          </Pressable>
                        );
                      })}
                      {subjects.length === 0 && <Text style={styles.emptyText}>{t.noSubjects}</Text>}
                    </ScrollView>
                  )}
                </View>

                {/* قسم الدروس (يظهر عند اختيار مادة) */}
                <AnimatePresence>
                  {selectedSubject && (
                    <MotiView 
                      from={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      exit={{ opacity: 0, height: 0 }}
                      style={styles.section}
                    >
                      <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left', fontSize: 13, color: '#94A3B8' }]}>
                        {language === 'ar' ? `دروس مادة: ${selectedSubject.name}` : `${selectedSubject.name} Lessons`}
                      </Text>

                      {loadingLessons ? (
                        <ActivityIndicator color="#94A3B8" size="small" style={{ alignSelf: isRTL ? 'flex-end' : 'flex-start' }} />
                      ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          {lessons.length > 0 ? lessons.map((les) => (
                            <Pressable 
                              key={les.id} 
                              onPress={() => handleSelectLesson(les)}
                              style={[
                                styles.chip, styles.lessonChip,
                                selectedLesson?.id === les.id && { backgroundColor: '#334155', borderColor: '#94A3B8' }
                              ]}
                            >
                              <Text style={[styles.chipText, { fontSize: 13 }, selectedLesson?.id === les.id && styles.activeChipText]}>
                                {les.name}
                              </Text>
                            </Pressable>
                          )) : (
                            <Text style={styles.emptyText}>{t.noLessons}</Text>
                          )}
                        </ScrollView>
                      )}
                    </MotiView>
                  )}
                </AnimatePresence>

                {/* التذكير */}
                <View style={[styles.reminderCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.reminderLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.iconBox, hasReminder && { backgroundColor: '#38BDF8' }]}>
                      <Ionicons name="notifications" size={18} color={hasReminder ? "#fff" : "#94A3B8"} />
                    </View>
                    <Text style={[styles.reminderText, hasReminder && { color: 'white' }]}>{t.remindMe}</Text>
                  </View>
                  <Switch
                    value={hasReminder}
                    onValueChange={handleToggleReminder}
                    trackColor={{ false: "#334155", true: "#0EA5E9" }}
                    thumbColor="#fff"
                  />
                </View>

                {/* اختيار الوقت */}
                <AnimatePresence>
                  {hasReminder && (
                    <MotiView 
                      from={{ opacity: 0, scale: 0.95 }} 
                      animate={{ opacity: 1, scale: 1 }}
                      style={styles.dateSection}
                    >
                      {Platform.OS === 'ios' ? (
                         <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
                            <Text style={{color: '#94A3B8'}}>{t.at}</Text>
                            <DateTimePicker
                              value={date}
                              mode="datetime"
                              display="compact"
                              onChange={onDateChange}
                              themeVariant="dark"
                              minimumDate={new Date()}
                              locale={language}
                            />
                         </View>
                      ) : (
                        <Pressable onPress={() => { setPickerMode('date'); setShowPicker(true); }} style={styles.androidDateBtn}>
                          <Text style={styles.androidDateText}>{t.changeTime}</Text>
                          <Text style={styles.androidDateValue}>
                            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                          </Text>
                        </Pressable>
                      )}
                    </MotiView>
                  )}
                </AnimatePresence>

                {/* زر الحفظ */}
                <Pressable onPress={handleSave} style={{ marginTop: 20 }}>
                  <LinearGradient
                    colors={['#3B82F6', '#2DD4BF']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.saveButton}
                  >
                    <Text style={styles.saveButtonText}>{t.saveTask}</Text>
                    <FontAwesome5 name="check" size={16} color="#fff" />
                  </LinearGradient>
                </Pressable>

                {/* Android Picker Hidden */}
                {Platform.OS === 'android' && showPicker && (
                  <DateTimePicker value={date} mode={pickerMode} display="default" onChange={onDateChange} minimumDate={new Date()} />
                )}

              </MotiView>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  keyboardView: { width: '100%' },
  container: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 25,
  },
  handleBar: { width: 40, height: 5, backgroundColor: '#334155', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  inputWrapper: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  input: { color: 'white', fontSize: 17, fontWeight: '500' },
  section: { marginBottom: 16 },
  sectionTitle: { color: '#94A3B8', fontSize: 14, fontWeight: '600', marginBottom: 10, paddingHorizontal: 4 },
  scrollContent: { paddingHorizontal: 2, gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  lessonChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderStyle: 'dashed' },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 6 },
  chipText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
  activeChipText: { color: '#fff', fontWeight: '700' },
  emptyText: { color: '#475569', fontSize: 13, fontStyle: 'italic', marginHorizontal: 5 },
  reminderCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155'
  },
  reminderLeft: { alignItems: 'center', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  reminderText: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
  dateSection: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    alignItems: 'center'
  },
  androidDateBtn: { alignItems: 'center', gap: 5 },
  androidDateText: { color: '#38BDF8', fontWeight: 'bold' },
  androidDateValue: { color: '#E2E8F0', fontSize: 13 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 20,
    gap: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});