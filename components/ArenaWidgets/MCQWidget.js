
import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { 
  FadeInDown, useSharedValue, useAnimatedStyle, withSpring, interpolateColor, withTiming 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { FontAwesome5 } from '@expo/vector-icons';

import { SoundManager } from '../../utils/SoundManager';
import { useLanguage } from '../../context/LanguageContext';

// ------------------------------------------------------------------
// 🎨 Sub-Component: Option Card
// ------------------------------------------------------------------
const OptionCard = React.memo(({ option, index, isSelected, onSelect, disabled, isRTL }) => {
  const scale = useSharedValue(1);

  // أنيميشن الضغط
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.97);
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    if (disabled) return;
    SoundManager.playSound('click');
    Haptics.selectionAsync();
    onSelect(option.id);
  };

  // الألوان الديناميكية
  const borderColor = isSelected ? '#38BDF8' : 'rgba(255,255,255,0.1)';
  const letterColor = isSelected ? '#0F172A' : '#94A3B8';
  const letterBg = isSelected ? '#38BDF8' : 'rgba(255,255,255,0.05)';

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).springify()} 
      style={{ marginBottom: 12 }}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        <Animated.View style={[styles.cardBase, { borderColor }, animatedStyle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          
          {/* الخلفية المتدرجة */}
          <LinearGradient
            colors={isSelected ? ['rgba(56, 189, 248, 0.2)', 'rgba(56, 189, 248, 0.05)'] : ['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.6)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />

          {/* دائرة الحرف (A, B, C...) */}
          <View style={[
              styles.circle, 
              { backgroundColor: letterBg },
              isRTL ? { marginLeft: 16 } : { marginRight: 16 }
          ]}>
            <Text style={[styles.optionLetter, { color: letterColor }]}>
                {String.fromCharCode(65 + index)}
            </Text>
          </View>
          
          {/* النص */}
          <Text style={[
              styles.optionText, 
              isSelected && styles.optionTextSelected,
              { textAlign: isRTL ? 'right' : 'left' }
          ]}>
            {option.text}
          </Text>

          {/* أيقونة الحالة (Check) */}
          {isSelected && (
              <Animated.View entering={FadeInDown.springify()} style={{ marginLeft: 8 }}>
                 <FontAwesome5 name="check-circle" size={16} color="#38BDF8" />
              </Animated.View>
          )}

          {/* الشريط المضيء الجانبي */}
          {isSelected && (
             <View style={[styles.glowBar, isRTL ? { right: 0 } : { left: 0 }]} />
          )}

        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

// ------------------------------------------------------------------
// 🚀 Main Widget: MCQWidget
// ------------------------------------------------------------------
export const MCQWidget = ({ question, onAnswer }) => {
  const [selectedId, setSelectedId] = useState(null);
  const { isRTL } = useLanguage();

  // تحصين البيانات: التأكد من وجود الخيارات
  const options = useMemo(() => {
      return Array.isArray(question?.options) ? question.options : [];
  }, [question]);

  const handleSelect = (optionId) => {
    if (selectedId !== null) return; // قفل بعد الاختيار الأول
    setSelectedId(optionId);
    
    // إرسال الإجابة فوراً
    if (onAnswer) {
        onAnswer(optionId);
    }
  };

  if (options.length === 0) {
      return <Text style={{color: 'red', textAlign: 'center'}}>No options provided</Text>;
  }

  return (
    <View style={styles.container}>
      {options.map((option, index) => (
        <OptionCard
          key={option.id}
          index={index}
          option={option}
          isSelected={selectedId === option.id}
          onSelect={handleSelect}
          disabled={selectedId !== null}
          isRTL={isRTL}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
      marginTop: 10,
      paddingHorizontal: 2 
  },
  
  cardBase: {
    alignItems: 'center', 
    borderRadius: 16, 
    borderWidth: 1, 
    overflow: 'hidden',
    paddingHorizontal: 16, 
    paddingVertical: 18,
    minHeight: 70,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },

  circle: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },

  optionLetter: { 
      fontWeight: '900', 
      fontSize: 16 
  },

  optionText: { 
      color: '#CBD5E1', 
      fontSize: 16, 
      fontWeight: '500', 
      flex: 1,
      lineHeight: 24
  },
  
  optionTextSelected: { 
      color: 'white', 
      fontWeight: '700' 
  },

  glowBar: { 
      position: 'absolute', 
      top: 0, 
      bottom: 0, 
      width: 4, 
      backgroundColor: '#38BDF8',
      shadowColor: "#38BDF8",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
  }
});