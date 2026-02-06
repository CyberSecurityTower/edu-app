// components/MagicTriggerFAB.jsx
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const MagicTriggerFAB = ({ isOpen, onPress }) => {
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
        {/* ✅ [MODIFIED] تم استبدال Lottie/Image بأيقونة وخلفية متدرجة */}
        <LinearGradient colors={['#374151', '#1F2937']} style={styles.gradient}>
            <FontAwesome5 name="magic" size={22} color="white" />
        </LinearGradient>
      </MotiView>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fab: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow: 'hidden',
    shadowColor: '#34D399', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, 
    shadowRadius: 8, 
    elevation: 10,
  },
  gradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MagicTriggerFAB;