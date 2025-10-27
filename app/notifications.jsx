// app/notifications.jsx
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import LottieView from 'lottie-react-native'; // ✨ [NEW] Import LottieView

import { useAppState } from '../context/AppStateContext';
import { markNotificationAsRead, markAllNotificationsAsRead } from '../services/firestoreService';

const NOTIFICATION_ICONS = {
  tasks: { name: 'tasks', color: '#3B82F6' },
  planner: { name: 'calendar-alt', color: '#10B981' },
  chat: { name: 'robot', color: '#8B5CF6' },
  lesson: { name: 'book-open', color: '#F59E0B' },
  subject: { name: 'graduation-cap', color: '#EC4899' },
  leaderboard: { name: 'trophy', color: '#FBBF24' },
  default: { name: 'bell', color: '#6B7280' },
};

const NotificationItem = ({ item, onNavigate }) => {
  const isUnread = !item.read;
  const date = item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleString() : '';
  const iconInfo = NOTIFICATION_ICONS[item.meta?.source] || NOTIFICATION_ICONS.default;

  return (
    <Pressable
      style={[styles.itemContainer, isUnread && styles.unreadItem]}
      onPress={() => onNavigate(item)}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${iconInfo.color}20` }]}>
        <FontAwesome5 name={iconInfo.name} size={20} color={iconInfo.color} />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title || 'EduAI Assistant'}</Text>
        <Text style={styles.itemMessage} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.itemDate}>{date}</Text>
      </View>
      {isUnread && <View style={styles.unreadDot} />}
    </Pressable>
  );
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user, notifications, unreadCount } = useAppState();

  const handleNavigate = useCallback(async (notification) => {
    if (!user?.uid) return;

    if (!notification.read) {
      await markNotificationAsRead(user.uid, notification.id);
    }

    router.back();

    const meta = notification.meta || {};
    const sourceType = meta.source || meta.type;

    switch (sourceType) {
      case 'tasks':
      case 'todo':
      case 'planner':
        router.push('/(tabs)/tasks');
        break;
      case 'lesson':
        if (meta.lessonId && meta.subjectId && user.selectedPathId) {
          router.push({ pathname: '/lesson-view', params: { ...meta, pathId: user.selectedPathId } });
        }
        break;
      case 'subject':
        if (meta.subjectId) {
          router.push({ pathname: '/subject-details', params: { id: meta.subjectId } });
        }
        break;
      case 'leaderboard':
        router.push('/(tabs)/leaderboard');
        break;
      case 'chat':
        router.push('/ai-chatbot');
        break;
      default:
        router.push('/(tabs)/');
        break;
    }
  }, [user, router]);

  const handleMarkAllRead = async () => {
    if (!user?.uid || unreadCount === 0) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    await markAllNotificationsAsRead(user.uid, unreadIds);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <FontAwesome5 name="times" size={22} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable onPress={handleMarkAllRead} style={styles.headerButton} disabled={unreadCount === 0}>
          <Text style={[styles.markAllText, unreadCount === 0 && { opacity: 0.5 }]}>Mark all read</Text>
        </Pressable>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem item={item} onNavigate={handleNavigate} />}
        contentContainerStyle={styles.listContent}
        // ✨ [MODIFIED] Using the new Lottie-based empty component
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LottieView
              source={require('../assets/images/empty-notification.json')}
              autoPlay
              loop={true}
              style={styles.lottieAnimation}
            />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>You have no new notifications right now.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerButton: { padding: 10 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  markAllText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  // ✨ [MODIFIED] listContent now grows to fill space, enabling vertical centering
  listContent: { 
    paddingHorizontal: 20, 
    flexGrow: 1 
  },
  itemContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 16, padding: 15, marginBottom: 10 },
  unreadItem: { borderWidth: 1, borderColor: '#3B82F6' },
  iconContainer: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemContent: { flex: 1, paddingRight: 10 },
  itemTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  itemMessage: { color: '#D1D5DB', fontSize: 14, lineHeight: 20 },
  itemDate: { color: '#6B7280', fontSize: 12, marginTop: 8 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6', marginLeft: 10 },
  // ✨ [MODIFIED] Styles for the new empty state
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingBottom: '25%', // Pushes content up from the bottom
  },
  lottieAnimation: {
    width: 250,
    height: 250,
    marginBottom: 10,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyText: { 
    color: '#9CA3AF', 
    fontSize: 16, 
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});