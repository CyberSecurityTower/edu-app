// components/StudyKitTabs.jsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import QuizView from './QuizView';
import FlashcardView from './FlashcardView'; // <-- Import our new Flashcard view

const StudyKitTabs = ({ data }) => {
  const [activeTab, setActiveTab] = useState('summary');

  const renderContent = () => {
    switch (activeTab) {
      case 'summary':
        return <View style={styles.contentContainer}><Markdown style={markdownStyles}>{data.summary}</Markdown></View>;
      case 'quiz':
        return <QuizView quizData={data.quiz} />;
      case 'flashcards':
        // --- THE FIX IS HERE: Use the real FlashcardView component ---
        return <FlashcardView flashcardsData={data.flashcards} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
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

      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 20, marginBottom: 20 },
  tabBar: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 30, padding: 5, justifyContent: 'space-around' },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 25, alignItems: 'center' },
  activeTabButton: { backgroundColor: '#10B981' },
  tabText: { color: '#a7adb8ff', fontWeight: 'bold' },
  activeTabText: { color: 'white' },
  contentContainer: { marginTop: 20, padding: 15, backgroundColor: '#1E293B', borderRadius: 16 },
});

const markdownStyles = StyleSheet.create({
    body: { color: '#D1D5DB', fontSize: 16, lineHeight: 26 },
    strong: { fontWeight: 'bold', color: '#10B981' },
    list_item: { color: '#D1D5DB', fontSize: 16, lineHeight: 26, marginBottom: 8, flexDirection: 'row-reverse', textAlign: 'right' },
});

export default StudyKitTabs;