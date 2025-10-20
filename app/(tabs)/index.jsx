// app/(tabs)/index.jsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAppState } from '../../context/AppStateContext';
import { getEducationalPathById, getUserProgressDocument } from '../../services/firestoreService';
import SubjectCard from '../../components/SubjectCard';
import MainHeader from '../../components/MainHeader';
import DailyTasks from '../../components/DailyTasks';

const HomeScreen = () => {
  const { user } = useAppState();
  const [pathDetails, setPathDetails] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchPathData = async () => {
        if (user?.uid && user.selectedPathId) {
          try {
            // REFACTOR: Fetch both documents in parallel
            const [details, progressDoc] = await Promise.all([
              getEducationalPathById(user.selectedPathId),
              getUserProgressDocument(user.uid)
            ]);
            if (isMounted) {
              setPathDetails(details);
              setUserProgress(progressDoc); // Store the whole progress document
            }
          } catch (error) {
            console.error("Error fetching home screen data:", error);
          }
        }
        if (isMounted) {
          setIsLoading(false);
        }
      };
      
      setIsLoading(true);
      fetchPathData();

      return () => { isMounted = false; };
    }, [user?.uid, user?.selectedPathId])
  );

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  // IMPROVEMENT: Pass daily tasks and points down as props to avoid redundant fetches
  const dailyTasks = userProgress?.dailyTasks?.tasks || [];
  const currentPoints = userProgress?.stats?.points || 0;
  const pathProgressForSubjects = userProgress?.pathProgress?.[user.selectedPathId] || {};

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={pathDetails?.subjects || []}
        renderItem={({ item }) => <SubjectCard item={item} userProgress={pathProgressForSubjects} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <MainHeader title={`Hello, ${user?.firstName}!`} points={currentPoints} />
            
            {/* Pass tasks as a prop */}
            <DailyTasks tasksProp={dailyTasks} />
            
            <View style={styles.subjectsHeader}>
              <Text style={styles.sectionTitle}>Continue Learning</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.emptySubjectsContainer}>
              <Text style={styles.emptySubjectsText}>No subjects found for your selected path.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  listContent: { paddingHorizontal: 8, paddingBottom: 20 },
  subjectsHeader: {
    paddingHorizontal: 12,
    marginTop: 10,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubjectsContainer: {
    marginTop: 50,
    alignItems: 'center',
  },
  emptySubjectsText: {
    color: '#a7adb8ff',
    fontSize: 16,
  },
});

export default HomeScreen;