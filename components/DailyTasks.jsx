// components/DailyTasks.jsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';

import MiniCircularProgress from './timer/MiniCircularProgress';
import EmptyTasksComponent from './EmptyTasksComponent';
import TaskItem from './TaskItem';

const DailyTasks = ({
  tasksProp = [],
  onToggleStatus,
  onStartSession,
  onGenerate,
  isGenerating,
  isCompact = false,
  timerSession
}) => {
  const router = useRouter();

  // compute pending/completed/total
  const { pendingTasks, completedCount, totalCount } = useMemo(() => {
    const validTasks = Array.isArray(tasksProp) ? tasksProp : [];
    return {
      pendingTasks: validTasks.filter(t => t.status !== 'completed'),
      completedCount: validTasks.filter(t => t.status === 'completed').length,
      totalCount: validTasks.length,
    };
  }, [tasksProp]);

  // compact display: pinned first, then unpinned, limit to 3
  const displayedTasks = useMemo(() => {
    if (!isCompact) return pendingTasks;
    const pinned = pendingTasks.filter(t => t.isPinned);
    const unpinned = pendingTasks.filter(t => !t.isPinned);
    return [...pinned, ...unpinned].slice(0, 3);
  }, [pendingTasks, isCompact]);

  // If there are no tasks at all, show the empty component
  if (totalCount === 0) {
    return (
      <View style={[styles.container, { paddingVertical: 30 }]}>
        <EmptyTasksComponent
          onGenerate={onGenerate}
          isGenerating={isGenerating}
          isPostCompletion={true}
        />
      </View>
    );
  }

  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const allTasksDone = pendingTasks.length === 0 && totalCount > 0;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', delay: 100 }}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {allTasksDone ? 'All Done for Today!' : 'Your Daily Plan'}
            </Text>
            <Text style={styles.progressText}>
              {completedCount}/{totalCount} Done
            </Text>
          </View>

          <MiniCircularProgress progress={progress} size={45} strokeWidth={5} />
        </View>

        {allTasksDone ? (
          <View style={styles.allDoneContainer}>
            <FontAwesome5 name="glass-cheers" size={24} color="#34D399" />
            <Text style={styles.allDoneText}>Great work! Enjoy your break.</Text>
          </View>
        ) : (
          displayedTasks.map((item, index) => {
            const isCurrentTask = timerSession?.taskId === item.id;
            const currentTimerStatus = isCurrentTask ? timerSession.status : 'idle';

            return (
              <TaskItem
                key={item.id}
                task={item}
                index={index}
                onToggleStatus={onToggleStatus}
                onTimerAction={() => onStartSession(item)}
                timerStatus={currentTimerStatus}
                isEditMode={false}
              />
            );
          })
        )}

        {/* Show "View All" in compact mode only when there are more tasks to view
            and only if not all tasks are completed. */}
        {!allTasksDone && isCompact && totalCount > displayedTasks.length && (
          <Pressable style={styles.viewAllButton} onPress={() => router.push('/(tabs)/tasks')}>
            <Text style={styles.viewAllText}>{`View All ${totalCount} Tasks`}</Text>
            <FontAwesome5 name="arrow-right" size={14} color="#34D399" />
          </Pressable>
        )}
      </View>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 12,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  progressText: { color: '#a7adb8ff', fontSize: 14, fontWeight: '600', marginTop: 2 },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 15,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  viewAllText: { color: '#34D399', fontSize: 16, fontWeight: 'bold', marginRight: 8 },
  allDoneContainer: { alignItems: 'center', paddingVertical: 20 },
  allDoneText: { color: '#9CA3AF', marginTop: 10, fontSize: 15, fontWeight: '500' },
});

export default React.memo(DailyTasks);
