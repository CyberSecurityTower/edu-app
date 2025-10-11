
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppState } from '../_layout';
import { getEducationalPathById } from '../../services/firestoreService';

// A temporary function to get lesson status. We will replace this later.
const getLessonStatus = (index) => {
  if (index === 0) return 'completed';
  if (index === 1) return 'inprogress';
  return 'locked';
};

const LessonsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAppState();

  const [subject, setSubject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubjectDetails = async () => {
      if (user && user.selectedPathId) {
        const pathDetails = await getEducationalPathById(user.selectedPathId);
        const currentSubject = pathDetails?.subjects?.find(s => s.id === params.id);
        setSubject(currentSubject);
      }
      setIsLoading(false);
    };
    fetchSubjectDetails();
  }, [user, params.id]);

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  const total = parseInt(subject?.totalLessons, 10) || 0;
  const completed = parseInt(subject?.completedLessons, 10) || 0;
  const progress = total > 0 ? (completed / total) * 100 : 25; // Default to 25% for visual testing

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={24} color="white" />
        </Pressable>
        <Image source={require('../../assets/images/Logo.png')} style={styles.logo} />
      </View>

      <View style={styles.subjectInfo}>
        <Text style={styles.subjectTitle}>{params.name}</Text>
        <Text style={styles.progressText}>{`${Math.round(progress)}% Completed`}</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>

      <FlatList
        data={subject?.lessons || []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<Text style={styles.listHeader}>Lessons</Text>}
        renderItem={({ item, index }) => {
          const status = getLessonStatus(index); // Get temporary status
          return (
            <Pressable style={styles.lessonItem}>
              <View>
                <Text style={styles.lessonTitle}>{item.title}</Text>
              </View>
              <View style={[styles.statusIconContainer, styles[`${status}Bg`]]}>
                {status === 'completed' && <FontAwesome5 name="check" size={16} color="white" />}
                {status === 'inprogress' && <FontAwesome5 name="play" size={14} color="white" style={{ marginLeft: 2 }} />}
                {status === 'locked' && <FontAwesome5 name="lock" size={16} color="white" />}
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  backButton: { padding: 5 },
  logo: { width: 40, height: 40 },
  subjectInfo: { paddingHorizontal: 20, marginTop: 20, marginBottom: 30 },
  subjectTitle: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  progressText: { color: '#a7adb8ff', fontSize: 14, marginTop: 15 },
  progressBarContainer: { height: 8, backgroundColor: '#1E293B', borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },
  listHeader: { color: 'white', fontSize: 22, fontWeight: 'bold', paddingHorizontal: 20, marginBottom: 10 },
  lessonItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', marginHorizontal: 20, marginBottom: 15, padding: 20, borderRadius: 12 },
  lessonTitle: { color: 'white', fontSize: 18, fontWeight: '600', flex: 1 },
  statusIconContainer: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  completedBg: { backgroundColor: '#10B981' },
  inprogressBg: { backgroundColor: '#3b82f6' },
  lockedBg: { backgroundColor: '#4B5563' },
});

export default LessonsScreen;