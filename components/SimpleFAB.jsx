// components/SimpleFAB.jsx
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

const SimpleFAB = ({ onPress }) => {
  return (
    <MotiView
      from={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 15 }}
      // ✅ [FIX] تم نقل تحديد الموضع إلى هنا
      style={styles.fabContainer}
    >
      {/* ✅ [FIX] تم تطبيق الأنماط مباشرة على Pressable ليأخذ الحجم الصحيح */}
      <Pressable onPress={onPress} style={styles.pressable}>
        <LinearGradient
          colors={['#34D399', '#10B981']}
          start={{ x: 0.8, y: 0.2 }}
          end={{ x: 0.2, y: 1.0 }}
          style={styles.gradient}
        >
          <FontAwesome5 name="plus" size={24} color="white" />
        </LinearGradient>
      </Pressable>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: 25,
  },
  pressable: {
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    overflow: 'hidden', // ضروري ليعمل borderRadius مع LinearGradient
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SimpleFAB;