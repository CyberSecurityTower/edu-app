
// components/timer/TimerControls.jsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { MotiView } from 'moti';

// ✅ MODIFIED: Added onSkip prop
const TimerControls = ({ status, onStart, onPause, onResume, onEnd, onSkip, isBreak }) => {
  return (
    <View style={styles.container}>
      {status === 'active' || status === 'paused' ? (
        <Pressable onPress={onEnd} style={styles.sideButton}>
          <Text style={styles.sideButtonText}>End</Text>
        </Pressable>
      ) : <View style={styles.buttonPlaceholder} /> }

      <MotiView from={{ scale: 0.8 }} animate={{ scale: 1 }} key={status}>
        {(status === 'idle' || status === 'finished') && (
          <Pressable style={[styles.mainButton, styles.startButton]} onPress={onStart}>
            <FontAwesome5 name="play" size={24} color="white" style={{ marginLeft: 4 }} />
          </Pressable>
        )}
        {status === 'active' && (
          <Pressable style={[styles.mainButton, styles.pauseButton]} onPress={onPause}>
            <FontAwesome5 name="pause" size={24} color="white" />
          </Pressable>
        )}
        {status === 'paused' && (
          <Pressable style={[styles.mainButton, styles.startButton]} onPress={onResume}>
            <FontAwesome5 name="play" size={24} color="white" style={{ marginLeft: 4 }} />
          </Pressable>
        )}
      </MotiView>
      
      {/* ✅ NEW: Skip button for breaks or focus sessions */}
      {status === 'active' || status === 'paused' ? (
        <Pressable onPress={onSkip} style={styles.sideButton}>
           <FontAwesome5 name="forward" size={20} color="#9CA3AF" />
        </Pressable>
      ) : <View style={styles.buttonPlaceholder} /> }
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '80%',
    alignSelf: 'center',
    height: 80,
  },
  mainButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  startButton: { backgroundColor: '#10B981' },
  pauseButton: { backgroundColor: '#F59E0B' },
  sideButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPlaceholder: {
    width: 60,
  }
});

export default TimerControls;