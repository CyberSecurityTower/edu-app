// app/(tabs)/_layout.jsx
import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { BlurView } from 'expo-blur';

// بيانات التبويبات لتسهيل إدارتها
const TABS = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'tasks', label: 'Tasks', icon: 'tasks' },
  { name: 'chat-history', label: 'History', icon: 'history' },
  { name: 'profile', label: 'Profile', icon: 'user-alt' },
];

// مكون زر التبويب الفردي
const TabButton = ({ tab, isActive }) => {
  const router = useRouter();
  
  return (
    <Pressable 
      onPress={() => router.push(`/${tab.name}`)} 
      style={styles.tabButton}
    >
      <MotiView
        animate={{ scale: isActive ? 1.1 : 1, translateY: isActive ? -5 : 0 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        style={styles.iconContainer}
      >
        <FontAwesome5 name={tab.icon} size={22} color={isActive ? '#34D399' : '#9CA3AF'} />
      </MotiView>
      <MotiView
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={{ type: 'timing', duration: 300 }}
      >
        <Text style={styles.tabLabel}>{tab.label}</Text>
      </MotiView>
    </Pressable>
  );
};

// مكون شريط التبويب المخصص بالكامل
const CustomTabBar = () => {
  const segments = useSegments();
  // اسم الشاشة الحالية هو آخر جزء في المسار (أو 'index' إذا كان المسار فارغاً)
  const activeTabName = segments[segments.length - 1] || 'index';

  return (
    <View style={styles.tabBarContainer}>
      <BlurView intensity={80} tint="dark" style={styles.blurView}>
        {TABS.map((tab) => (
          <TabButton key={tab.name} tab={tab} isActive={tab.name === activeTabName} />
        ))}
      </BlurView>
    </View>
  );
};

// إعدادات التبويبات الرئيسية
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => <CustomTabBar />} // <-- هنا نستخدم شريط التبويب المخصص
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="chat-history" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    height: 75,
    borderRadius: 38,
    overflow: 'hidden',
  },
  blurView: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  iconContainer: {
    // يمكن إضافة أنماط هنا إذا لزم الأمر
  },
  tabLabel: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '600',
  },
});