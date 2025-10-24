
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import AnimatedGradientButton from './AnimatedGradientButton';
import { MotiView } from 'moti';

const EmptyTasksComponent = React.memo(({ isGenerating, onGenerate }) => {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500 }}
      style={styles.emptyContainer}
    >
      <FontAwesome5 name="clipboard-check" size={48} color="#4B5563" style={{ marginBottom: 20 }}/>
      {isGenerating ? (
        <>
          <Text style={styles.emptyTitle}>Generating Your Plan...</Text>
          <Text style={styles.emptySubtitle}>EduAI is personalizing tasks based on your current performance.</Text>
          <LottieView 
            source={require('../assets/images/task_loading.json')} 
            autoPlay loop style={styles.lottieAnimation} renderMode="hardware" 
          />
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>No Tasks Yet!</Text>
          <Text style={styles.emptySubtitle}>Add your first task or let EduAI generate a smart plan for you.</Text>
          <AnimatedGradientButton 
            text="Generate Smart Plan" 
            onPress={onGenerate} 
            buttonWidth={220}
            buttonHeight={50}
          />
        </>
      )}
    </MotiView>
  );
});

const styles = StyleSheet.create({
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 50,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    emptySubtitle: {
        color: '#9CA3AF',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 30,
        lineHeight: 24,
    },
    lottieAnimation: {
        width: 150,
        height: 150,
    },
});

export default EmptyTasksComponent;