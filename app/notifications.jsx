// app/notifications.jsx

import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS, fr } from 'date-fns/locale';
import { useRouter, useFocusEffect } from 'expo-router'; // ✅ استيراد useFocusEffect
import LottieView from 'lottie-react-native';
import React, { useCallback, useState, useRef, useMemo } from 'react';
import {
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  UIManager,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAppState } from '../context/AppStateContext';
import { useLanguage } from '../context/LanguageContext';

import {
  deleteAllNotifications,
  deleteNotification,
  markAllNotificationsAsRead,
  fetchUserNotifications,
} from '../services/supabaseService';

import OverlayRefreshLoader from '../components/OverlayRefreshLoader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Notification Card Component (نفس المكون السابق) ---
const NotificationItem = React.memo(({ item, onPress, onDelete, dateLocale, isRTL }) => {
  const isRead = item.read;
  
  const getStyle = () => {
    switch (item.type) {
      case 'new_lesson':
      case 'lesson': return { icon: 'book-open', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)' };
      case 'quiz': 
      case 'quiz_reminder': return { icon: 'brain', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.15)' };
      case 'task':
      case 'task_reminder': return { icon: 'tasks', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' };
      case 'alert': 
      case 'system': return { icon: 'exclamation-circle', color: '#F87171', bg: 'rgba(248, 113, 113, 0.15)' };
      default: return { icon: 'bell', color: '#34D399', bg: 'rgba(52, 211, 153, 0.15)' };
    }
  };
  
  const styleData = getStyle();

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.card,
        !isRead && styles.unreadCard,
        { 
          opacity: pressed ? 0.9 : 1, 
          transform: [{ scale: pressed ? 0.98 : 1 }],
          flexDirection: isRTL ? 'row-reverse' : 'row' 
        }
      ]}
    >
      <View style={[
        styles.iconBox, 
        { backgroundColor: styleData.bg },
        isRTL ? { marginLeft: 14 } : { marginRight: 14 }
      ]}>
        <FontAwesome5 name={styleData.icon} size={20} color={styleData.color} />
      </View>

      <View style={styles.contentBox}>
        <View style={[
          styles.headerRow, 
          { flexDirection: isRTL ? 'row-reverse' : 'row' }
        ]}>
          <Text 
            style={[
              styles.title, 
              !isRead && styles.unreadTitle,
              { textAlign: isRTL ? 'right' : 'left' }
            ]} 
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.date}>
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: dateLocale })}
          </Text>
        </View>
        <Text 
          style={[
            styles.message,
            { textAlign: isRTL ? 'right' : 'left' }
          ]} 
          numberOfLines={2}
        >
          {item.message}
        </Text>
      </View>
      
      <Pressable onPress={() => onDelete(item.id)} style={styles.deleteBtn} hitSlop={20}>
        <Ionicons name="close" size={18} color="#64748B" />
      </Pressable>
    </Pressable>
  );
});

export default function NotificationsScreen() {
  const { user, notifications, setNotifications, setUnreadCount } = useAppState();
  const { t, language, isRTL } = useLanguage();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const isFetchingRef = useRef(false);

  const dateLocale = useMemo(() => {
    if (language === 'ar') return ar;
    if (language === 'fr') return fr;
    return enUS;
  }, [language]);

  // ✅ الدالة الأساسية لجلب الإشعارات
  const loadNotifications = useCallback(async () => {
    if (!user?.uid || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    // لا نظهر اللودر الكبير إذا كانت هناك بيانات بالفعل (تحديث صامت)
    if (notifications.length === 0) setRefreshing(true);

    try {
      const freshData = await fetchUserNotifications(user.uid);
      
      // تحديث القائمة
      setNotifications(freshData);
      
      // تصفير العداد العام في التطبيق
      const unreadIds = freshData.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length > 0) {
         markAllNotificationsAsRead(user.uid, unreadIds);
         setUnreadCount(0);
      }
    } catch (error) {
      console.error("❌ Notifications Error:", error);
    } finally {
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [user?.uid]);

  // ✅ استخدام useFocusEffect لجلب البيانات في كل مرة تفتح فيها الشاشة
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handlePress = useCallback((item) => {
    if (item.type?.includes('lesson')) router.push('/(tabs)/subjects');
    else if (item.type?.includes('task')) router.push('/(tabs)/tasks');
  }, [router]);

  const handleDelete = useCallback(async (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNotifications(prev => prev.filter(n => n.id !== id));
    try { await deleteNotification(user.uid, id); } catch (e) { console.error(e); }
  }, [user?.uid, setNotifications]);

  const handleClearAll = useCallback(async () => {
    if (notifications.length === 0) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const ids = notifications.map(n => n.id);
    setNotifications([]);
    try { await deleteAllNotifications(user.uid, ids); } catch (e) { console.error(e); }
  }, [notifications, user?.uid, setNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    isFetchingRef.current = false; // Reset lock for manual refresh
    await loadNotifications();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0C0F27" />

      <View style={[
        styles.header,
        { flexDirection: isRTL ? 'row-reverse' : 'row' }
      ]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color="white" />
        </Pressable>

        <Text style={styles.headerTitle}>{t('notificationsTitle')}</Text>

        {notifications.length > 0 ? (
          <Pressable onPress={handleClearAll} hitSlop={10}>
            <Text style={styles.clearAllText}>{t('clearAll')}</Text>
          </Pressable>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      <OverlayRefreshLoader isRefreshing={refreshing} />

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            item={item}
            onPress={handlePress}
            onDelete={handleDelete}
            dateLocale={dateLocale}
            isRTL={isRTL}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={['transparent']}
            style={{ backgroundColor: 'transparent' }}
            progressBackgroundColor="transparent"
            progressViewOffset={-1000}
          />
        }
        ListEmptyComponent={
          !refreshing && (
            <View style={styles.emptyContainer}>
              <LottieView
                source={require('../assets/images/empty-notification.json')}
                autoPlay
                loop
                style={styles.lottie}
              />
              <Text style={styles.emptyText}>{t('noNotifications')}</Text>
              <Text style={styles.emptySubText}>{t('noNotificationsSub')}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.08)', 
    backgroundColor: '#0C0F27',
    zIndex: 10 
  },
  backBtn: { padding: 4 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  clearAllText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 100 },
  card: { 
    backgroundColor: 'rgba(30, 41, 59, 0.6)', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)' 
  },
  unreadCard: { 
    backgroundColor: 'rgba(30, 41, 59, 0.9)', 
    borderColor: 'rgba(59, 130, 246, 0.5)', 
    shadowColor: '#3B82F6', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 2 
  },
  iconBox: { 
    width: 46, 
    height: 46, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  contentBox: { flex: 1 },
  headerRow: { 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 6 
  },
  title: { 
    color: '#E2E8F0', 
    fontSize: 15, 
    fontWeight: '600', 
    flex: 1, 
    marginHorizontal: 8 
  },
  unreadTitle: { color: '#FFFFFF', fontWeight: '800' },
  date: { color: '#64748B', fontSize: 11, fontWeight: '500' },
  message: { 
    color: '#94A3B8', 
    fontSize: 13, 
    lineHeight: 19 
  },
  deleteBtn: { padding: 8, marginHorizontal: 4, opacity: 0.7 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  lottie: { width: 220, height: 220 },
  emptyText: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  emptySubText: { color: '#94A3B8', fontSize: 14, marginTop: 8, textAlign: 'center', maxWidth: '70%' }
});