// app/(tabs)/index.jsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../../context/AppStateContext';
import { getEducationalPathById, getUserProgressDocument } from '../../services/firestoreService';
import { FontAwesome5 } from '@expo/vector-icons';
import SubjectCard from '../../components/SubjectCard';
import MainHeader from '../../components/MainHeader'; // <-- Import our new header
import { useFocusEffect } from 'expo-router';
import DailyTasks from '../../components/DailyTasksComponent'; 
const HomeScreen = () => {
  const { user } = useAppState();
  const [pathDetails, setPathDetails] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPoints, setCurrentPoints] = useState(0); // <-- New state for points

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
            setCurrentPoints(progressDoc?.stats?.points || 0); // <-- Update points state
            setIsLoading(false);
          }
        } else if (isMounted) {
          setIsLoading(false);
        }
      };
      fetchPathData();
      return () => { isMounted = false; };
    }, [user])
  );


  if (isLoading && !pathDetails) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

 return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={pathDetails?.subjects || []}
        renderItem={({ item }) => <SubjectCard item={item} userProgress={userProgress} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={
          <>
            <MainHeader title={`Hello, ${user?.firstName}!`} points={currentPoints} />
            
            <DailyTasks />
            
            <View style={styles.listHeaderContent}>
              <Text style={styles.sectionTitle}>All Subjects</Text>
              <View style={styles.searchContainer}>
                <FontAwesome5 name="search" size={18} color="#8A94A4" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for a subject..."
                  placeholderTextColor="#8A94A4"
                />
              </View>
            </View>
          </> // <--- تأكد من أن هذا هو وسم الإغلاق الوحيد لـ <> في الأعلى
        }
        contentContainerStyle={{ paddingHorizontal: 8 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  listHeaderContent: {
    paddingHorizontal: 12, // Match the header's padding
  },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 15, marginTop: 20, marginBottom: 20 },
  searchInput: { flex: 1, color: 'white', fontSize: 16, paddingVertical: 14, marginLeft: 10 },
});

export default HomeScreen;