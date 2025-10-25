// components/FloatingActionButton.jsx
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';

const FloatingActionButton = ({ onPress }) => {
  return (
    <Pressable style={styles.fabContainer} onPress={onPress}>
      <View style={styles.fab}>
        <LottieView
          source={require('../assets/images/robot.json')}
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
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 12,
  },
  lottie: {
    width: 120,
    height: 110,
  },
});

export default FloatingActionButton;