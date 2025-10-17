// components/MainHeader.jsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

// --- THE FIX IS HERE: This component is now "dumb" and doesn't fetch data ---
// It only receives props and displays them.
const MainHeader = ({ title, points = 0, isCompact = false, hideNotifications = false }) => {
  return (
    <View style={[styles.headerContainer, isCompact && styles.compactHeaderContainer]}>
      <Text style={[styles.headerTitle, isCompact && styles.compactHeaderTitle]}>{title}</Text>
      <View style={styles.rightContainer}>
        <View style={styles.pointsBadge}>
          <FontAwesome5 name="star" size={16} color="#FFD700" solid />
          <Text style={styles.pointsText}>{points}</Text>
        </View>
        
        {/* --- THE FIX IS HERE (Part 2) --- */}
        {/* Conditionally render the bell icon */}
        {!hideNotifications && (
          <Pressable style={styles.iconButton}>
            <FontAwesome5 name="bell" size={22} color="#a7adb8ff" />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flex: 1,
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
  compactHeaderContainer: {
    paddingVertical: 10,
  },
  compactHeaderTitle: {
    fontSize: 22,
  },
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