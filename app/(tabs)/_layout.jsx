// app/(tabs)/_layout.jsx

import React from 'react';
import { View, StyleSheet, Platform, Pressable, Dimensions } from 'react-native';
import { withLayoutContext } from 'expo-router'; 
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'; 
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  useSharedValue, 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useUIState } from '../../context/UIStateContext';

// --- الإعدادات ---
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_MARGIN = 15;
const TAB_BAR_HEIGHT = 75;
const ACTIVE_COLOR = '#FFFFFF';

// ✅ تفعيل الحفظ المسبق للشاشات لتحسين الأداء
const { Navigator } = createMaterialTopTabNavigator();
export const SwipeableTabs = withLayoutContext(Navigator);

// --- مكون الأيقونة ---
const TabIcon = React.memo(({ name, focused }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(focused ? 1.2 : 1) }],
      opacity: withTiming(focused ? 1 : 0.6),
    };
  });

  return (
    <Animated.View style={[styles.iconContainer, animatedStyle]}>
      <Ionicons 
        name={focused ? name : `${name}-outline`} 
        size={26} 
        color={ACTIVE_COLOR} 
      />
      {focused && <Animated.View style={styles.glowDot} />}
    </Animated.View>
  );
});

// --- البار الزجاجي ---
const GlassTabBar = React.memo(({ state, descriptors, navigation }) => { 
  const insets = useSafeAreaInsets();
  const { isTabBarVisible } = useUIState();
  const totalTabs = state.routes.length;
  const availableWidth = SCREEN_WIDTH - (TAB_BAR_MARGIN * 2);
  const tabWidth = availableWidth / totalTabs;

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withTiming(isTabBarVisible ? 0 : 200, { duration: 400 }) }],
  }));

  const translateX = useSharedValue(0);

  React.useEffect(() => {
    translateX.value = withSpring(state.index * tabWidth, {
      damping: 15,
      stiffness: 100,
    });
  }, [state.index]);

  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: tabWidth,
  }));

  return (
    <Animated.View style={[
      styles.tabContainer, 
      { bottom: insets.bottom + 15 }, 
      containerAnimatedStyle
    ]}>
      {/* ✅ تحسين الأداء: تقليل الشفافية في أندرويد لتقليل الحمل على GPU */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(30, 41, 59, 0.95)' }]} />
      )}
      
      <View style={styles.glassTint} />
      <LinearGradient
        colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.tabsWrapper}>
          <Animated.View style={[styles.activePill, indicatorAnimatedStyle]}>
             <LinearGradient
               colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
               style={styles.pillGradient}
             />
          </Animated.View>

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            
            let iconName = 'ellipse';
            if (route.name === 'index') iconName = 'home';
            else if (route.name === 'subjects') iconName = 'library';
            else if (route.name === 'tasks') iconName = 'time';
            else if (route.name === 'profile') iconName = 'person';

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                Haptics.selectionAsync();
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable 
                key={route.key} 
                onPress={onPress} 
                style={styles.tabButton}
              >
                <TabIcon name={iconName} focused={isFocused} />
              </Pressable>
            );
          })}
        </View>
    </Animated.View>
  );
});

// --- Layout الرئيسي ---
export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0C0F27' }}>
      <SwipeableTabs
        tabBarPosition="bottom"
        initialRouteName="index"
        sceneContainerStyle={{ backgroundColor: '#0C0F27' }}
        screenOptions={{
          headerShown: false,
          swipeEnabled: false,
          animationEnabled: false, // يمكن تعطيلها إذا استمر التعليق بجعلها false
          
          lazy: true,
          lazyPreloadDistance: 0, 
          
          tabBarStyle: { display: 'none' },
        }}
        tabBar={(props) => <GlassTabBar {...props} />}
      >
        <SwipeableTabs.Screen name="index" options={{ title: "الرئيسية" }} />
        <SwipeableTabs.Screen name="subjects" options={{ title: "المواد" }} />
        <SwipeableTabs.Screen name="tasks" options={{ title: "المهام" }} />
        <SwipeableTabs.Screen name="profile" options={{ title: "حسابي" }} />
      </SwipeableTabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    position: 'absolute',
    left: TAB_BAR_MARGIN,
    right: TAB_BAR_MARGIN,
    height: TAB_BAR_HEIGHT,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 15,
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'ios' 
      ? 'rgba(30, 30, 40, 0.4)' 
      : 'transparent', // إلغاء الطبقة الإضافية في أندرويد
  },
  tabsWrapper: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    width: 50,
  },
  glowDot: {
    position: 'absolute',
    bottom: -10,
    width: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
  activePill: {
    position: 'absolute',
    height: '80%',
    top: '10%',
    zIndex: 1,
    borderRadius: 35,
    paddingHorizontal: 5,
  },
  pillGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  }
});