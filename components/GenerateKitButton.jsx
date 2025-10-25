// components/GenerateKitButton.jsx
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';

const GenerateKitButton = ({ onPress }) => {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <LinearGradient
        colors={['#10B981', '#34D399']}
        start={{ x: 0.2, y: 0.8 }}
        end={{ x: 0.8, y: 0.2 }}
        style={styles.button}
      >
        <FontAwesome5 name="magic" size={28} color="white" />
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    right: 25,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 15,
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GenerateKitButton;