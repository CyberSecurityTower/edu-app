// app/(tabs)/index.jsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../_layout';
import { getEducationalPathById, getUserProgressDocument } from '../../services/firestoreService';
import { FontAwesome5 } from '@expo/vector-icons';
import SubjectCard from '../../components/SubjectCard';
import { useFocusEffect } from 'expo-router';

const HomeScreen = () => {
  const { user } = useAppState();
  const [pathDetails, setPathDetails] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  // We keep isLoading for the very first load of the app
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true; // Prevent state updates if component is unmounted

      const fetchPathData = async () => {
        if (user && user.selectedPathId) {
          const [details, progressDoc] = await Promise.all([
            getEducationalPathById(user.selectedPathId),
            getUserProgressDocument(user.uid)
          ]);

          if (isMounted) {
            setPathDetails(details);
            setUserProgress(progressDoc?.pathProgress?.[user.selectedPathId] || {});
            setIsLoading(false); // Turn off main loader after first fetch
          }
        } else if (isMounted) {
          setIsLoading(false);
        }
      };
      
      fetchPathData();

      return () => {
        isMounted = false;
      };
    }, [user])
  );

  // Show full-screen loader only on the very first load
  if (isLoading && !pathDetails) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={pathDetails?.subjects || []}
        renderItem={({ item }) => <SubjectCard item={item} userProgress={userProgress} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={
          <>
            <Text style={styles.headerTitle}>Hello, {user?.firstName}!</Text>
            {/* ... (Search bar and title) ... */}
          </>
        }
        // ... (rest of FlatList props)
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