import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import Markdown from 'react-native-markdown-display';
import QuizView from './QuizView';
import FlashcardView from './FlashcardView';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const StudyKitTabs = ({ data }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [layouts, setLayouts] = useState([]);
  
  const translateX = useSharedValue(0);
  const pillWidth = useSharedValue(0);

  useEffect(() => {
    if (layouts.length === 3) {
      const activeIndex = activeTab === 'summary' ? 0 : activeTab === 'quiz' ? 1 : 2;
      const activeLayout = layouts[activeIndex];
      if (activeLayout) {
        translateX.value = withTiming(activeLayout.x, { duration: 250 });
        pillWidth.value = withTiming(activeLayout.width, { duration: 250 });
      }
    }
  }, [activeTab, layouts]);

  const animatedPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: pillWidth.value,
  }));

  const renderContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <ScrollView style={styles.summaryScrollView} contentContainerStyle={{ paddingBottom: 20 }}>
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

  const tabs = [
    { key: 'summary', title: 'Smart Summary' },
    { key: 'quiz', title: 'Short Quiz' },
    { key: 'flashcards', title: 'Flashcards' },
  ];

  return (
    <View style={styles.container}>
      {/* 1. The Animated Tab Bar */}
      <View style={styles.tabWrapper}>
        <View style={styles.tabBar}>
          <Animated.View style={[styles.animatedPill, animatedPillStyle]}>
            <LinearGradient colors={['#10B981', '#34D399']} style={StyleSheet.absoluteFill} />
          </Animated.View>
          {tabs.map((tab, index) => (
            <Pressable
              key={tab.key}
              style={styles.tabButton}
              onPress={() => setActiveTab(tab.key)}
              onLayout={(event) => {
                const { x, width } = event.nativeEvent.layout;
                setLayouts(prev => { const newLayouts = [...prev]; newLayouts[index] = { x, width }; return newLayouts; });
              }}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 2. The Content Area */}
      <View style={styles.contentWrapper}>
        {renderContent()}
      </View>
    </View>
  );
};

// --- THE NEW RESPONSIVE STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  tabWrapper: { width: '100%', alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 30,
    padding: 5,
    position: 'relative',
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    alignItems: "center",
    zIndex: 1,
  },
  tabText: {
    color: '#a7adb8ff',
    fontWeight: 'bold',
    fontSize: 14,
    whiteSpace: 'nowrap',
  },
  activeTabText: { color: 'white' },
  animatedPill: {
    position: 'absolute',
    height: '128%', // Fills the container vertically
    top: 0,
    left: 0,
    borderRadius: 25,
    overflow: "hidden",
  },
  contentWrapper: {
    flex: 1, // This is the key: it takes all available vertical space
    justifyContent: 'center', // Centers content within that space
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: 20, // A simple, positive margin
  },
  summaryScrollView: {
    flexGrow: 0, // Prevents ScrollView from taking all space
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
});

const markdownStyles = StyleSheet.create({
    body: { color: '#D1D5DB', fontSize: 16, lineHeight: 26, textAlign: 'right' },
    strong: { fontWeight: 'bold', color: '#10B981' },
    list_item: { color: '#D1D5DB', fontSize: 16, lineHeight: 26, marginBottom: 8, flexDirection: 'row-reverse', textAlign: 'right' },
});

export default StudyKitTabs;