
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { 
  ZoomIn, useSharedValue, useAnimatedStyle, withSpring, interpolate 
} from 'react-native-reanimated';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { SoundManager } from '../../utils/SoundManager';
import { useLanguage } from '../../context/LanguageContext';
import { ARENA_TEXTS } from '../../data/ArenaTranslations';

const TFButton = ({ type, text, isSelected, disabled, onPress, style }) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: interpolate(glowOpacity.value, [0, 1], [0.2, 0.6]),
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1);
  };

  const isTrue = type === 'TRUE';
  const mainColor = isTrue ? '#10B981' : '#EF4444';
  const gradientColors = isTrue ? ['#10B981', '#059669'] : ['#EF4444', '#B91C1C'];
  const iconName = isTrue ? 'check' : 'times';

  return (
    <Animated.View 
        style={[
            styles.btnWrapper, 
            style, 
            animatedStyle, 
            { shadowColor: mainColor } // ✅ التصحيح هنا
        ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[styles.btnInner, { borderColor: isSelected ? 'white' : `${mainColor}40` }]}
      >
        {isSelected ? (
           <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        ) : (
           <View style={[styles.bgOverlay, { backgroundColor: mainColor }]} />
        )}

        <View style={[styles.watermarkIcon, { right: -20, bottom: -20 }]}>
            <FontAwesome5 name={iconName} size={80} color={isSelected ? 'rgba(255,255,255,0.2)' : `${mainColor}20`} />
        </View>

        <View style={styles.content}>
            <View style={[styles.iconCircle, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${mainColor}20` }]}>
                <FontAwesome5 name={iconName} size={28} color={isSelected ? 'white' : mainColor} />
            </View>
            <Text style={[styles.btnText, { color: isSelected ? 'white' : mainColor }]}>
                {text}
            </Text>
        </View>

      </Pressable>
    </Animated.View>
  );
};

export const TrueFalseWidget = ({ onAnswer, question, questionType = 'TRUE_FALSE' }) => {
  if (!question) return null;

  const { language, isRTL } = useLanguage();
  const t = ARENA_TEXTS[language] || ARENA_TEXTS.en;
  const [selected, setSelected] = useState(null);
  
  const isYesNo = questionType === 'YES_NO';
  const trueDisplayText = isYesNo ? t.widgets.yn_yes : t.widgets.tf_true;
  const falseDisplayText = isYesNo ? t.widgets.yn_no : t.widgets.tf_false;
  const trueVal = isYesNo ? "YES" : "TRUE";
  const falseVal = isYesNo ? "NO" : "FALSE";

  const handlePress = (value) => {
    if (selected !== null) return;
    
    // ✅ استبدال 'pop' بـ 'click' لأن 'pop' غير موجود
    SoundManager.playSound('click'); 
    Haptics.selectionAsync();
    
    setSelected(value);
    onAnswer(value);
  };

  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Animated.View entering={ZoomIn.delay(100)} style={{ flex: 1 }}>
        <TFButton 
            type="TRUE" 
            text={trueDisplayText}
            isSelected={selected === trueVal}
            disabled={selected !== null}
            onPress={() => handlePress(trueVal)}
        />
      </Animated.View>
      <View style={{ width: 16 }} />
      <Animated.View entering={ZoomIn.delay(200)} style={{ flex: 1 }}>
        <TFButton 
            type="FALSE" 
            text={falseDisplayText}
            isSelected={selected === falseVal}
            disabled={selected !== null}
            onPress={() => handlePress(falseVal)}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: 160, marginTop: 20, paddingHorizontal: 4 },
  btnWrapper: { flex: 1, shadowOffset: { width: 0, height: 8 }, shadowRadius: 10, elevation: 8 },
  btnInner: { flex: 1, borderRadius: 24, borderWidth: 2, overflow: 'hidden', backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.08 },
  watermarkIcon: { position: 'absolute', transform: [{ rotate: '-15deg' }] },
  content: { alignItems: 'center', gap: 12, zIndex: 10 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  btnText: { fontSize: 20, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }
});