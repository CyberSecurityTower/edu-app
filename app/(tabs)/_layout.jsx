import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, useRouter, useSegments } from 'expo-router'; // Import useSegments
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import FloatingActionButton from '../../components/FloatingActionButton';

// MyCustomTabBar component remains the same
function MyCustomTabBar({ state, descriptors, navigation }) {
    const [layouts, setLayouts] = React.useState([]);
    const translateX = useSharedValue(0);
    const pillWidth = useSharedValue(0);
    React.useEffect(() => {
      if (layouts.length === state.routes.length) {
        const activeLayout = layouts[state.index];
        if (activeLayout) {
          const pillScale = 0.7; 
          const newWidth = activeLayout.width * pillScale;
          const padding = (activeLayout.width - newWidth) / 2;
          const animationDuration = 180;
          translateX.value = withTiming(activeLayout.x + padding, { duration: animationDuration });
          pillWidth.value = withTiming(newWidth, { duration: animationDuration });
        }
      }
    }, [state.index, layouts]);
    const animatedPillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }], width: pillWidth.value }));
    return (
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          <Animated.View style={[styles.animatedPill, animatedPillStyle]}>
            <LinearGradient colors={['#3B82F6', '#10B981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = options.title !== undefined ? options.title : route.name;
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) { navigation.navigate(route.name, route.params); }
            };
            return (
              <Pressable key={route.key} accessibilityRole="button" accessibilityState={isFocused ? { selected: true } : {}} onPress={onPress} onLayout={(event) => {
                  const { x, width } = event.nativeEvent.layout;
                  setLayouts(prev => { const newLayouts = [...prev]; newLayouts[index] = { x, width }; return newLayouts; });
                }} style={styles.tabItem}>
                <FontAwesome5 name={options.tabBarIcon({ color: '' }).props.name} size={22} color={isFocused ? 'white' : '#a7adb8ff'} />
                <Text style={[styles.tabLabel, { color: isFocused ? 'white' : '#a7adb8ff' }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
}

export default function TabsLayout() {
  const router = useRouter();
  // --- THE HIDING LOGIC IS HERE ---
  const segments = useSegments();
  // The last segment for a tab screen is its name (e.g., 'index', 'profile')
  const lastSegment = segments[segments.length - 1];
  const hideFab = lastSegment === 'profile'; // Hide if we are on the profile tab

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <Tabs
        tabBar={(props) => <MyCustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={24} color={color} /> }} />
        <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: ({ color }) => <FontAwesome5 name="search" size={24} color={color} /> }} />
        <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: ({ color }) => <FontAwesome5 name="book" size={24} color={color} /> }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <FontAwesome5 name="user-alt" size={24} color={color} /> }} />
      </Tabs>
      
      {/* Conditionally render the FAB */}
      {!hideFab && <FloatingActionButton onPress={() => router.push('/(modal)/ai-chatbot')} />}
    </View>
  );
}

// Styles remain the same
const styles = StyleSheet.create({
    tabBarContainer: { position: 'absolute', bottom: 25, left: 20, right: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 5 },
    tabBar: { flexDirection: 'row', height: 70, backgroundColor: '#2a384ebc', borderRadius: 35, alignItems: 'center', justifyContent: 'space-around', overflow: 'hidden' },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', zIndex: 1 },
    tabLabel: { fontSize: 11, marginTop: 4, fontWeight: '600' },
    animatedPill: { position: 'absolute', height: '80%', top: '10%', left: 0, borderRadius: 25, overflow: 'hidden' },
});