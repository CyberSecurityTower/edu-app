// components/LastViewedWidget.jsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';

const LastViewedWidget = ({ progress, pathId }) => {
  const router = useRouter();
  const lastViewed = progress?.lastViewedLesson;

  if (!lastViewed || !lastViewed.lessonId) {
    return null; // لا تعرض أي شيء إذا لم يكن هناك درس سابق
  }

  const handlePress = () => {
    router.push({
      pathname: '/lesson-view',
      params: { ...lastViewed, pathId },
    });
  };

  return (
    <MotiView 
      style={styles.container}
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', delay: 200 }}
    >
      <Pressable onPress={handlePress} style={styles.pressable}>
        <FontAwesome5 name="history" size={20} color="#A5B4FC" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Continue where you left off</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{lastViewed.lessonTitle}</Text>
        </View>
        <FontAwesome5 name="chevron-right" size={16} color="#6B7280" />
      </Pressable>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 6,
  },
  pressable: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
});

export default LastViewedWidget;