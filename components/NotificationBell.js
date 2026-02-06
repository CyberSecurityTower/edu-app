
// components/NotificationBell.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppState } from '../context/AppStateContext';

const NotificationBell = () => {
  const { unreadCount } = useAppState();
  const router = useRouter();

  return (
    <TouchableOpacity 
      onPress={() => router.push('/notifications')} 
      style={styles.container}
      activeOpacity={0.7}
    >
      {/* أيقونة الجرس باللون الأبيض */}
      <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />

      {/* دائرة الإشعارات */}
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    backgroundColor: '#1E293B', // الخلفية الداكنة (نفس لون زر السكور)
    borderRadius: 30,           // حواف دائرية ناعمة
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', // حدود خفيفة جداً للجمالية
  },
  badge: {
    position: 'absolute',
    top: -2,               // يخرج قليلاً من الأعلى
    right: -2,             // يخرج قليلاً من اليمين
    backgroundColor: '#EF4444', // لون أحمر جميل
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,        // حدود سميكة
    borderColor: '#0F172A', // نفس لون خلفية التطبيق ليعطي تأثير "القص"
    zIndex: 10,
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,           // خط صغير جداً
    fontWeight: '800',     // خط عريض جداً
    textAlign: 'center',
  },
});

export default NotificationBell;