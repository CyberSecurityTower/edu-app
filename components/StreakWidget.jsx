import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function StreakWidget({ streak, isActiveToday }) {
  const isFlameActive = streak > 0 && isActiveToday;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isFlameActive ? ['#F97316', '#EA580C'] : ['#334155', '#1E293B']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
            <View style={[
                styles.iconCircle, 
                !isFlameActive && { backgroundColor: 'rgba(255,255,255,0.1)' }
            ]}>
                <FontAwesome5 
                    name="fire" 
                    size={20} 
                    color={isFlameActive ? "#FFF" : "#94A3B8"} 
                    solid={isFlameActive}
                />
            </View>
            <View>
                <Text style={[styles.streakCount, !isFlameActive && { color: '#94A3B8' }]}>
                    {streak} {streak === 1 ? 'Day' : 'Days'}
                </Text>
                <Text style={styles.streakLabel}>
                    {isFlameActive ? 'Active Streak 🔥' : 'Streak Pending'}
                </Text>
            </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginHorizontal: 5, borderRadius: 16, overflow: 'hidden', elevation: 4 },
  gradient: { flex: 1, padding: 12, justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  streakCount: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  streakLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' }
});