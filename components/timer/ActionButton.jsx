

import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

// A faster spring config for an instant, "clicky" feel.
const SPRING_CONFIG = { damping: 15, stiffness: 500, mass: 0.5 };

const ActionButton = ({ onPress, iconName, iconSize, iconColor, style, accessibilityLabel }) => {
  const scale = useSharedValue(1);

  const onPressIn = () => {
    scale.value = withSpring(0.9, SPRING_CONFIG);
  };
  const onPressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[styles.button, style]}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
      >
        <FontAwesome5 name={iconName} size={iconSize} color={iconColor} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(ActionButton);