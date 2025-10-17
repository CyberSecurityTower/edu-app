// components/QuizView.jsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import AnimatedGradientButton from './AnimatedGradientButton';
import { updateUserPoints, getUserProgressDocument } from '../services/firestoreService';
import { POINTS_CONFIG } from '../config/points';
import { useAppState } from '../context/AppStateContext'; // Correct import path

const QuizView = ({ quizData }) => {
  const { user } = useAppState();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const currentQuestion = quizData[currentQuestionIndex];

  const handleAnswerPress = async (option) => {
    if (isAnswered || !user) return;
    
    setSelectedAnswer(option);
    setIsAnswered(true);

    if (option === currentQuestion.correctAnswer) {
      setScore(prev => prev + 1);
      const points = POINTS_CONFIG.QUIZ_CORRECT_ANSWER;
      await updateUserPoints(user.uid, points);
      
      Toast.show({
        type: 'points',
        text1: `+${points} Points!`,
        position: 'bottom',
        visibilityTime: 1500,
      });

    } else {
      const points = POINTS_CONFIG.QUIZ_INCORRECT_ANSWER;
      await updateUserPoints(user.uid, points);
      console.log(`Deducted ${points} points.`);
    }
  };

  const handleNext = () => {
    setCurrentQuestionIndex(prev => prev + 1);
    setSelectedAnswer(null);
    setIsAnswered(false);
  };

  const handleRestart = async () => {
    if (!user) return;

    const progressDoc = await getUserProgressDocument(user.uid);
    const currentPoints = progressDoc?.stats?.points || 0;
    const cost = Math.abs(POINTS_CONFIG.QUIZ_RETRY);

    if (currentPoints < cost) {
      Alert.alert(
        "Insufficient Points",
        `You need ${cost} points to retry this quiz. Complete more lessons to earn points!`
      );
      return;
    }

    await updateUserPoints(user.uid, POINTS_CONFIG.QUIZ_RETRY);
    
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
  };

  if (currentQuestionIndex >= quizData.length) {
    return (
      <View style={styles.container}>
        <View style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Quiz Completed!</Text>
          <Text style={styles.resultsText}>
            You scored <Text style={{ color: '#10B981', fontWeight: 'bold' }}>{score}</Text> out of <Text style={{ fontWeight: 'bold' }}>{quizData.length}</Text>.
          </Text>
          <AnimatedGradientButton
            text={`Try Again (-${Math.abs(POINTS_CONFIG.QUIZ_RETRY)} pts)`}
            onPress={handleRestart}
            buttonWidth={200}
            buttonHeight={50}
            fontSize={16}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.progressText}>
        Question {currentQuestionIndex + 1}/{quizData.length}
      </Text>
      <Text style={styles.questionText}>{currentQuestion.question}</Text>

      <View style={styles.optionsContainer}>
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = currentQuestion.correctAnswer === option;
          
          let optionStyle = styles.optionButton;
          if (isAnswered && isCorrect) {
            optionStyle = [styles.optionButton, styles.correctOption];
          } else if (isAnswered && isSelected && !isCorrect) {
            optionStyle = [styles.optionButton, styles.incorrectOption];
          }

          return (
            <Pressable key={index} style={optionStyle} onPress={() => handleAnswerPress(option)} disabled={isAnswered}>
              <Text style={styles.optionText}>{option}</Text>
              {isAnswered && isCorrect && <FontAwesome5 name="check-circle" size={20} color="white" />}
            </Pressable>
          );
        })}
      </View>

      {isAnswered && (
        <Pressable style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentQuestionIndex === quizData.length - 1 ? 'Finish Quiz' : 'Next Question'}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: 10 },
  progressText: { color: '#a7adb8ff', fontSize: 14, textAlign: 'center', marginBottom: 15 },
  questionText: { color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 25 },
  optionsContainer: { marginBottom: 20 },
  optionButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#334155', padding: 18, borderRadius: 12, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  correctOption: { backgroundColor: '#10B981', borderColor: '#34D399' },
  incorrectOption: { backgroundColor: '#EF4444', borderColor: '#F87171' },
  optionText: { color: 'white', fontSize: 16, flex: 1 },
  nextButton: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, alignItems: 'center' },
  nextButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  resultsCard: { alignItems: 'center', padding: 30, backgroundColor: '#334155', borderRadius: 16 },
  resultsTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  resultsText: { color: '#d1d5db', fontSize: 18, marginBottom: 25 },
});

export default QuizView;