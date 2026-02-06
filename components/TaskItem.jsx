import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../context/LanguageContext';

const TaskItem = ({ 
  task, 
  onToggleStatus, 
  onNavigate, 
  isEditMode, 
  isSelected, 
  onSelect, 
  onLongPress 
}) => {
  const { isRTL, language } = useLanguage();

  const displayTitle = task.title || "Untitled Task";
  const isCompleted = task.status === 'completed';
  const hasTime = !!task.dueDate || !!task.due_date;
  const dueDateVal = task.dueDate || task.due_date;

  const subjectName = 
      task.meta?.subject?.name || 
      task.subject?.name || 
      task.subject_name || 
      null;

  const lessonName = 
      task.meta?.lesson?.name || 
      task.lesson?.name || 
      task.lesson_title || 
      null;

  const hasLink = !!(subjectName || lessonName);

  const timeString = useMemo(() => {
    if (!hasTime || !dueDateVal) return '';
    const date = new Date(dueDateVal);
    return date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
  }, [dueDateVal, hasTime, language]);

  const handleCheckboxPress = () => {
    Haptics.selectionAsync();
    if (isEditMode) {
      onSelect(task.id);
    } else {
      onToggleStatus(task.id, task.status);
    }
  };

  const handleCardPress = () => {
    if (isEditMode) {
      handleCheckboxPress();
    } else {
      if (!isCompleted && hasLink) {
          const taskWithMeta = {
              ...task,
              lesson: task.lesson || task.meta?.lesson,
              subject: task.subject || task.meta?.subject
          };
          onNavigate(taskWithMeta);
      }
    }
  };

  return (
    <MotiView
      // نستخدم مفتاح فريد لضمان استقرار الأنيميشن
      key={task.id} 
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: isCompleted ? 0.6 : 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
      style={{ marginBottom: 12, paddingHorizontal: 20 }}
    >
      <Pressable
        onPress={handleCardPress}
        onLongPress={onLongPress}
        disabled={!isEditMode && !hasLink}
        style={({ pressed }) => [
          styles.cardContainer,
          { 
            flexDirection: isRTL ? 'row-reverse' : 'row',
            transform: [{ scale: pressed && (hasLink || isEditMode) ? 0.98 : 1 }],
            backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.15)' : '#1E293B',
            borderColor: isSelected ? '#10B981' : 'rgba(255,255,255,0.08)',
          }
        ]}
      >
        <TouchableOpacity
          onPress={handleCheckboxPress}
          hitSlop={15}
          style={[styles.checkboxArea, isRTL ? { marginLeft: 12 } : { marginRight: 12 }]}
        >
          {isEditMode ? (
             <Ionicons 
               name={isSelected ? "radio-button-on" : "radio-button-off"} 
               size={24} 
               color={isSelected ? "#10B981" : "#64748B"} 
             />
          ) : (
            <View style={[
              styles.circleCheckBase, 
              isCompleted && styles.circleCheckChecked,
              !isCompleted && task.priority === 'high' && styles.circleCheckHigh
            ]}>
              {isCompleted && <FontAwesome5 name="check" size={10} color="white" />}
            </View>
          )}
        </TouchableOpacity>

        <View style={[
            styles.contentColumn, 
            { alignItems: isRTL ? 'flex-end' : 'flex-start' }
        ]}>
          <View style={{flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 6}}>
             {task.isPinned && (
               <MaterialCommunityIcons name="pin" size={14} color="#F59E0B" style={isRTL ? {marginLeft: 6} : {marginRight: 6}} />
             )}
             <Text 
                numberOfLines={1} 
                style={[
                    styles.titleText, 
                    isCompleted && styles.completedText,
                    { textAlign: isRTL ? 'right' : 'left' }
                ]}
             >
               {displayTitle}
             </Text>
          </View>

          <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {subjectName && (
              <View style={[styles.tagContainer, styles.subjectTag, isRTL ? { marginLeft: 6 } : { marginRight: 6 }]}>
                 <View style={[styles.dot, { backgroundColor: '#A78BFA' }]} />
                 <Text style={styles.tagText}>{subjectName}</Text>
              </View>
            )}
            {lessonName && (
              <View style={[styles.tagContainer, styles.lessonTag, isRTL ? { marginLeft: 6 } : { marginRight: 6 }]}>
                 <MaterialCommunityIcons name="bookmark" size={10} color="#FBBF24" style={isRTL ? { marginLeft: 3 } : { marginRight: 3 }} />
                 <Text style={[styles.tagText, { color: '#FBBF24' }]}>{lessonName}</Text>
              </View>
            )}
            {hasTime && (
               <View style={[styles.tagContainer, styles.timeTag]}>
                  <Text style={[styles.tagText, { color: '#F472B6' }]}>{timeString}</Text>
               </View>
            )}
          </View>
        </View>

        {!isEditMode && !isCompleted && hasLink && (
            <View style={[styles.actionSide, isRTL ? { marginRight: 8 } : { marginLeft: 8 }]}>
                <MaterialCommunityIcons 
                    name={isRTL ? "chevron-left" : "chevron-right"} 
                    size={20} 
                    color="#475569" 
                />
            </View>
        )}
      </Pressable>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  checkboxArea: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  circleCheckBase: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleCheckChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  circleCheckHigh: {
    borderColor: '#F43F5E',
  },
  contentColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  metaRow: {
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  subjectTag: {
    borderColor: 'rgba(167, 139, 250, 0.3)',
    backgroundColor: 'rgba(167, 139, 250, 0.05)',
  },
  lessonTag: {
    borderColor: 'rgba(251, 191, 36, 0.3)',
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
  },
  timeTag: {
    borderColor: 'rgba(244, 114, 182, 0.3)',
    backgroundColor: 'rgba(244, 114, 182, 0.05)',
  },
  tagText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  actionSide: {
    justifyContent: 'center',
    opacity: 0.5
  }
});

// ✅ دالة المقارنة المخصصة لـ React.memo
const arePropsEqual = (prevProps, nextProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.isPinned === nextProps.task.isPinned &&
    prevProps.isEditMode === nextProps.isEditMode &&
    prevProps.isSelected === nextProps.isSelected
  );
};

export default memo(TaskItem, arePropsEqual);