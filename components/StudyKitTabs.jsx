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
        // --- FIX #1: Added RTL wrapper for Markdown ---
        return (
          <ScrollView style={styles.contentScrollView}>
            <View style={{ writingDirection: 'rtl' }}>
              <Markdown style={markdownStyles}>{data.summary}</Markdown>
            </View>
          </ScrollView>
        );
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
  container: { 
    flex: 1,
  },
  tabWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  tabBarContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 30,
    padding: 3,
    marginBottom:15
  },
  tabBar: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  tabButton: { 
    paddingVertical: 8, // Reduced vertical padding
    paddingHorizontal: 15, // Reduced horizontal padding
    borderRadius: 30, 
    alignItems: 'center',
  },
  activeTabButton: { backgroundColor: '#10B981' },
  tabText: { 
    color: '#a7adb8ff', 
    fontWeight: 'bold', 
    fontSize: 14, // Slightly smaller font size for better fit
    whiteSpace: 'nowrap' 
  },
  activeTabText: { color: 'white' },
  
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop:-10,
  },
  contentScrollView: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 15,
  },
});

const markdownStyles = StyleSheet.create({
    body: { color: '#D1D5DB', fontSize: 16, lineHeight: 26, textAlign: 'right' },
    strong: { fontWeight: 'bold', color: '#10B981' },
    list_item: { color: '#D1D5DB', fontSize: 16, lineHeight: 26, marginBottom: 8, flexDirection: 'row-reverse', textAlign: 'right' },
});

export default StudyKitTabs;