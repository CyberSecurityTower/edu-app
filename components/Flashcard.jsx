// components/Flashcard.jsx
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const Flashcard = ({ frontText, backText }) => {
  const rotate = useSharedValue(0);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = interpolate(rotate.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotateY: `${rotateValue}deg` }],
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = interpolate(rotate.value, [0, 1], [180, 360]);
    return {
      transform: [{ rotateY: `${rotateValue}deg` }],
    };
  });

  const flipCard = () => {
    rotate.value = withTiming(rotate.value === 0 ? 1 : 0, { duration: 500 });
  };

  return (
    <Pressable onPress={flipCard} style={styles.cardContainer}>
      {/* Front of the card */}
      <Animated.View style={[styles.card, styles.cardFront, frontAnimatedStyle]}>
        <LinearGradient
          colors={['#1E293B', '#334155']}
          style={styles.gradient}
        >
          <Text style={styles.cardText}>{frontText}</Text>
        </LinearGradient>
      </Animated.View>
      
      {/* Back of the card */}
      <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
        <LinearGradient
          colors={['#10B981', '#34D399']}
          style={styles.gradient}
        >
          <Text style={styles.cardText}>{backText}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    height: 250,
    borderRadius: 20,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden', // This is the magic that makes the flip work
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardFront: {
    // No specific styles needed here
  },
  cardBack: {
    transform: [{ rotateY: '180deg' }],
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default Flashcard;