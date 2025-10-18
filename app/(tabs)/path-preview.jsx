// app/(tabs)/path-preview.jsx
// THIS IS A COMPLETELY ISOLATED PROTOTYPE SCREEN

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Animated } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// --- MOCK DATA (No changes to your database needed) ---
const mockData = [
  { id: 1, title: 'Introduction to Economics', status: 'completed' },
  { id: 2, title: 'Supply and Demand', status: 'completed' },
  { id: 3, title: 'Market Equilibrium', status: 'completed' },
  { id: 4, title: 'Elasticity and Its Applications', status: 'current' },
  { id: 5, type: 'checkpoint', title: 'Chapter 1 Quiz' },
  { id: 6, title: 'Consumer Theory', status: 'locked' },
  { id: 7, title: 'Production and Costs', status: 'locked' },
  { id: 8, title: 'Perfect Competition', status: 'locked' },
  { id: 9, title: 'Monopoly', status: 'locked' },
  { id: 10, type: 'checkpoint', title: 'Chapter 2 Quiz' },
  { id: 11, title: 'Oligopoly', status: 'locked' },
  { id: 12, title: 'Macroeconomic Variables', status: 'locked' },
];

// --- Sub-component for a single lesson "node" ---
const PathNode = ({ item, isLast }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (item.status === 'current') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [item.status, scaleAnim]);

  const isCheckpoint = item.type === 'checkpoint';
  let NodeIcon, nodeColor, nodeStyle, iconColor = 'white';

  switch (item.status) {
    case 'completed':
      NodeIcon = () => <FontAwesome5 name="check" size={isCheckpoint ? 24 : 18} color={iconColor} />;
      nodeColor = ['#10B981', '#34D399'];
      break;
    case 'current':
      NodeIcon = () => <FontAwesome5 name="play" size={isCheckpoint ? 24 : 18} color={iconColor} />;
      nodeColor = ['#22D3EE', '#3B82F6'];
      break;
    default: // locked
      NodeIcon = () => <FontAwesome5 name="lock" size={isCheckpoint ? 24 : 18} color={'#4B5563'} />;
      nodeColor = ['#334155', '#4B5563'];
      break;
  }

  if (isCheckpoint) {
    nodeStyle = styles.checkpointNode;
  } else {
    nodeStyle = styles.lessonNode;
  }

  return (
    <View style={styles.nodeContainer}>
      <Animated.View style={item.status === 'current' && { transform: [{ scale: scaleAnim }] }}>
        <LinearGradient colors={nodeColor} style={nodeStyle}>
          <NodeIcon />
        </LinearGradient>
      </Animated.View>
      <Text style={[styles.nodeTitle, item.status === 'locked' && { color: '#6B7280' }]}>
        {item.title}
      </Text>
    </View>
  );
};

// --- Main Prototype Screen ---
export default function PathPreviewScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Introduction to Economics</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: '25%' }]} />
        </View>
      </View>

      {/* The Path */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {mockData.map((item, index) => (
          <View key={item.id} style={[styles.pathItem, index % 2 === 0 ? styles.pathItemLeft : styles.pathItemRight]}>
            <PathNode item={item} isLast={index === mockData.length - 1} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { padding: 20, paddingTop: 30, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  progressBarContainer: { height: 8, backgroundColor: '#1E293B', borderRadius: 4, marginTop: 15 },
  progressBar: { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },
  scrollContent: { paddingVertical: 40, paddingHorizontal: 50 },
  pathItem: { marginBottom: 40, width: '100%' },
  pathItemLeft: { alignItems: 'flex-start' },
  pathItemRight: { alignItems: 'flex-end' },
  nodeContainer: { alignItems: 'center', width: 120 },
  lessonNode: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 },
  checkpointNode: { width: 80, height: 80, borderRadius: 15, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '45deg' }], elevation: 8, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 8 },
  nodeTitle: { color: 'white', fontWeight: '600', fontSize: 13, textAlign: 'center', marginTop: 10 },
});