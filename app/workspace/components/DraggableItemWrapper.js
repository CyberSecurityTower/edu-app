import React from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, runOnJS } from 'react-native-reanimated'; // ✅ إضافة runOnJS
import * as Haptics from 'expo-haptics';

const DraggableItemWrapper = ({ children, item, onDragStart, onDragUpdate, onDragEnd, isHidden }) => {
  
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(300) 
    .onStart((event) => {
      'worklet'; // ✅ تعريف أنها تعمل على UI Thread
      if (onDragStart) {
        // ✅ تشغيل الهزاز على JS Thread
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        // ✅ استدعاء الدالة الأم على JS Thread
        runOnJS(onDragStart)(item, { x: event.absoluteX, y: event.absoluteY });
      }
    })
    .onUpdate((event) => {
      'worklet';
      if (onDragUpdate) {
        // ✅ الحل الجذري لمشكلة ReanimatedError
        runOnJS(onDragUpdate)(event.absoluteX, event.absoluteY);
      }
    })
    .onEnd(() => {
      'worklet';
      if (onDragEnd) {
        runOnJS(onDragEnd)();
      }
    });

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: isHidden ? 0 : 1,
      transform: [{ scale: isHidden ? 0.95 : 1 }]
    };
  }, [isHidden]);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={containerStyle}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

export default DraggableItemWrapper;