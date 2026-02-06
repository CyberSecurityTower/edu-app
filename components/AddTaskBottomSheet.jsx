
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, Pressable, 
  Keyboard, Platform, Dimensions, KeyboardAvoidingView 
} from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppState } from '../context/AppStateContext';
import { useLanguage } from '../context/LanguageContext';
import { MotiView } from 'moti';
import { useUIState } from '../context/UIStateContext'; // ✅ استيراد الكونتكست

const { width } = Dimensions.get('window');

export const AddTaskModal = ({ isVisible, onClose, onTaskUpdate }) => {
  const { t, isRTL } = useLanguage();
  const { optimisticAddTask } = useAppState();

  const { taskUpdateHandler } = useUIState(); 

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [scheduleDate, setScheduleDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    if (isVisible) {
      // تأخير بسيط لضمان سلاسة الأنيميشن
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isVisible]);

  const handleAddTask = () => {
    if (!title.trim()) return;
    console.log("🟢 [DEBUG] Modal: Add button pressed");

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const tempId = `temp-${Date.now()}`;
    const newTask = {
      id: tempId,
      title: title.trim(),
      priority,
      status: 'pending',
      type: 'manual',
      scheduleDate: scheduleDate ? scheduleDate.toISOString() : null,
      createdAt: new Date().toISOString(),
      isPinned: false,
    };

    optimisticAddTask({ ...newTask, id: `temp-${Date.now()}`, status: 'pending' });

    // 2. ✅✅✅ استدعاء الدالة المربوطة من صفحة المهام ✅✅✅
    if (taskUpdateHandler) {
      console.log("📞 Calling taskUpdateHandler...");
      taskUpdateHandler(newTask);
    } else {
      console.error("❌ Error: taskUpdateHandler is null! Link is broken.");
    }

    resetAndClose();
  
    if (onTaskUpdate) {
      onTaskUpdate(newTask).catch(err => console.error("Sync failed:", err));
    }
  };

  const resetAndClose = () => {
    setTitle('');
    setPriority('medium');
    setScheduleDate(null);
    onClose();
  };

  const PriorityToggle = () => {
    const nextPriority = priority === 'medium' ? 'high' : (priority === 'high' ? 'low' : 'medium');
    const color = priority === 'high' ? '#EF4444' : (priority === 'medium' ? '#F59E0B' : '#10B981');
    const icon = priority === 'high' ? 'fire' : (priority === 'medium' ? 'flag' : 'coffee');
    
    return (
      <Pressable 
        onPress={() => { Haptics.selectionAsync(); setPriority(nextPriority); }}
        style={[styles.chip, { backgroundColor: color + '20', borderColor: color }]}
      >
        <FontAwesome5 name={icon} size={12} color={color} />
        <Text style={[styles.chipText, { color }]}>
          {priority === 'high' ? 'عاجل' : (priority === 'medium' ? 'متوسط' : 'عادي')}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={resetAndClose}
      onSwipeComplete={resetAndClose}
      swipeDirection={['down']}
      style={styles.modal}
      avoidKeyboard={true} // مهم جداً لرفع المودال فوق الكيبورد
      backdropOpacity={0.4}
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
          <View style={styles.container}>
            
            {/* Header / Drag Handle */}
            <View style={styles.headerRow}>
               <View style={styles.dragHandle} />
            </View>

            {/* Input Area */}
            <View style={[styles.inputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t('taskNamePlaceholder') || "مهمة جديدة..."}
                placeholderTextColor="#64748B"
                value={title}
                onChangeText={setTitle}
                onSubmitEditing={handleAddTask}
                multiline
                maxLength={100}
              />
              
              {/* Send Button */}
              <MotiView 
                animate={{ scale: title.trim() ? 1 : 0.8, opacity: title.trim() ? 1 : 0.5 }}
              >
                <Pressable 
                    onPress={handleAddTask}
                    disabled={!title.trim()}
                    style={[styles.sendBtn, { backgroundColor: title.trim() ? '#38BDF8' : '#334155' }]}
                >
                    <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={20} color="white" />
                </Pressable>
              </MotiView>
            </View>

            {/* Tools Row */}
            <View style={[styles.toolsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                
                {/* Priority Switcher */}
                <PriorityToggle />

                {/* Date Picker */}
                <Pressable 
                    onPress={() => { Haptics.selectionAsync(); setShowDatePicker(true); }}
                    style={[styles.chip, scheduleDate && styles.activeChip]}
                >
                    <MaterialIcons name="event" size={14} color={scheduleDate ? '#38BDF8' : '#94A3B8'} />
                    <Text style={[styles.chipText, scheduleDate && { color: '#38BDF8' }]}>
                        {scheduleDate ? scheduleDate.toLocaleDateString(undefined, {month:'short', day:'numeric'}) : "اليوم"}
                    </Text>
                </Pressable>

            </View>

            {showDatePicker && (
                <DateTimePicker
                value={scheduleDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) setScheduleDate(date);
                }}
                />
            )}

          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: { 
    justifyContent: 'flex-end', 
    margin: 0,
  },
  blurContainer: { 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.85)', // خلفية شبه شفافة
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  container: { 
    padding: 16, 
    paddingBottom: Platform.OS === 'ios' ? 30 : 20 
  },
  headerRow: { alignItems: 'center', marginBottom: 10 },
  dragHandle: { 
    width: 40, 
    height: 4, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 2 
  },
  inputRow: { 
    alignItems: 'center', 
    marginBottom: 15,
    gap: 10
  },
  input: { 
    flex: 1, 
    color: 'white', 
    fontSize: 18, 
    maxHeight: 80,
    paddingVertical: 5
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolsRow: {
    alignItems: 'center',
    gap: 10
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 6
  },
  activeChip: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)'
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600'
  }
});