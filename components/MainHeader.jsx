// components/MainHeader.jsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

// The component now receives 'points' as a prop
const MainHeader = ({ title, points = 0, isCompact = false }) => {
  return (
    <View style={[styles.headerContainer, isCompact && styles.compactHeaderContainer]}>
      <Text style={[styles.headerTitle, isCompact && styles.compactHeaderTitle]}>{title}</Text>
      <View style={styles.rightContainer}>
        <View style={styles.pointsBadge}>
          <FontAwesome5 name="star" size={16} color="#FFD700" solid />
          <Text style={styles.pointsText}>{points}</Text>
        </View>
        <Pressable style={styles.iconButton}>
          <FontAwesome5 name="bell" size={22} color="#a7adb8ff" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Default (large) header styles
  headerContainer: {
    flex: 1, // Take available space
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  // Compact header styles
  compactHeaderContainer: {
    paddingVertical: 10,
  },
  compactHeaderTitle: {
    fontSize: 22,
  },
  // Shared styles
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
  },
  pointsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  iconButton: {
    padding: 5,
  },
});

export default MainHeader;