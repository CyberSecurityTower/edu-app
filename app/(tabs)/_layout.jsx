import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, Text, Dimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// --- Our New Custom Tab Bar Component ---
function MyCustomTabBar({ state, descriptors, navigation }) {
  const [layouts, setLayouts] = useState([]);
  
  // Create shared values for the animated pill's position and width
  const translateX = useSharedValue(0);
  const pillWidth = useSharedValue(0);

  // This effect runs when the active tab changes or when layouts are measured
  useEffect(() => {
    if (layouts.length === state.routes.length) {
      const activeLayout = layouts[state.index];
      if (activeLayout) {
        // Animate the pill to the new position and width
        translateX.value = withTiming(activeLayout.x, { duration: 250 });
        pillWidth.value = withTiming(activeLayout.width, { duration: 250 });
      }
    }
  }, [state.index, layouts]);

  // Create the animated style object
  const animatedPillStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: pillWidth.value,
    };
  });

  return (
    // This is the main container that makes the tab bar "float"
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {/* The Animated Pill that slides */}
        <Animated.View style={[styles.animatedPill, animatedPillStyle]}>
          <LinearGradient
            colors={['#3B82F6', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Map through the routes to create the buttons */}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title !== undefined ? options.title : route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              // Measure the position and size of each button
              onLayout={(event) => {
                const { x, width } = event.nativeEvent.layout;
                setLayouts(prev => {
                  const newLayouts = [...prev];
                  newLayouts[index] = { x, width };
                  return newLayouts;
                });
              }}
              style={styles.tabItem}
            >
              <FontAwesome5
                name={options.tabBarIcon({ color: '' }).props.name} // A bit of a hack to get the icon name
                size={22}
                color={isFocused ? 'white' : '#a7adb8ff'}
              />
              <Text style={[styles.tabLabel, { color: isFocused ? 'white' : '#a7adb8ff' }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// --- The Main Layout Component ---
export default function TabsLayout() {
  return (
    <Tabs
      // Use our custom component for the tab bar
      tabBar={(props) => <MyCustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={24} color={color} /> }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: ({ color }) => <FontAwesome5 name="search" size={24} color={color} /> }} />
      <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: ({ color }) => <FontAwesome5 name="book" size={24} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <FontAwesome5 name="user-alt" size={24} color={color} /> }} />
      <Tabs.Screen name="subject-details" options={{ href: null }} />
      <Tabs.Screen name="lesson-view" options={{ href: null }} />
    </Tabs>
  );
}

// --- All the new styles for our custom tab bar ---
const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 25, // This raises the tab bar from the bottom
    left: 20,
    right: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  tabBar: {
    flexDirection: 'row',
    height: 70,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 1, // Ensure icons and text are above the pill
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  animatedPill: {
    position: 'absolute',
    height: '80%',
    top: '10%',
    left: 0,
    borderRadius: 15,
    marginHorizontal: 5,
  },
});