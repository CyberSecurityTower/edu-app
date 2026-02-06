
import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, Text, Pressable, StyleSheet, TouchableOpacity, Platform, UIManager, LayoutAnimation 
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, ZoomIn, useSharedValue, useAnimatedStyle, withSpring, interpolateColor, withTiming 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { SoundManager } from '../../utils/SoundManager';
import { useLanguage } from '../../context/LanguageContext';
import { ARENA_TEXTS } from '../../data/ArenaTranslations';

// تفعيل LayoutAnimation للأندرويد
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ------------------------------------------------------------------
// 🎨 Sub-Component: Option Card (Memoized for Performance)
// ------------------------------------------------------------------
const OptionCard = React.memo(({ option, isSelected, isDisabled, onToggle, index, isRTL }) => {
  
  // أنيميشن عند الضغط (Scale)
  const scale = useSharedValue(1);
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePressIn = () => {
    if (isDisabled) return;
    scale.value = withSpring(0.97);
  };

  const handlePressOut = () => {
    if (isDisabled) return;
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    if (isDisabled) return;
    onToggle(option.id);
  };

  // ألوان ديناميكية
  const borderColor = isSelected ? '#38BDF8' : 'rgba(255,255,255,0.1)';
  const iconColor = isSelected ? '#0F172A' : 'transparent';
  
  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 60).springify()} 
      style={{ marginBottom: 12 }}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
      >
        <Animated.View style={[styles.cardBase, { borderColor }, animatedCardStyle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          
          {/* خلفية متدرجة */}
          <LinearGradient
            colors={isSelected ? ['rgba(56, 189, 248, 0.15)', 'rgba(56, 189, 248, 0.05)'] : ['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.6)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Checkbox */}
          <View style={[
              styles.checkboxBase, 
              isSelected && styles.checkboxActive,
              isRTL ? { marginLeft: 16 } : { marginRight: 16 }
          ]}>
             {isSelected && (
                <Animated.View entering={ZoomIn}>
                    <FontAwesome5 name="check" size={10} color={iconColor} />
                </Animated.View>
             )}
          </View>

          {/* Text */}
          <Text style={[
              styles.optionText, 
              isSelected && styles.optionTextSelected,
              { textAlign: isRTL ? 'right' : 'left' }
          ]}>
              {option.text}
          </Text>

          {/* Side Glow Bar */}
          {isSelected && (
             <Animated.View 
                entering={FadeInDown} 
                style={[styles.glowBar, isRTL ? { right: 0 } : { left: 0 }]} 
             />
          )}

        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

// ------------------------------------------------------------------
// 🚀 Main Widget: MCMWidget
// ------------------------------------------------------------------
export const MCMWidget = ({ question, onAnswer }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const { language, isRTL } = useLanguage();
  const t = ARENA_TEXTS[language] || ARENA_TEXTS.en;

  // تحصين البيانات: ضمان وجود مصفوفة خيارات
  const options = useMemo(() => {
      return Array.isArray(question?.options) ? question.options : [];
  }, [question]);

  const toggleSelection = useCallback((id) => {
    if (submitted) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    setSelectedIds(prev => {
        const exists = prev.includes(id);
        
        // Haptics Logic
        if (exists) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Deselect feels lighter
            return prev.filter(item => item !== id);
        } else {
            SoundManager.playSound('click');
            Haptics.selectionAsync(); // Select feels crisp
            return [...prev, id];
        }
    });
  }, [submitted]);

  const handleSubmit = () => {
      if (selectedIds.length === 0 || submitted) return;
      if (!onAnswer) {
          console.error("[MCMWidget] onAnswer prop is missing!");
          return;
      }
      
      SoundManager.playSound('click');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setSubmitted(true); 
      
      // إرسال الإجابة فوراً
      onAnswer(selectedIds);
  };

  // إذا لم تكن هناك خيارات، نعرض رسالة خطأ بدلاً من كراش التطبيق
  if (options.length === 0) {
      return (
          <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={30} color="#EF4444" />
              <Text style={styles.errorText}>Data Error: No options available.</Text>
          </View>
      );
  }

  return (
    <View style={styles.container}>
      
      {/* Header Info */}
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6}}>
            <MaterialCommunityIcons name="checkbox-multiple-marked-outline" size={16} color="#94A3B8" />
            <Text style={styles.hintText}>{t.widgets.mcm_hint}</Text>
        </View>
        
        <View style={[styles.counterBadge, selectedIds.length > 0 && styles.counterBadgeActive]}>
            <Text style={[styles.counterText, selectedIds.length > 0 && {color: '#E0F2FE'}]}>
                {selectedIds.length} {t.widgets.mcm_selected}
            </Text>
        </View>
      </View>

      {/* Options List */}
      <View style={styles.listContainer}>
        {options.map((option, index) => (
            <OptionCard 
                key={option.id}
                index={index}
                option={option}
                isSelected={selectedIds.includes(option.id)}
                isDisabled={submitted}
                onToggle={toggleSelection}
                isRTL={isRTL}
            />
        ))}
      </View>

      {/* Submit Button */}
      <TouchableOpacity 
        style={[styles.submitBtnWrapper]}
        onPress={handleSubmit}
        disabled={selectedIds.length === 0 || submitted}
        activeOpacity={0.9}
      >
        <LinearGradient
            colors={
                submitted ? ['#334155', '#1E293B'] : 
                selectedIds.length > 0 ? ['#38BDF8', '#0284C7'] : 
                ['#1E293B', '#0F172A']
            }
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.submitBtnGradient, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
            {submitted ? (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    <ActivityDot delay={0} />
                    <ActivityDot delay={200} />
                    <ActivityDot delay={400} />
                </View>
            ) : (
                <>
                    <Text style={[styles.submitText, selectedIds.length === 0 && {color: '#64748B'}]}>
                        {t.widgets.mcm_btn_default}
                    </Text>
                    {selectedIds.length > 0 && (
                        <Animated.View entering={ZoomIn}>
                            <FontAwesome5 name={isRTL ? "arrow-left" : "arrow-right"} size={14} color="white" />
                        </Animated.View>
                    )}
                </>
            )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// 🌀 Simple Loading Dot Component for Button
const ActivityDot = ({ delay }) => {
    const opacity = useSharedValue(0.3);
    React.useEffect(() => {
        opacity.value = withSpring(1, { duration: 1000 }); // Simple pulse logic can be added here
    }, []);
    return <Animated.View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: '#94A3B8', opacity: 0.8, marginHorizontal: 2}} />;
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  errorContainer: {
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  errorText: { color: '#EF4444', marginTop: 8, fontWeight: 'bold' },

  headerRow: { 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: 16,
      paddingHorizontal: 4
  },
  hintText: { 
      color: '#94A3B8', 
      fontSize: 11, 
      fontWeight: '700', 
      letterSpacing: 0.5,
      textTransform: 'uppercase'
  },
  counterBadge: { 
      backgroundColor: 'rgba(30, 41, 59, 0.5)', 
      paddingHorizontal: 10, 
      paddingVertical: 4, 
      borderRadius: 8, 
      borderWidth: 1, 
      borderColor: 'rgba(255,255,255,0.05)' 
  },
  counterBadgeActive: {
      backgroundColor: 'rgba(56, 189, 248, 0.2)',
      borderColor: '#38BDF8'
  },
  counterText: { 
      color: '#64748B', 
      fontSize: 11, 
      fontWeight: '800' 
  },

  listContainer: {
      marginBottom: 20
  },

  // Card Styles
  cardBase: {
      minHeight: 64,
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
  },
  
  checkboxBase: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: '#64748B',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.2)'
  },
  checkboxActive: {
      backgroundColor: '#38BDF8',
      borderColor: '#38BDF8',
      shadowColor: "#38BDF8",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 5,
  },

  optionText: { 
      color: '#CBD5E1', 
      fontSize: 15, 
      fontWeight: '500', 
      flex: 1,
      lineHeight: 22
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
      shadowRadius: 10,
  },

  // Button Styles
  submitBtnWrapper: {
      marginTop: 'auto',
      borderRadius: 20, 
      overflow: 'hidden', 
      height: 58,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6
  },
  submitBtnGradient: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      gap: 12 
  },
  submitText: { 
      color: 'white', 
      fontWeight: '900', 
      fontSize: 16, 
      letterSpacing: 1,
      textTransform: 'uppercase'
  }
});