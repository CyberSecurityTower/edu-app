// components/MagicTriggerFAB.jsx
import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet, Image } from 'react-native';
import { MotiView } from 'moti';
import LottieView from 'lottie-react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

const MagicTriggerFAB = ({ isOpen, onPress }) => {
  const [isAnimating, setIsAnimating] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsAnimating(true);
      return () => {};
    }, [])
  );

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Pressable onPress={handlePress}>
      <MotiView
        style={styles.fab}
        animate={{ rotate: isOpen ? '135deg' : '0deg' }}
        transition={{ type: 'timing', duration: 250 }}
      >
        {isAnimating ? (
          <LottieView
            source={require('../assets/images/magic.json')}
            autoPlay
            loop={false}
            onAnimationFinish={() => setIsAnimating(false)}
            style={styles.lottie}
            renderMode="HARDWARE"
          />
        ) : (
          <Image
            source={require('../assets/images/magic.png')}
            style={styles.image}
          />
        )}
      </MotiView>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fab: { 
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#1F2937',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    shadowColor: '#34D399', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 10,
  },
  lottie: { width: 100, height: 100 },
  image: { width: 64, height: 64, resizeMode: 'contain' },
});

export default MagicTriggerFAB;