// components/MainHeader.jsx
import React, { useState, useCallback } from 'react'; // --- FIX #1: Imported useState and useCallback ---
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAppState } from '../context/AppStateContext';
import { getUserProgressDocument } from '../services/firestoreService';

const MainHeader = ({ title }) => {
  const { user } = useAppState();
  const [points, setPoints] = useState(0);

  // --- FIX #2: Using useFocusEffect to keep points always updated ---
  useFocusEffect(
    useCallback(() => {
      let isMounted = true; // Prevent state updates if component is unmounted

      const fetchPoints = async () => {
        if (user?.uid) {
          const progressDoc = await getUserProgressDocument(user.uid);
          if (isMounted) {
            setPoints(progressDoc?.stats?.points || 0);
          }
        }
      };

      fetchPoints();

      return () => {
        isMounted = false;
      };
    }, [user])
  );

  return (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.rightContainer}>
        {/* Points Counter */}
        <View style={styles.pointsBadge}>
          <FontAwesome5 name="star" size={16} color="#FFD700" solid />
          <Text style={styles.pointsText}>{points}</Text>
        </View>
        {/* Notifications Icon */}
        <Pressable style={styles.iconButton}>
          <FontAwesome5 name="bell" size={22} color="#a7adb8ff" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    flex: 1, // Allow title to take space but not push icons
    marginRight: 10,
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