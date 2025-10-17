// app/(tabs)/index.jsx
import React, { useState, useCallback } from 'react'; // Import useCallback
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../_layout';
import { getEducationalPathById, getUserProgressDocument } from '../../services/firestoreService';
import { FontAwesome5 } from '@expo/vector-icons';
import SubjectCard from '../../components/SubjectCard';
import { useFocusEffect } from 'expo-router'; // Import useFocusEffect

const HomeScreen = () => {
  const { user } = useAppState();
  const [pathDetails, setPathDetails] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- THE FIX IS HERE ---
  useFocusEffect(
    useCallback(() => {
      const fetchPathData = async () => {
        if (user && user.selectedPathId) {
          setIsLoading(true);
          const [details, progressDoc] = await Promise.all([
            getEducationalPathById(user.selectedPathId),
            getUserProgressDocument(user.uid)
          ]);
          setPathDetails(details);
          setUserProgress(progressDoc?.pathProgress?.[user.selectedPathId] || {});
        }
        setIsLoading(false);
      };
      
      fetchPathData();
    }, [user])
  );

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }


  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={pathDetails?.subjects || []}
        renderItem={({ item }) => <SubjectCard item={item} userProgress={userProgress} />} // <-- Use the new component
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={
          <>
            <Text style={styles.headerTitle}>Hello, {user?.firstName}!</Text>
            <View style={styles.searchContainer}>
              <FontAwesome5 name="search" size={18} color="#8A94A4" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a subject or lesson..."
                placeholderTextColor="#8A94A4"
              />
            </View>
            <Text style={styles.sectionTitle}>My Subjects</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No subjects available for this path yet.</Text>
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
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: 'white', marginHorizontal: 12, marginTop: 20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 15, marginHorizontal: 12, marginTop: 20 },
  searchInput: { flex: 1, color: 'white', fontSize: 16, paddingVertical: 14, marginLeft: 10 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', marginHorizontal: 12, marginTop: 30, marginBottom: 10 },
  emptyContainer: { marginTop: 50, alignItems: 'center' },
  emptyText: { color: '#a7adb8ff', fontSize: 16 },
});

export default HomeScreen;