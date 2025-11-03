
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MotiView } from 'moti';

const TimerModeSelector = ({ modes, selectedModeKey, suggestedModeKey, onSelectMode, disabled }) => {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {modes.map(mode => (
          <Pressable key={mode.key} onPress={() => onSelectMode(mode)} disabled={disabled} style={styles.modeButton}>
            {selectedModeKey === mode.key && (
              <MotiView
                from={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'timing' }}
                style={StyleSheet.absoluteFillObject}
              >
                <View style={styles.selectedIndicator} />
              </MotiView>
            )}
            <Text style={[styles.modeText, selectedModeKey === mode.key && styles.selectedModeText]}>
              {mode.name}
            </Text>
            {suggestedModeKey === mode.key && (
              <Text style={styles.suggestedTag}>✨ Suggested</Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: 60, opacity: 1 },
  scrollContent: { alignItems: 'center', paddingHorizontal: 10 },
  modeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
  },
  selectedIndicator: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    borderWidth: 1,
    borderColor: '#34D399',
    borderRadius: 20,
    ...StyleSheet.absoluteFillObject,
  },
  modeText: { color: '#9CA3AF', fontWeight: '600' },
  selectedModeText: { color: 'white' },
  suggestedTag: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#34D399',
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
});

export default TimerModeSelector;