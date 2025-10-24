// app/(tabs)/_layout.jsx
import React from 'react';
import { Tabs } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { View } from 'react-native';

// ✨ 1. استيراد المكونات والسياق اللازم
import { useFab } from '../../context/FabContext';
import ExpandableFAB from '../../components/ExpandableFAB';

export default function TabLayout() {
  // ✨ 2. الحصول على الإجراءات الحالية للزر العائم من السياق
  // هذه الإجراءات يتم تحديدها من داخل كل شاشة (مثل home.jsx أو tasks.jsx)
  const { fabActions } = useFab();

  return (
    // ✨ 3. استخدام View كحاوية رئيسية للسماح بوضع الزر العائم فوق التبويبات
    <View style={{ flex: 1, backgroundColor: '#0C0F27' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#10B981',
          tabBarInactiveTintColor: '#6B7280',
          tabBarStyle: {
            backgroundColor: '#1F293B',
            borderTopWidth: 0,
            height: 90,
            paddingBottom: 30,
          },
        }}
      >
        <Tabs.Screen
          // اسم الملف يجب أن يكون home.jsx
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          // اسم الملف يجب أن يكون tasks.jsx
          name="tasks"
          options={{
            title: 'Tasks',
            tabBarIcon: ({ color }) => <FontAwesome5 name="tasks" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          // مثال: شاشة للمجتمع أو المجموعات الدراسية
          name="community"
          options={{
            title: 'Community',
            tabBarIcon: ({ color }) => <FontAwesome5 name="users" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          // مثال: شاشة للملف الشخصي
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <FontAwesome5 name="user-alt" size={24} color={color} />,
          }}
        />
      </Tabs>

      {/* ✨ 4. عرض الزر العائم هنا بشكل شرطي */}
      {/* سيظهر فقط إذا كانت الشاشة الحالية قد حددت له إجراءات */}
      {fabActions && fabActions.length > 0 && (
        <ExpandableFAB actions={fabActions} />
      )}
    </View>
  );
}