import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';

const MainHeader = ({ title, points = 0, isCompact = false, hideNotifications = false }) => {
  const previousPoints = useRef(points);
  
  const scale = useSharedValue(1);
  const color = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (points < previousPoints.current) {
      scale.value = withSequence(withTiming(1.2), withTiming(1));
      color.value = withSequence(withTiming(1), withDelay(1500, withTiming(0)));
      translateX.value = withSequence(
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
    previousPoints.current = points;
  }, [points]);

  const animatedBadgeStyle = useAnimatedStyle(() => {
    const backgroundColor = color.value === 1 ? '#EF4444' : '#1E293B';
    return {
      backgroundColor: withTiming(backgroundColor),
      transform: [{ scale: scale.value }, { translateX: translateX.value }],
    };
  });

  return (
    <View style={[styles.headerContainer, isCompact && styles.compactHeaderContainer]}>
      <Text style={[styles.headerTitle, isCompact && styles.compactHeaderTitle]}>{title}</Text>
      <View style={styles.rightContainer}>
        <Animated.View style={[styles.pointsBadge, animatedBadgeStyle]}>
          <FontAwesome5 name="star" size={16} color="#FFD700" solid />
          <Text style={styles.pointsText}>{points}</Text>
        </Animated.View>
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