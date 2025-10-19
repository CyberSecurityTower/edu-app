import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { useAppState } from '../../context/AppStateContext';
import { getEducationalPathById, getUserProgressDocument } from '../../services/firestoreService';
import SubjectCard from '../../components/SubjectCard';
import MainHeader from '../../components/MainHeader';
import DailyTasks from '../../components/DailyTasks'; // تأكد من أن المسار صحيح

const HomeScreen = () => {
  const { user } = useAppState();
  const [pathDetails, setPathDetails] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPoints, setCurrentPoints] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchPathData = async () => {
        if (user && user.selectedPathId) {
          const [details, progressDoc] = await Promise.all([
            getEducationalPathById(user.selectedPathId),
            getUserProgressDocument(user.uid)
          ]);
          if (isMounted) {
            setPathDetails(details);
            setUserProgress(progressDoc?.pathProgress?.[user.selectedPathId] || {});
            setCurrentPoints(progressDoc?.stats?.points || 0);
          }
        }
        if (isMounted) setIsLoading(false);
      };
      fetchPathData();
      return () => { isMounted = false; };
    }, [user])
  );

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={pathDetails?.subjects || []}
        renderItem={({ item }) => <SubjectCard item={item} userProgress={userProgress} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 8 }}
        ListHeaderComponent={
          <>
            <MainHeader title={`Hello, ${user?.firstName}!`} points={currentPoints} />
            
            <DailyTasks />
            
            <View style={styles.subjectsHeader}>
              <Text style={styles.sectionTitle}>Continue Learning</Text>
            </View>
          </>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  subjectsHeader: {
    paddingHorizontal: 12,
    marginTop: 10, // مسافة إضافية بعد المهام
  },
  sectionTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});

export default HomeScreen;