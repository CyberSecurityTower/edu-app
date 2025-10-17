// components/StudyKitTabs.jsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import Markdown from 'react-native-markdown-display';
import QuizView from './QuizView';
import FlashcardView from './FlashcardView';

const StudyKitTabs = ({ data }) => {
  const [activeTab, setActiveTab] = useState('summary');

  const renderContent = () => {
    switch (activeTab) {
      case 'summary':
        return <ScrollView style={styles.contentScrollView}><Markdown style={markdownStyles}>{data.summary}</Markdown></ScrollView>;
      case 'quiz':
        return <QuizView quizData={data.quiz} />;
      case 'flashcards':
        return <FlashcardView flashcardsData={data.flashcards} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* --- THE RESPONSIVE FIX IS HERE --- */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.tabBarContainer}
      >
        <View style={styles.tabBar}>
          <Pressable style={[styles.tabButton, activeTab === 'summary' && styles.activeTabButton]} onPress={() => setActiveTab('summary')}>
            <Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}>Smart Summary</Text>
          </Pressable>
          <Pressable style={[styles.tabButton, activeTab === 'quiz' && styles.activeTabButton]} onPress={() => setActiveTab('quiz')}>
            <Text style={[styles.tabText, activeTab === 'quiz' && styles.activeTabText]}>Short Quiz</Text>
          </Pressable>
          <Pressable style={[styles.tabButton, activeTab === 'flashcards' && styles.activeTabButton]} onPress={() => setActiveTab('flashcards')}>
            <Text style={[styles.tabText, activeTab === 'flashcards' && styles.activeTabText]}>Flashcards</Text>
          </Pressable>
        </View>
      </ScrollView>

      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 20, marginBottom: 20 ,marginHorizontal:15},
  // New container for the scroll view
  tabBarContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 30,
    padding: 10,
  },
  // The bar itself now just holds the items
  tabBar: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  tabButton: { 
    // We removed flex: 1 and added horizontal padding
    paddingVertical: 10,
    paddingHorizontal: 20, // This gives space to each tab
    borderRadius: 25, 
    alignItems: 'center',
  },
  activeTabButton: { backgroundColor: '#10B981' },
  tabText: { color: '#a7adb8ff', fontWeight: 'bold', whiteSpace: 'nowrap' }, // Prevent text wrapping
  activeTabText: { color: 'white' },
  contentContainer: { marginTop: 20, padding: 15, backgroundColor: '#1E293B', borderRadius: 16 },
});


const markdownStyles = StyleSheet.create({
    body: { color: '#D1D5DB', fontSize: 16, lineHeight: 26 },
    strong: { fontWeight: 'bold', color: '#10B981' },
    list_item: { color: '#D1D5DB', fontSize: 16, lineHeight: 26, marginBottom: 8, flexDirection: 'row-reverse', textAlign: 'right' },
});

export default StudyKitTabs;