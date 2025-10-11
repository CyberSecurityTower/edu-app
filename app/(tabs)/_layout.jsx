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
          <Tabs.Screen
            name="index" // This is the app/(tabs)/index.jsx file
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="search" // You will create app/(tabs)/search.jsx later
            options={{
              title: 'Search',
              tabBarIcon: ({ color }) => <FontAwesome5 name="search" size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="library" // You will create app/(tabs)/library.jsx later
            options={{
              title: 'Library',
              tabBarIcon: ({ color }) => <FontAwesome5 name="book" size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="profile" // You will create app/(tabs)/profile.jsx later
            options={{
              title: 'Profile',
              tabBarIcon: ({ color }) => <FontAwesome5 name="user-alt" size={24} color={color} />,
            }}
          />
        </Tabs>
      );
    }