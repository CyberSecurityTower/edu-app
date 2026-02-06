// components/MagicFAB.jsx
import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet, Image } from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

const MagicFAB = ({ onPress }) => {
  const [isAnimating, setIsAnimating] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsAnimating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return () => {};
    }, [])
  );

  return (
    <MotiView
      style={styles.container}
      from={{ bottom: -100, opacity: 0 }}
      animate={{ bottom: 100, opacity: 1 }}
      exit={{ bottom: -100, opacity: 0 }}
      transition={{ type: 'spring', damping: 15, stiffness: 150 }}
    >
      <Pressable onPress={onPress}>
        <MotiView
          style={styles.fab}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring' }}
        >
          <LinearGradient colors={['#374151', '#1F2937']} style={styles.gradient}>
            {isAnimating ? (
              <LottieView
                source={require('../assets/images/magic.json')}
                autoPlay
                loop={false}
                onAnimationFinish={() => setIsAnimating(false)}
                style={styles.lottie}
              />
            ) : (
              <MotiView 
                from={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 200 }}
              >
                <Image
                  source={require('../assets/images/magic.png')}
                  style={styles.image}
                />
              </MotiView>
            )}
          </LinearGradient>
        </MotiView>
      </Pressable>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', right: 25, shadowColor: '#34D399', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 12, },
  fab: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lottie: { width: 80, height: 80 },
  image: { width: 64, height: 64, borderRadius: 32 },
});

export default MagicFAB;