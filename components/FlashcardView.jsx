// components/FlashcardView.jsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Flashcard from './Flashcard'; // Import our new 3D card

const FlashcardView = ({ flashcardsData }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : flashcardsData.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < flashcardsData.length - 1 ? prev + 1 : 0));
  };

  const currentCard = flashcardsData[currentIndex];

  return (
    <View style={styles.container}>
      {/* Progress Indicator */}
      <Text style={styles.progressText}>
        Card {currentIndex + 1} of {flashcardsData.length}
      </Text>

      {/* The Flashcard */}
      <Flashcard key={currentIndex} frontText={currentCard.front} backText={currentCard.back} />

      {/* Navigation Controls */}
      <View style={styles.controlsContainer}>
        <Pressable style={styles.navButton} onPress={handlePrevious}>
          <FontAwesome5 name="arrow-left" size={24} color="white" />
        </Pressable>
        <Text style={styles.instructionText}>Tap card to flip</Text>
        <Pressable style={styles.navButton} onPress={handleNext}>
          <FontAwesome5 name="arrow-right" size={24} color="white" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: 10, alignItems: 'center' },
  progressText: { color: '#a7adb8ff', fontSize: 14, marginBottom: 15 },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 25,
  },
  navButton: {
    backgroundColor: '#334155',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    color: '#a7adb8ff',
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default FlashcardView;