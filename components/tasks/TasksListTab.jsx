// components/tasks/TasksListTab.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { FontAwesome5 } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list'; // ✅ الاستبدال السحري

import { useLanguage } from '../../context/LanguageContext';
import { useEditMode } from '../../context/EditModeContext';
import { localT } from '../../utils/tasksUtils';
import TaskItem from '../../components/TaskItem';
import EmptyTasksComponent from '../../components/EmptyTasksComponent';

// قسم المهام المكتملة
const CompletedTasksSection = React.memo(({ tasks, onToggleStatus, onStartSession, onNavigate, onDeleteAll }) => {
    const [show, setShow] = useState(false);
    const { language, isRTL } = useLanguage();
    if (!tasks || tasks.length === 0) return null;
    return (
      <View style={{ marginTop: 20 }}>
        <Pressable style={[styles.completedHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => setShow(prev => !prev)}>
          <View style={[styles.completedHeaderContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.completedTitle}>{`${localT('completed', language)} (${tasks.length})`}</Text>
            <Pressable style={styles.deleteButton} onPress={onDeleteAll} hitSlop={10}><FontAwesome5 name="trash-alt" size={18} color="#6B7280" /></Pressable>
          </View>
          <FontAwesome5 name={show ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
        </Pressable>
        
        {show && tasks.map(item => (
            <TaskItem key={item.id} task={item} onToggleStatus={onToggleStatus} isEditMode={false} onStartSession={onStartSession} onNavigate={onNavigate} />
        ))}
      </View>
    );
});

export default function TasksListTab({ 
  tasks, 
  onRefresh, 
  onToggleStatus, 
  onNavigate, 
  onStartSession, 
  onDeleteAllCompleted, 
  onSelectTask 
}) {
  const { isEditMode, selectedTasks, setIsEditMode, setSelectedTasks } = useEditMode();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { language } = useLanguage();
  
  const isFirstRender = useRef(true);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);

  // Sorting Logic
  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    return [...tasks].sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return 0;
    });
  }, [tasks]);

  const { pendingTasks, completedTasks } = useMemo(() => ({
    pendingTasks: sortedTasks.filter(t => t.status !== 'completed'),
    completedTasks: sortedTasks.filter(t => t.status === 'completed'),
  }), [sortedTasks]);

  const allTasksCompleted = sortedTasks.length > 0 && pendingTasks.length === 0;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return; 
    }
    if (allTasksCompleted) {
      setShowCompletionMessage(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const timer = setTimeout(() => setShowCompletionMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [allTasksCompleted]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const renderContent = () => {
    if (sortedTasks.length === 0) {
        return <EmptyTasksComponent isGenerating={false} />;
    }
    
    if (allTasksCompleted) {
      return (
        <AnimatePresence>
          {showCompletionMessage ? ( 
            <MotiView from={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: 'timing', duration: 500 }} style={styles.center}>
                <LottieView source={require('../../assets/images/confetti.json')} autoPlay loop={false} style={styles.lottieCelebration} resizeMode="cover" />
                <FontAwesome5 name="check-circle" size={60} color="#34D399" solid />
                <Text style={styles.celebrationTitle}>{localT('greatJob', language)}</Text>
                <Text style={styles.celebrationSubtitle}>{localT('allDoneSub', language)}</Text>
            </MotiView>
          ) : ( 
            <EmptyTasksComponent key="empty-done" isGenerating={false} isPostCompletion={true} /> 
          )}
        </AnimatePresence>
      );
    }

    return (
      <FlashList
        data={pendingTasks}
        keyExtractor={(item) => item.id}
        estimatedItemSize={85} // ✅ مهم جداً للأداء: متوسط ارتفاع العنصر
        contentContainerStyle={styles.listContent}
        extraData={selectedTasks} // لإعادة الرسم عند التحديد
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListFooterComponent={ 
            <CompletedTasksSection 
                tasks={completedTasks} 
                onToggleStatus={onToggleStatus} 
                onStartSession={onStartSession} 
                onNavigate={onNavigate} 
                onDeleteAll={onDeleteAllCompleted} 
            /> 
        }
        renderItem={({ item, index }) => ( 
          <TaskItem 
            task={item} 
            index={index} 
            onToggleStatus={onToggleStatus} 
            onNavigate={onNavigate} 
            onLongPress={() => { 
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
                setIsEditMode(true); 
                const newSet = new Set(); 
                newSet.add(item.id); 
                setSelectedTasks(newSet); 
            }} 
            isEditMode={isEditMode} 
            isSelected={selectedTasks.has(item.id)} 
            onSelect={onSelectTask} 
          /> 
        )}
      />
    );
  };

  return <View style={{ flex: 1 }}>{renderContent()}</View>;
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 180, paddingTop: 10 },
  completedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  completedHeaderContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  completedTitle: { color: '#9CA3AF', fontSize: 16, fontWeight: 'bold' },
  deleteButton: { padding: 8 },
  center: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingHorizontal: 20 },
  lottieCelebration: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  celebrationTitle: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 20, marginTop: 20 },
  celebrationSubtitle: { color: '#9CA3AF', fontSize: 16, textAlign: 'center', marginTop: 10 },
});