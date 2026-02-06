
// context/FabContext.js

import { useSegments } from 'expo-router'; // ✅ استيراد useSegments
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useUIState } from './UIStateContext';
import { View, Platform } from 'react-native'; 

const FabContext = createContext({
  fabConfig: null,
  setFabConfig: () => {},
});

export const useFab = () => useContext(FabContext);

export const FabProvider = ({ children }) => {
  const [fabConfig, setFabConfig] = useState(null);
  const segments = useSegments(); // معرفة المسار الحالي
  
  let isTabBarVisible = true;
  try {
    const uiState = useUIState();
    if (uiState) isTabBarVisible = uiState.isTabBarVisible;
  } catch (e) {}

  // ✅✅✅ التعديل هنا: تحديد دقيق لأماكن الظهور ✅✅✅
  const shouldShowFab = useMemo(() => {
    // الحصول على اسم الشاشة الحالية (آخر جزء في الرابط)
    const currentScreen = segments[segments.length - 1];
    
    // هل نحن داخل مجموعة التبويبات؟
    const inTabsGroup = segments.includes('(tabs)');

    // 1. السماح في صفحة عرض الدرس (لأن الشات ضروري هناك)
    if (currentScreen === 'lesson-view') return true;

    // 2. السماح في التبويب الرئيسي فقط (index)
    // هذا سيمنع ظهوره في tasks, profile, subjects
    if (inTabsGroup && currentScreen === 'index') return true;

    // في أي مكان آخر (auth, onboarding, tasks, profile...) -> إخفاء
    return false;
  }, [segments]);

  const fabVisibility = useSharedValue(0);

  useEffect(() => {
    // إضافة شرط shouldShowFab للأنيميشن
    const shouldBeVisible = fabConfig && isTabBarVisible && shouldShowFab;
    fabVisibility.value = withTiming(shouldBeVisible ? 1 : 0, { duration: 250 });
  }, [fabConfig, isTabBarVisible, shouldShowFab]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      fabVisibility.value,
      [0, 1],
      [100, 0]
    );
    return {
      opacity: fabVisibility.value,
      transform: [{ translateY }],
    };
  });

  const value = useMemo(() => ({
    fabConfig,
    setFabConfig,
  }), [fabConfig, setFabConfig]);

  const FabComponent = fabConfig?.component;

  return (
    <FabContext.Provider value={value}>
      {children}
      
      {/* رسم الزر فقط إذا تحقق الشرط */}
      {FabComponent && shouldShowFab && (
        <Animated.View 
          style={[styles.fabContainer, animatedStyle]} 
          pointerEvents={fabConfig && isTabBarVisible && shouldShowFab ? 'auto' : 'none'}
        >
          <FabComponent {...fabConfig.props} />
        </Animated.View>
      )}
    </FabContext.Provider>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    zIndex: 50,
    
    // تخصيص الارتفاع حسب النظام
    bottom: Platform.select({
        ios: 160,    
        android: 155  
    }),
    
    right: 25,
  },
});