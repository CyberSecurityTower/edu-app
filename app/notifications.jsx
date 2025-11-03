// app/notifications.jsx
import React, { useCallback, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, SectionList, Alert as DefaultAlert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, interpolateColor } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { Animated as RNAnimated } from 'react-native'; 
import { useAppState } from '../context/AppStateContext';
import { markAllNotificationsAsRead, deleteNotification, deleteAllNotifications } from '../services/firestoreService';
import CustomAlert from '../components/CustomAlert';

const NOTIFICATION_ICONS = {
  tasks: { name: 'tasks', color: '#3B82F6' },
  planner: { name: 'calendar-alt', color: '#10B981' },
  chat: { name: 'robot', color: '#8B5CF6' },
  lesson: { name: 'book-open', color: '#F59E0B' },
  subject: { name: 'graduation-cap', color: '#EC4899' },
  leaderboard: { name: 'trophy', color: '#FBBF24' },
  quiz: { name: 'puzzle-piece', color: '#FBBF24' },
  streak: { name: 'fire-alt', color: '#EF4444' },
  points: { name: 'star', color: '#FFD700' },
  default: { name: 'bell', color: '#6B7280' },
};

// ✨ [FIX] Correctly access the animated value from the progress object
// ✨ [الحل النهائي] هذا هو الكود الصحيح الذي يتوافق مع Swipeable


const SwipeToDeleteAction = ({ dragX }) => {
  // dragX.interpolate هي الطريقة الصحيحة لربط حركة السحب بالأنماط في هذه الحالة
  const backgroundColor = dragX.interpolate({
    inputRange: [-80, 0], // نطاق الإدخال: من السحب الكامل (-80px) إلى الحالة العادية (0px)
    outputRange: ['#B91C1C', '#374151'], // نطاق الإخراج: من اللون الأحمر إلى الرمادي
    extrapolate: 'clamp', // هذا يضمن أن لا تتجاوز الحركة الألوان المحددة
  });

  return (
    <RNAnimated.View style={[styles.deleteAction, { backgroundColor }]}>
      <FontAwesome5 name="trash-alt" size={20} color="white" />
    </RNAnimated.View>
  );
};

const NotificationItem = ({ item, onNavigate, onDelete }) => {
  const isUnread = !item.read;
  const date = item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const iconInfo = NOTIFICATION_ICONS[item.meta?.source] || NOTIFICATION_ICONS.default;
  const swipeableRef = useRef(null);

   const renderRightActions = (progress, dragX) => {
    return <SwipeToDeleteAction dragX={dragX} />;
  };
  
  const handleDelete = () => {
    onDelete(item.id);
    swipeableRef.current?.close();
  };

  return (
     <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions} // <<<--- هنا نستخدم الدالة المحدثة
      onSwipeableWillOpen={handleDelete}
      rightThreshold={80}
      overshootFriction={8}
    >
      <Pressable
        style={[styles.itemContainer, isUnread && styles.unreadItem]}
        onPress={() => onNavigate(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${iconInfo.color}20` }]}>
          <FontAwesome5 name={iconInfo.name} size={20} color={iconInfo.color} solid={item.meta?.source === 'points'} />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>{item.title || 'EduAI Assistant'}</Text>
          <Text style={styles.itemMessage} numberOfLines={2}>{item.message}</Text>
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.itemDate}>{date}</Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
      </Pressable>
    </Swipeable>
  );
};


// ... (The rest of the file remains exactly the same)
const groupNotificationsByDate = (notificationsArray) => {
  const groups = { Today: [], Yesterday: [], 'Previous 7 Days': [], Older: [] };
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  notificationsArray.forEach(notification => {
    if (!notification.createdAt) {
      groups.Older.push(notification);
      return;
    }
    const notificationDate = new Date(notification.createdAt.seconds * 1000);
    if (notificationDate.toDateString() === today.toDateString()) groups.Today.push(notification);
    else if (notificationDate.toDateString() === yesterday.toDateString()) groups.Yesterday.push(notification);
    else if (notificationDate > sevenDaysAgo) groups['Previous 7 Days'].push(notification);
    else groups.Older.push(notification);
  });
  
  return [
    { title: 'Today', data: groups.Today },
    { title: 'Yesterday', data: groups.Yesterday },
    { title: 'Previous 7 Days', data: groups['Previous 7 Days'] },
    { title: 'Older', data: groups.Older },
  ].filter(section => section.data.length > 0);
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user, notifications, unreadCount } = useAppState();
  const [filter, setFilter] = useState('all');
  const [alertInfo, setAlertInfo] = useState({ isVisible: false });

  const handleMarkAllRead = useCallback(async () => {
    if (!user?.uid || unreadCount === 0) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    await markAllNotificationsAsRead(user.uid, unreadIds);
  }, [user?.uid, unreadCount, notifications]);
  
  useFocusEffect(
    useCallback(() => {
      handleMarkAllRead();
    }, [handleMarkAllRead])
  );
  
  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.read);
    }
    return notifications;
  }, [notifications, filter]);

  const sections = useMemo(() => groupNotificationsByDate(filteredNotifications), [filteredNotifications]);

  const handleNavigate = useCallback(async (notification) => {
    if (!user?.uid) return;

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


  const handleDelete = useCallback((notificationId) => {
    deleteNotification(user.uid, notificationId);
  }, [user?.uid]);
  
  const handleDeleteAll = useCallback(() => {
    if (filteredNotifications.length === 0) return;
    
    setAlertInfo({
      isVisible: true,
      title: "Clear Notifications",
      message: `Are you sure you want to delete all ${filteredNotifications.length} shown notifications? This cannot be undone.`,
      buttons: [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete All", 
          style: "destructive", 
          onPress: () => {
            const idsToDelete = filteredNotifications.map(n => n.id);
            deleteAllNotifications(user.uid, idsToDelete);
          }
        }
      ]
    });
  }, [user?.uid, filteredNotifications]);


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <FontAwesome5 name="times" size={22} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Pressable onPress={handleDeleteAll} style={styles.headerButton} disabled={filteredNotifications.length === 0}>
            <FontAwesome5 name="trash-alt" size={18} color={filteredNotifications.length > 0 ? "white" : "#4B5563"} />
          </Pressable>
        </View>

        <View style={styles.filterContainer}>
            <Pressable style={[styles.filterButton, filter === 'all' && styles.activeFilter]} onPress={() => setFilter('all')}>
                <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>All</Text>
            </Pressable>
            <Pressable style={[styles.filterButton, filter === 'unread' && styles.activeFilter]} onPress={() => setFilter('unread')}>
                <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>Unread</Text>
                {unreadCount > 0 && <View style={styles.unreadCountBadge}><Text style={styles.unreadCountText}>{unreadCount}</Text></View>}
            </Pressable>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationItem item={item} onNavigate={handleNavigate} onDelete={handleDelete} />}
          renderSectionHeader={({ section: { title } }) => <Text style={styles.sectionHeader}>{title}</Text>}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LottieView
                source={require('../assets/images/empty-notification.json')}
                autoPlay loop={true} style={styles.lottieAnimation}
              />
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptyText}>You have no new notifications right now.</Text>
            </View>
          }
        />
        
        <CustomAlert 
          isVisible={alertInfo.isVisible}
          onClose={() => setAlertInfo({ isVisible: false })}
          title={alertInfo.title}
          message={alertInfo.message}
          buttons={alertInfo.buttons}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerButton: { padding: 10, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  filterContainer: { flexDirection: 'row', justifyContent: 'center', padding: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  filterButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#1E293B' },
  activeFilter: { backgroundColor: '#3B82F6' },
  filterText: { color: '#9CA3AF', fontWeight: '600' },
  activeFilterText: { color: 'white' },
  unreadCountBadge: { backgroundColor: '#EF4444', borderRadius: 10, marginLeft: 8, paddingHorizontal: 6, paddingVertical: 1, justifyContent: 'center', alignItems: 'center' },
  unreadCountText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  listContent: { paddingHorizontal: 20, flexGrow: 1, paddingBottom: 20 },
  sectionHeader: { color: '#a7adb8ff', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10, marginTop: 20 },
  itemContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 16, padding: 15, marginBottom: 10 },
  unreadItem: { borderWidth: 1, borderColor: '#3B82F6' },
  iconContainer: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemContent: { flex: 1, paddingRight: 10 },
  itemTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  itemMessage: { color: '#D1D5DB', fontSize: 14, lineHeight: 20 },
  timeContainer: { alignItems: 'flex-end' },
  itemDate: { color: '#6B7280', fontSize: 12, marginBottom: 5 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: '25%' },
  lottieAnimation: { width: 250, height: 250, marginBottom: 10 },
  emptyTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  emptyText: { color: '#9CA3AF', fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
  deleteAction: { justifyContent: 'center', alignItems: 'flex-end', flex: 1, borderRadius: 16, paddingRight: 25 },
});