import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../_layout';
import { getEducationalPathById, getUserProgressDocument } from '../../services/firestoreService';
import SubjectCard from '../../components/SubjectCard'; // <-- Reuse our component!
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

const LibraryScreen = () => {
  const { user } = useAppState();
  const [favoriteSubjects, setFavoriteSubjects] = useState([]);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (user && user.selectedPathId) {
      setIsLoading(true);
      const [pathDetails, progressDoc] = await Promise.all([
        getEducationalPathById(user.selectedPathId),
        getUserProgressDocument(user.uid)
      ]);

      if (pathDetails && progressDoc) {
        const favoriteIds = progressDoc.favorites?.subjects || [];
        const allSubjects = pathDetails.subjects || [];
        
        const filteredFavorites = allSubjects.filter(subject => favoriteIds.includes(subject.id));
        
        setFavoriteSubjects(filteredFavorites);
        setUserProgress(progressDoc.pathProgress?.[user.selectedPathId] || {});
      }
    }
    setIsLoading(false);
  };

  // useFocusEffect will re-run the fetch logic every time the user navigates to this screen.
  // This ensures the list is always up-to-date if they favorite/unfavorite a subject.
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user])
  );

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={favoriteSubjects}
        renderItem={({ item }) => <SubjectCard item={item} userProgress={userProgress} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={<Text style={styles.headerTitle}>My Library</Text>}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="star" size={60} color="#4B5563" />
            <Text style={styles.emptyText}>Your favorite subjects will appear here.</Text>
            <Text style={styles.emptySubtext}>Tap the star icon on a subject to add it.</Text>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 8 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  container: { flex: 1, backgroundColor: '#0C0F27' },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: 'white', marginHorizontal: 12, marginTop: 20, marginBottom: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: '30%' },
  emptyText: { color: '#D1D5DB', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
  emptySubtext: { color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 8, width: '70%' },
});

export default LibraryScreen;