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
    // --- THE NEW STRUCTURE ---
    <View style={styles.container}>
      {/* 1. The Tab Bar (Fixed at the top) */}
      <View style={styles.tabWrapper}>
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
      </View>

      {/* 2. The Content Area (Centered) */}
      <View style={styles.contentWrapper}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Main container now uses flex to separate children
  container: { 
    flex: 1,
  },
  // Tab styles remain the same
  tabWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20, // Add padding to the wrapper
  },
  tabBarContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 30,
    padding: 5,
  },
  tabBar: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  tabButton: { 
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25, 
    alignItems: 'center',
  },
  activeTabButton: { backgroundColor: '#10B981' },
  tabText: { color: '#a7adb8ff', fontWeight: 'bold', whiteSpace: 'nowrap' },
  activeTabText: { color: 'white' },
  
  // New wrapper for content to center it
  contentWrapper: {
    flex: 1, // Takes up all remaining space
    justifyContent: 'center', // Centers the content vertically
    paddingHorizontal: 20,
    paddingBottom: 20, // Some space at the bottom
  },
  // ScrollView for summary content if it's long
  contentScrollView: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 15,
  },
});

const markdownStyles = StyleSheet.create({
    body: { color: '#D1D5DB', fontSize: 16, lineHeight: 26 },
    strong: { fontWeight: 'bold', color: '#10B981' },
    list_item: { color: '#D1D5DB', fontSize: 16, lineHeight: 26, marginBottom: 8, flexDirection: 'row-reverse', textAlign: 'right' },
});

export default StudyKitTabs;