// components/FloatingActionButton.jsx
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';

const FloatingActionButton = ({ onPress }) => {
  return (
    <Pressable style={styles.fabContainer} onPress={onPress}>
      {/* We use a View for the shadow and background color */}
      <View style={styles.fab}>
        <LottieView
          source={require('../assets/images/robot.lottie')}
          autoPlay
          loop
          style={styles.lottie}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 110,
    right: 25,
  },
  fab: {
    width: 70, // Increased size for the animation
    height: 70, // Increased size for the animation
    borderRadius: 35,
    backgroundColor: '#8A2BE2', // A solid background color from your previous gradient
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow styles
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 12,
  },
  lottie: {
    width: 100, // Make the Lottie animation larger than the button
    height: 100, // This makes it feel more dynamic and alive
  },
});

export default FloatingActionButton;