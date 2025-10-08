import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

const AnimatedGradientButton = ({ 
  text, 
  onPress, 
  buttonWidth = 240, 
  buttonHeight,
  fontSize,
  borderRadius
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1100,
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

  const finalHeight = buttonHeight || buttonWidth * 0.22;
  const finalFontSize = fontSize || buttonWidth * 0.08;
  const finalBorderRadius = borderRadius !== undefined ? borderRadius : finalHeight / 2;

  const dynamicStyles = {
    button: {
      width: buttonWidth,
      height: finalHeight,
      borderRadius: finalBorderRadius,
    },
    text: {
      fontSize: finalFontSize,
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={onPress}>
        <AnimatedGradient
          colors={['rgba(7, 152, 255, 1)', '#10B981']}
          start={{ x: startX, y: 0.5 }}
          end={{ x: endX, y: 0.5 }}
          style={[styles.button, dynamicStyles.button]}
        >
          <Text style={[styles.text, dynamicStyles.text]}>{text}</Text>
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
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default AnimatedGradientButton;