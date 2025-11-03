// components/TaskItem.jsx
import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { MotiText, MotiView } from 'moti';
import React from 'react';
import { Pressable, StyleSheet, View, Alert} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router'; 
import { useAppState } from '../context/AppStateContext';

const ICONS = {
  review: { name: 'book-reader', color: '#60A5FA' },
  quiz: { name: 'puzzle-piece', color: '#FBBF24' },
  new_lesson: { name: 'lightbulb', color: '#34D399' },
  practice: { name: 'pencil-ruler', color: '#F87171' },
  study: { name: 'brain', color: '#C084FC' },
  default: { name: 'clipboard-list', color: '#9CA3AF' },
};

const SwipeActionComponent = ({ iconName, color, align, lottieSource }) => (
    <View style={[styles.swipeAction, { backgroundColor: color, alignItems: align }]}>
      {lottieSource ? (
        <LottieView source={lottieSource} autoPlay loop={false} style={styles.lottieStyle} />
      ) : (
        <FontAwesome5 name={iconName || 'check'} size={22} color="white" />
      )}
    </View>
);

const TaskItem = ({ task, onToggleStatus, onDelete, onLongPress, onNavigate, isEditMode, isSelected, onSelect }) => {
  const isPressable = !!task.relatedLessonId || !!task.relatedSubjectId;
  const { timerSession, setTimerSession } = useAppState();
  const isCompleted = task.status === 'completed';
  const router = useRouter(); 
  
  const handleStartFocus = () => {
    if (timerSession.status === 'active' || timerSession.status === 'paused') {
      Alert.alert(
        "جلسة نشطة",
        "لديك جلسة مذاكرة أخرى قيد التشغيل. هل تريد إنهاء الجلسة الحالية وبدء جلسة جديدة؟",
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "إنهاء والبدء",
            style: "destructive",
            onPress: () => {
              setTimerSession({ status: 'finished' });
              router.push({
                pathname: '/(modals)/study-timer',
                // ✅  تمرير النوع هنا أيضاً
                params: { relatedTaskTitle: task.title, taskId: task.id, relatedTaskType: task.type }
              });
            }
          }
        ]
      );
    } else {
      router.push({
        pathname: '/(modals)/study-timer',
        // ✅  تمرير النوع هنا
        params: { relatedTaskTitle: task.title, taskId: task.id, relatedTaskType: task.type }
      });
    }
  };

  const handlePress = () => {
    if (isEditMode) {
      onSelect(task.id);
    } else if (isPressable) {
      onNavigate(task);
    }
  };

  const getIcon = () => {
    const iconConfig = ICONS[task.type] || ICONS.default;
    return <FontAwesome5 name={iconConfig.name} size={20} color={isCompleted ? '#4B5563' : iconConfig.color} />;
  };

  const iconConfig = ICONS[task.type] || ICONS.default;

  return (
    <View style={styles.outerContainer}>
      <Swipeable
        renderLeftActions={() => <SwipeActionComponent iconName="trash" color="#EF4444" align="flex-start" />}
        renderRightActions={() => <SwipeActionComponent color="#10B981" align="flex-end" lottieSource={require('../assets/images/Done.json')} />}
        onSwipeableOpen={(direction) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (direction === 'left') onDelete(task.id);
          if (direction === 'right' && !isCompleted) onToggleStatus(task.id, 'completed');
        }}
        overshootFriction={8}
        enabled={!isEditMode}
      >
        <Pressable onLongPress={() => !isEditMode && onLongPress(task)} onPress={handlePress}>
          <LinearGradient
            colors={task.isPinned ? ['#374151', '#1F2937'] : ['#1F2937', '#1F2937']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.taskContainer, isSelected && styles.selectedContainer]}
          >
            {isEditMode ? (
              <MotiView
                style={styles.checkboxBase}
                animate={{ backgroundColor: isSelected ? '#34D399' : '#374151', borderColor: isSelected ? '#34D399' : '#6B7280' }}
                transition={{ type: 'timing', duration: 200 }}
              >
                {isSelected && (
                  <MotiView from={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'timing', duration: 200 }}>
                    <FontAwesome5 name="check" size={12} color="white" />
                  </MotiView>
                )}
              </MotiView>
            ) : (
              <View style={[
                  styles.iconContainer, 
                  { backgroundColor: isCompleted ? '#1F2937' : `${iconConfig.color}25` },
                  isCompleted && styles.completedIconContainer
              ]}>
                {getIcon()}
              </View>
            )}
            <View style={styles.textContainer}>
              <MotiText
                style={[styles.taskTitle, isCompleted && styles.completedTaskTitle]}
                animate={{ textDecorationLine: isCompleted ? 'line-through' : 'none', color: isCompleted ? '#6B7280' : 'white' }}
                transition={{ type: 'timing', duration: 300 }}
              >
                {task.title}
              </MotiText>
            </View>
            {!isCompleted && !isEditMode && (
              <Pressable onPress={handleStartFocus} style={styles.focusButton}>
                <FontAwesome5 name="hourglass-start" size={18} color="#a7adb8ff" />
              </Pressable>
            )}
            {task.isPinned && !isEditMode && (
              <MotiView from={{ scale: 0 }} animate={{ scale: 1 }}>
                <FontAwesome5 name="thumbtack" size={16} color="#60A5FA" style={styles.pinIcon} />
              </MotiView>
            )}
          </LinearGradient>
        </Pressable>
      </Swipeable>
    </View>
  );
};

const styles = StyleSheet.create({
    outerContainer: { marginHorizontal: 20, marginBottom: 12, },
    swipeAction: { justifyContent: 'center', width: 100, borderRadius: 16, paddingHorizontal: 25 },
    lottieStyle: { width: 60, height: 60 },
    taskContainer: { padding: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#374151', overflow: 'hidden' },
    selectedContainer: { borderColor: '#34D399', backgroundColor: '#1f293790' },
    iconContainer: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15, },
    completedIconContainer: { borderColor: '#374151', borderWidth: 1 },
    textContainer: { flex: 1 },
    taskTitle: { color: 'white', fontSize: 16, fontWeight: '600', },
    completedTaskTitle: { color: '#6B7280', textDecorationLine: 'line-through', },
    pinIcon: { marginLeft: 10 },
    checkboxBase: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#6B7280', justifyContent: 'center', alignItems: 'center', marginRight: 15, },
    focusButton: {
        padding: 10,
        marginRight: -10,
    },
});

export default React.memo(TaskItem);