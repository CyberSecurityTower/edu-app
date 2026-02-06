// config/toastConfig.js
import React from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';

export const toastConfig = {
  points: ({ text1 }) => (
    <View style={styles.toastContainer}>
      <LinearGradient colors={['#10B981', '#34D399']} style={styles.toastGradient}>
        <FontAwesome5 name="star" size={18} color="white" solid />
        <Text style={styles.toastText}>{text1}</Text>
      </LinearGradient>
    </View>
  ),
  eduai_notification: ({ text1, text2 }) => (
    <View style={styles.toastContainer}>
      <LinearGradient colors={['#3B82F6', '#4F46E5']} style={styles.toastGradient}>
        <Image source={require('../assets/images/owl.png')} style={styles.toastIcon} />
        <View style={styles.toastTextContainer}>
          <Text style={styles.toastTitle}>{text1}</Text>
          <Text style={styles.toastMessage}>{text2}</Text>
        </View>
      </LinearGradient>
    </View>
  ),
};

const styles = StyleSheet.create({
  toastContainer: { width: 'auto', maxWidth: '90%', alignItems: 'center', paddingHorizontal: 20 },
  toastGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 10 },
  toastText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  toastIcon: { width: 30, height: 30, marginRight: 10 },
  toastTextContainer: { flex: 1 },
  toastTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  toastMessage: { color: '#E0E7FF', fontSize: 14, marginTop: 2 },
});