import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

const AnimatedGradientButton = ({ text, onPress, withGlow = false }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const startX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-0.5, 1.5],
  });

  const endX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 2.5],
  });

  return (
    <View style={styles.container}>
      {withGlow && (
        <View style={styles.glowWrapper}>
          <View style={styles.glow} />
        </View>
      )}
      <Pressable onPress={onPress}>
        <AnimatedGradient
          colors={['rgba(86, 7, 255, 1)','#10B981']}
          start={{ x: startX, y: 0.5 }}
          end={{ x: endX, y: 0.5 }}
          style={styles.button}
        >
          <Text style={styles.text}>{text}</Text>
        </AnimatedGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: 240,
    height: 70,
    borderRadius: 35,

  },
  button: {
    width: 240,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom:"10%",
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
});

export default AnimatedGradientButton;