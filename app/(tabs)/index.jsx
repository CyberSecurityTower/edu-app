import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, TextInput, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

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
  const [currentPoints, setCurrentPoints] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // ----------------- Fetch Data on Screen Focus -----------------
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const fetchPathData = async () => {
        try {
          if (user?.selectedPathId) {
            const [details, progressDoc] = await Promise.all([
              getEducationalPathById(user.selectedPathId),
              getUserProgressDocument(user.uid),
            ]);

            if (isMounted) {
              setPathDetails(details);
              setUserProgress(progressDoc?.pathProgress?.[user.selectedPathId] || {});
              setCurrentPoints(progressDoc?.stats?.points || 0);
            }
          }
        } catch (error) {
          console.error('Error fetching path data:', error);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };

      fetchPathData();
      return () => { isMounted = false; };
    }, [user])
  );

  // ----------------- Loading Indicator -----------------
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // ----------------- Filter Subjects by Search Query -----------------
  const filteredSubjects = pathDetails?.subjects?.filter((subject) =>
    subject.title?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // ----------------- UI -----------------
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={filteredSubjects}
        renderItem={({ item }) => <SubjectCard item={item} userProgress={userProgress} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 80 }}
        ListHeaderComponent={
          <>
            {/* --- المستوى الأول: الهيدر الرئيسي --- */}
            <MainHeader title={`Hello, ${user?.firstName || 'Student'}!`} points={currentPoints} />

            {/* --- المستوى الثاني: المهام اليومية --- */}
            <DailyTasks />

            {/* --- المستوى الثالث: البحث والمواد --- */}
            <View style={styles.subjectsHeader}>
              <Text style={styles.sectionTitle}>All Subjects</Text>
              <View style={styles.searchContainer}>
                <FontAwesome5 name="search" size={18} color="#8A94A4" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for a subject..."
                  placeholderTextColor="#8A94A4"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>
          </>
        }
      />
    </SafeAreaView>
  );
};

// ----------------- Styles -----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  subjectsHeader: { paddingHorizontal: 12 },
  sectionTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    paddingVertical: 14,
    marginLeft: 10,
  },
});

export default HomeScreen;
