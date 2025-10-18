import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import FloatingActionButton from '../../components/FloatingActionButton';

// MyCustomTabBar component remains unchanged, it's correct.
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
          const animationDuration = 200;
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
  const segments = useSegments();
  const lastSegment = segments[segments.length - 1];
  
  // We hide the Floating Action Button on these screens
  const hideFab = lastSegment === 'profile' || lastSegment === 'leaderboard';

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <Tabs
        tabBar={(props) => <MyCustomTabBar {...props} />}
      >
        <Tabs.Screen 
          name="index" 
          options={{ 
            title: 'Home', 
            tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={24} color={color} />,
            headerShown: false,
          }} 
        />
        
        <Tabs.Screen 
          name="leaderboard"
          options={{ 
            title: 'Ranking', 
            tabBarIcon: ({ color }) => <FontAwesome5 name="trophy" size={24} color={color} />,
            headerShown: true, // Let the screen itself customize the header
          }} 
        />
        
        {/* --- THE FIX: The extra "path-preview" screen has been removed --- */}
        
        <Tabs.Screen 
          name="search" 
          options={{ 
            title: 'Search', 
            tabBarIcon: ({ color }) => <FontAwesome5 name="search" size={24} color={color} />,
            headerShown: false,
          }} 
        />

        <Tabs.Screen 
          name="profile" 
          options={{ 
            title: 'Profile', 
            tabBarIcon: ({ color }) => <FontAwesome5 name="user-alt" size={24} color={color} />,
            headerShown: false,
          }} 
        />
      </Tabs>
      
      {!hideFab && <FloatingActionButton onPress={() => router.push('/(modal)/ai-chatbot')} />}
    </View>
  );
}

const styles = StyleSheet.create({
    tabBarContainer: { position: 'absolute', bottom: 25, left: 20, right: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 5 },
    tabBar: { flexDirection: 'row', height: 70, backgroundColor: 'rgba(42, 56, 78, 0.75)', borderRadius: 35, alignItems: 'center', justifyContent: 'space-around', overflow: 'hidden' },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', zIndex: 1 },
    tabLabel: { fontSize: 11, marginTop: 4, fontWeight: '600' },
    animatedPill: { position: 'absolute', height: '80%', top: '10%', left: 0, borderRadius: 25, overflow: 'hidden' },
});