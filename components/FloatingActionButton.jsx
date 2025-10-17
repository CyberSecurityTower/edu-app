import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// --- THE FIX IS HERE: Replaced the hyphen with a slash ---
import { FontAwesome5 } from '@expo/vector-icons';

const FloatingActionButton = ({ onPress }) => {
  return (
    <Pressable style={styles.fabContainer} onPress={onPress}>
      <LinearGradient
        colors={['#8A2BE2', '#DA70D6']}
        start={{ x: 0.2, y: 0.2 }}
        end={{ x: 0.8, y: 0.8 }}
        style={styles.fab}
      >
        <FontAwesome5 name="robot" size={24} color="white" />
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 110,
    right: 25,
    shadowColor: '#ffffffff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1.5,
    shadowRadius: 6,
    elevation: 10,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FloatingActionButton;
