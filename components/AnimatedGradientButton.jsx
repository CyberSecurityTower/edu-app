// components/AnimatedGradientButton.jsx
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

const AnimatedGradientButton = ({ text, onPress, buttonWidth = 200, buttonHeight = 50, fontSize = 16, borderRadius, disabled = false }) => {
  const finalBorderRadius = borderRadius !== undefined ? borderRadius : buttonHeight / 2;

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <MotiView
        from={{ scale: 1 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        style={[
          styles.buttonContainer, 
          { width: buttonWidth, height: buttonHeight, borderRadius: finalBorderRadius },
          disabled && styles.disabled
        ]}
      >
        <LinearGradient
          colors={disabled ? ['#4B5563', '#374151'] : ['#34D399', '#10B981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { borderRadius: finalBorderRadius }]}
        >
          <Text style={[styles.buttonText, { fontSize }]}>{text}</Text>
        </LinearGradient>
      </MotiView>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disabled: {
    shadowOpacity: 0,
    elevation: 0,
  }
});

export default AnimatedGradientButton;