import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const SubjectCard = ({ item, userProgress }) => {
  const router = useRouter();
  
  const progressData = userProgress?.subjects?.[item.id];
  const totalLessons = item.lessons?.length || 0;
  
  const completedLessons = progressData?.lessons 
    ? Object.values(progressData.lessons).filter(lesson => lesson.status === 'completed').length 
    : 0;

  const progressPercent = progressData?.progress || 0;

  const handlePress = () => {
    router.push({
      pathname: '/subject-details',
      params: { id: item.id, name: item.name }
    });
  };

  return (
    <Pressable style={styles.cardContainer} onPress={handlePress}>
      <LinearGradient colors={item.color || ['#4c669f', '#192f6a']} style={styles.card}>
        <View style={styles.iconContainer}>
          <FontAwesome5 name={item.icon || 'book'} size={32} color="white" />
        </View>
        <View>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>{`${completedLessons}/${totalLessons} Lessons`}</Text>
        </View>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: { flex: 1, padding: 8 },
  card: { borderRadius: 16, padding: 20, height: 190, justifyContent: 'space-between' },
  iconContainer: { alignSelf: 'flex-start', opacity: 0.8 },
  cardTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  progressContainer: { height: 5, backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 2.5 },
  progressBar: { height: '100%', backgroundColor: 'white', borderRadius: 2.5 },
  cardSubtitle: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, marginTop: 5 },
});

export default SubjectCard;