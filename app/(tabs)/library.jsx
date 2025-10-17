// app/(tabs)/library.jsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../_layout';
import { getEducationalPathById, getUserProgressDocument } from '../../services/firestoreService';
import SubjectCard from '../../components/SubjectCard';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import MainHeader from '../../components/MainHeader'; // <-- Import our new header

const LibraryScreen = () => {
  const { user } = useAppState();
  const [favoriteSubjects, setFavoriteSubjects] = useState([]);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        if (user && user.selectedPathId) {
          setIsLoading(true);
          const [pathDetails, progressDoc] = await Promise.all([
            getEducationalPathById(user.selectedPathId),
            getUserProgressDocument(user.uid)
          ]);
          if (pathDetails && progressDoc) {
            const favoriteIds = progressDoc.favorites?.subjects || [];
            const filteredFavorites = (pathDetails.subjects || []).filter(subject => favoriteIds.includes(subject.id));
            setFavoriteSubjects(filteredFavorites);
            setUserProgress(progressDoc.pathProgress?.[user.selectedPathId] || {});
          }
        }
        setIsLoading(false);
      };
      fetchData();
    }, [user])
  );

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={favoriteSubjects}
        renderItem={({ item }) => <SubjectCard item={item} userProgress={userProgress} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={<MainHeader title="My Library" />} // <-- Using the new header
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
  container: { flex: 1, backgroundColor: '#0C0F27' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: '30%' },
  emptyText: { color: '#D1D5DB', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
  emptySubtext: { color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 8, width: '70%' },
});

export default LibraryScreen;