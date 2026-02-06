
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, useAnimatedStyle, useAnimatedGestureHandler, useAnimatedReaction, 
  withSpring, withTiming, runOnJS, interpolate 
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { SoundManager } from '../../utils/SoundManager';
import { useLanguage } from '../../context/LanguageContext';
import { ARENA_TEXTS } from '../../data/ArenaTranslations';

// --- Constants ---
const ITEM_HEIGHT = 72;
const MARGIN_BOTTOM = 12;
const ACTUAL_HEIGHT = ITEM_HEIGHT - MARGIN_BOTTOM; 

// --- Helpers ---
const clamp = (value, lowerBound, upperBound) => {
  'worklet';
  return Math.max(lowerBound, Math.min(value, upperBound));
};

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// ------------------------------------------------------------------
// 🧱 Sub-Component: SortableItem
// ------------------------------------------------------------------
const SortableItem = React.memo(({ item, index, positions, itemsCount, onDragEnd, enabled, isRTL }) => {
  const [isActive, setIsActive] = useState(false);
  
  const currentPos = positions.value[item.id];
  const initialTop = typeof currentPos === 'number' ? currentPos * ITEM_HEIGHT : index * ITEM_HEIGHT;
  
  const top = useSharedValue(initialTop);
  const isMoving = useSharedValue(0);

  useAnimatedReaction(
    () => positions.value[item.id],
    (currentPosition, previousPosition) => {
      if (typeof currentPosition === 'number' && currentPosition !== previousPosition) {
        if (!isActive) {
            top.value = withSpring(currentPosition * ITEM_HEIGHT, { damping: 15, stiffness: 150 });
        }
      }
    },
    [isActive]
  );

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      if (!enabled) return;
      runOnJS(setIsActive)(true);
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      ctx.startY = top.value;
      isMoving.value = withTiming(1, { duration: 150 });
    },
    onActive: (event, ctx) => {
      if (!enabled) return;
      top.value = ctx.startY + event.translationY;
      const newOrder = clamp(Math.floor(top.value / ITEM_HEIGHT + 0.5), 0, itemsCount - 1);
      
      if (newOrder !== positions.value[item.id]) {
        const oldOrder = positions.value[item.id];
        const idToSwap = Object.keys(positions.value).find(key => positions.value[key] === newOrder);
        
        if (idToSwap) {
          const newPositions = { ...positions.value };
          newPositions[item.id] = newOrder;
          newPositions[idToSwap] = oldOrder;
          positions.value = newPositions;
          runOnJS(Haptics.selectionAsync)();
        }
      }
    },
    onEnd: () => {
      if (!enabled) return;
      const finalPos = positions.value[item.id];
      if (typeof finalPos === 'number') {
          top.value = withSpring(finalPos * ITEM_HEIGHT, { damping: 16, stiffness: 200 });
      }
      runOnJS(setIsActive)(false);
      runOnJS(SoundManager.playSound)('card_flip');
      runOnJS(onDragEnd)();
      isMoving.value = withTiming(0, { duration: 150 });
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(isMoving.value, [0, 1], [1, 1.05]);
    const zIndex = isActive ? 100 : 1;
    const shadowOpacity = interpolate(isMoving.value, [0, 1], [0, 0.3]);

    return {
      position: 'absolute',
      top: top.value,
      left: 0,
      right: 0,
      height: ACTUAL_HEIGHT,
      zIndex,
      transform: [{ scale }],
      shadowOpacity, 
      shadowRadius: 10,
    };
  });

  const borderColor = isActive ? '#38BDF8' : 'rgba(255,255,255,0.1)';
  const iconColor = isActive ? '#38BDF8' : '#64748B';

  return (
    <Animated.View 
      style={[
        styles.itemWrapper, 
        { shadowOffset: { width: 0, height: 4 }, shadowColor: '#38BDF8' }, 
        animatedStyle
      ]}
    >
      {/* ✅ تم إزالة المسافات الزائدة هنا */}
      <PanGestureHandler onGestureEvent={gestureHandler} enabled={enabled}>
        <Animated.View style={[styles.cardContent, { borderColor, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            
            <LinearGradient
                colors={isActive ? ['rgba(56, 189, 248, 0.15)', 'rgba(15, 23, 42, 0.9)'] : ['rgba(30, 41, 59, 0.7)', 'rgba(15, 23, 42, 0.8)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
            />

            <View style={[
                styles.dragHandle, 
                isRTL ? { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.05)' } : { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.05)' }
            ]}>
                <MaterialCommunityIcons name="drag-vertical-variant" size={20} color={iconColor} />
            </View>

            <Text 
                numberOfLines={2} 
                style={[
                    styles.itemText, 
                    isActive && styles.itemTextActive,
                    { textAlign: isRTL ? 'right' : 'left' }
                ]}
            >
                {item.text}
            </Text>

            <View style={[styles.rankIndicator, isRTL ? { marginRight: 12 } : { marginLeft: 12 }]}>
                 <FontAwesome5 name="bars" size={12} color="rgba(255,255,255,0.2)" />
            </View>

        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
});

// ------------------------------------------------------------------
// 🚀 Main Widget: OrderingWidget
// ------------------------------------------------------------------
export const OrderingWidget = ({ question, onAnswer }) => {
  const [items, setItems] = useState([]);
  const positions = useSharedValue({});
  const [submitted, setSubmitted] = useState(false);
  
  const { language, isRTL } = useLanguage();
  const t = ARENA_TEXTS[language] || ARENA_TEXTS.en;

  const itemsList = useMemo(() => Array.isArray(question?.items) ? question.items : [], [question]);
  const containerHeight = itemsList.length * ITEM_HEIGHT;

  useEffect(() => {
    if (itemsList.length === 0) return;
    
    const shuffled = shuffleArray(itemsList);
    const initialPositions = {};
    shuffled.forEach((item, index) => { initialPositions[item.id] = index; });
    
    positions.value = initialPositions;
    setItems(shuffled);
    setSubmitted(false);
  }, [itemsList]);

  const handleSubmit = useCallback(() => {
    if (!positions.value || submitted) return;
    setSubmitted(true);
    
    const finalOrder = Object.keys(positions.value).sort((a, b) => positions.value[a] - positions.value[b]);
    
    SoundManager.playSound('click');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    onAnswer(finalOrder);
  }, [submitted, onAnswer, positions]); // أضفت positions للتبعيات

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6}}>
             <MaterialCommunityIcons name="sort-variant" size={16} color="#38BDF8" />
             <Text style={styles.hintText}>{t.widgets.ordering_hint}</Text>
        </View>
      </View>

      <View style={{ height: containerHeight, marginTop: 10, position: 'relative' }}>
        
        <View style={[StyleSheet.absoluteFill, { paddingVertical: ACTUAL_HEIGHT / 2 - 10 }]}>
            {items.map((_, idx) => (
                <View key={idx} style={[styles.rankBackdrop, { top: idx * ITEM_HEIGHT, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.rankNumber}>{idx + 1}</Text>
                </View>
            ))}
        </View>

        {items.map((item, index) => (
          <SortableItem
            key={item.id}
            item={item}
            index={index}
            positions={positions}
            itemsCount={items.length}
            onDragEnd={() => {}}
            enabled={!submitted}
            isRTL={isRTL}
          />
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.submitBtn, submitted && { opacity: 0.8 }]} 
        onPress={handleSubmit} 
        activeOpacity={0.9} 
        disabled={submitted}
      >
           <LinearGradient 
             colors={submitted ? ['#334155', '#1E293B'] : ['#F59E0B', '#D97706']} 
             style={[styles.gradientBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
           >
              <Text style={[styles.submitText, submitted && {color: '#94A3B8'}]}>
                  {submitted ? "Verifying..." : t.widgets.ordering_btn_default}
              </Text>
              {!submitted && <MaterialCommunityIcons name="check-all" size={20} color="white" />}
           </LinearGradient>
      </TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 10 },
  header: { justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 8 },
  hintText: { color: '#38BDF8', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  itemWrapper: { width: '100%' },
  cardContent: { flex: 1, alignItems: 'center', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  dragHandle: { width: 44, height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  itemText: { flex: 1, color: '#CBD5E1', fontWeight: '600', fontSize: 14, paddingHorizontal: 16, lineHeight: 20 },
  itemTextActive: { color: 'white', fontWeight: '700' },
  rankIndicator: { width: 20, alignItems: 'center' },
  rankBackdrop: { position: 'absolute', left: 0, right: 0, height: 20, paddingHorizontal: 16, alignItems: 'center', opacity: 0.3, justifyContent: 'flex-start' },
  rankNumber: { color: '#64748B', fontSize: 12, fontWeight: '900', marginHorizontal: 10 },
  submitBtn: { height: 56, borderRadius: 16, overflow: 'hidden', marginTop: 20, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  gradientBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  submitText: { color: 'white', fontWeight: '800', fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' }
});