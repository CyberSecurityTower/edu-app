import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withDelay,
  interpolate, 
  interpolateColor,
  ZoomIn,
  ZoomOut,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../context/LanguageContext';

// --- Text Direction Helpers ---
const isRTLText = (text) => {
  const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return rtlRegex.test(text);
};

// --- Animation Physics ---
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

// --- Action Button Component ---
const ActionItem = ({ icon, color, onPress, index, isVisible }) => {
  const style = useAnimatedStyle(() => {
    return {
      opacity: withDelay(index * 50, withTiming(isVisible ? 1 : 0, { duration: 250 })),
      transform: [
        { scale: withDelay(index * 50, withSpring(isVisible ? 1 : 0, SPRING_CONFIG)) },
        { translateY: withDelay(index * 30, withSpring(isVisible ? 0 : 20, SPRING_CONFIG)) }
      ]
    };
  });

  return (
    <Animated.View style={[styles.actionItem, style]}>
      <Pressable 
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }} 
        style={({ pressed }) => [
          styles.actionBtn, 
          { backgroundColor: color, transform: [{ scale: pressed ? 0.9 : 1 }] }
        ]}
      >
        {icon}
      </Pressable>
    </Animated.View>
  );
};

// --- Status Icon Component ---
const StatusIcon = ({ activeType, isOpen }) => {
  if (isOpen) {
    return (
        <Animated.View entering={ZoomIn.duration(200)} exiting={ZoomOut.duration(200)}>
            <Feather name="x" size={24} color="#64748B" /> 
        </Animated.View>
    );
  }
  
  // عرض الأيقونة بناءً على نوع المرفقات الحالي
  switch (activeType) {
    case 'gallery': return <Ionicons name="images" size={22} color="#3B82F6" />;
    case 'camera': return <Ionicons name="camera" size={22} color="#10B981" />;
    case 'file': return <MaterialCommunityIcons name="file-document" size={22} color="#F59E0B" />;
    case 'web': return <MaterialCommunityIcons name="web" size={22} color="#8B5CF6" />;
    case 'mixed': return <MaterialCommunityIcons name="layers-triple" size={22} color="#64748B" />;
    default: return <Feather name="plus" size={26} color="black" />;
  }
};

export default function DynamicIslandInput({ 
  value, 
  onChangeText, 
  placeholder, 
  onActionSelect,
  isEnabled,
  activeType = null 
}) {
  const { language } = useLanguage(); // مفترض أن لديك context للغة
  const isAppRTL = language === 'ar'; 

  const mode = useSharedValue(0); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // تحديد اتجاه النص تلقائياً
  const getTextAlignment = () => {
    if (!value || value.length === 0) {
      return isAppRTL ? 'right' : 'left';
    }
    return isRTLText(value) ? 'right' : 'left';
  };

  // إغلاق القائمة عند اختيار نوع مرفق
  useEffect(() => {
    if (isMenuOpen && activeType) {
       // يمكن تفعيل هذا السطر لإغلاق القائمة تلقائياً عند وجود مرفق، لكن تركه يمنح تحكماً أفضل
       // toggleMode(); 
    }
  }, [activeType]);

  const toggleMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextState = !isMenuOpen;
    setIsMenuOpen(nextState);
    mode.value = withSpring(nextState ? 1 : 0, SPRING_CONFIG);
  };

  const handleSelect = (type) => {
    onActionSelect(type);
    toggleMode(); // إغلاق القائمة بعد الاختيار
  };

  // --- Animations Styles ---
  const containerStyle = useAnimatedStyle(() => ({
      backgroundColor: interpolateColor(mode.value, [0, 1], ['#FFFFFF', '#F8FAFC']),
      borderColor: interpolateColor(mode.value, [0, 1], ['#E2E8F0', '#CBD5E1']),
      width: interpolate(mode.value, [0, 1], [100, 100], 'clamp') + '%', 
  }));

  const toggleBtnStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${interpolate(mode.value, [0, 1], [0, 90])}deg` }], // دوران الزر
      backgroundColor: interpolateColor(mode.value, [0, 1], ['#FFFFFF', '#F1F5F9']),
      borderColor: interpolateColor(mode.value, [0, 1], ['#F1F5F9', '#CBD5E1']),
  }));

  const inputStyle = useAnimatedStyle(() => ({
      opacity: interpolate(mode.value, [0, 0.2], [1, 0]),
      transform: [{ translateY: interpolate(mode.value, [0, 1], [0, 20]) }],
      zIndex: isMenuOpen ? -1 : 1,
  }));

  const actionsStyle = useAnimatedStyle(() => ({
      zIndex: isMenuOpen ? 1 : -1,
      pointerEvents: isMenuOpen ? 'auto' : 'none',
  }));

  return (
    <View style={styles.wrapper}>
      {/* زر التبديل (الزائد/الإغلاق) */}
      <View style={styles.leftContainer}>
        <Pressable onPress={toggleMode}>
          <Animated.View style={[styles.toggleBtn, toggleBtnStyle]}>
            <Animated.View 
                key={isMenuOpen ? 'close' : (activeType || 'plus')}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
            >
                <StatusIcon activeType={activeType} isOpen={isMenuOpen} />
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>

      {/* الحاوية الرئيسية (حقل النص + الأزرار) */}
      <Animated.View style={[styles.mainContainer, containerStyle]}>
        
        {/* طبقة حقل الكتابة */}
        <Animated.View style={[styles.layer, inputStyle]}>
          <TextInput
            style={[
                styles.input, 
                { textAlign: getTextAlignment() }
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            editable={!isMenuOpen && isEnabled}
            multiline
            textAlignVertical="center"
            // إصلاح اتجاه الكتابة في iOS
            writingDirection={getTextAlignment() === 'right' ? 'rtl' : 'ltr'} 
          />
        </Animated.View>

        {/* طبقة الأزرار (Gallery, Camera, File, Web) */}
        <Animated.View style={[styles.layer, styles.actionsLayer, actionsStyle]}>
            
            {/* 1. Gallery */}
            <ActionItem 
                index={0} isVisible={isMenuOpen}
                icon={<Ionicons name="images" size={20} color="#3B82F6" />} 
                color="#EFF6FF"
                onPress={() => handleSelect('gallery')}
            />

            {/* 2. Camera */}
            <ActionItem 
                index={1} isVisible={isMenuOpen}
                icon={<Ionicons name="camera" size={20} color="#10B981" />} 
                color="#ECFDF5"
                onPress={() => handleSelect('camera')}
            />
            
            {/* 3. Document / File (الجديد) */}
            <ActionItem 
                index={2} isVisible={isMenuOpen}
                icon={<MaterialCommunityIcons name="file-document" size={20} color="#F59E0B" />}
                color="#FFFBEB"
                onPress={() => handleSelect('file')}
            />
            
            {/* 4. Web Search */}
             <ActionItem 
                index={3} isVisible={isMenuOpen}
                icon={<MaterialCommunityIcons name="web" size={20} color="#8B5CF6" />}
                color="#F5F3FF"
                onPress={() => handleSelect('web')}
            />
        </Animated.View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },
  leftContainer: {
    marginRight: 8,
    marginBottom: 2, 
    zIndex: 20, 
  },
  toggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  mainContainer: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    color: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: '100%',
    paddingTop: 12, // ضمان توسيط النص عمودياً بشكل جيد
  },
  actionsLayer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  }
});