 import { Tabs } from 'expo-router';
    import { FontAwesome5 } from '@expo/vector-icons';

    export default function TabsLayout() {
      return (
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#10B981',
            tabBarInactiveTintColor: '#a7adb8ff',
            tabBarStyle: {
              backgroundColor: '#1E293B',
              borderTopColor: '#334155',
            },
          }}
        >
          <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={24} color={color} /> }} />
          <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: ({ color }) => <FontAwesome5 name="search" size={24} color={color} /> }} />
          <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: ({ color }) => <FontAwesome5 name="book" size={24} color={color} /> }} />
          <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <FontAwesome5 name="user-alt" size={24} color={color} /> }} />

          {/* هذه الأسطر مهمة جدًا ويجب أن تكون موجودة */}
          <Tabs.Screen name="subject-details" options={{ href: null }} />
          <Tabs.Screen name="lesson-view" options={{ href: null }} />
        </Tabs>
      );
    }