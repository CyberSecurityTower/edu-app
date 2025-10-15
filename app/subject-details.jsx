
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { getSubjectDetails } from '../services/firestoreService';
import { useAppState } from './_layout'; // Corrected path

export default function SubjectDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAppState();

  const [subject, setSubject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubject = async () => {
      // Log the IDs we are about to use
      console.log(`Fetching details for Subject ID: ${params.id} in Path ID: ${user?.selectedPathId}`);

      if (user?.selectedPathId && params.id) {
        const details = await getSubjectDetails(user.selectedPathId, params.id);
        if (details) {
          setSubject(details);
        } else {
          setError('Could not find the subject details. It might not exist in the database.');
        }
      } else {
        setError('Missing user path or subject ID.');
      }
      setIsLoading(false);
    };
    
    fetchSubject();
  }, [user, params.id]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (error || !subject) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'An unexpected error occurred.'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backIcon}>
          <FontAwesome5 name="arrow-left" size={22} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>{subject.name}</Text>
      </View>
      <Text style={styles.lessonsTitle}>Lessons</Text>
      <FlatList
        data={subject.lessons || []}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => (
          <View style={styles.lessonItem}>
            <Text style={styles.lessonText}>{typeof item === 'string' ? item : (item.title || 'Unnamed Lesson')}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No lessons available for this subject yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27', padding: 20 },
  container: { flex: 1, backgroundColor: '#0C0F27' },
  errorText: { color: '#EF4444', fontSize: 18, textAlign: 'center', marginBottom: 20 },
  backButton: { backgroundColor: '#1E293B', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
  backButtonText: { color: '#10B981', fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backIcon: { marginRight: 20 },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  lessonsTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginHorizontal: 20, marginBottom: 10 },
  lessonItem: { backgroundColor: '#1E293B', padding: 20, marginHorizontal: 20, marginBottom: 10, borderRadius: 12 },
  lessonText: { color: 'white', fontSize: 16 },
  emptyText: { color: '#a7adb8ff', fontSize: 16, textAlign: 'center', marginTop: 30 },
});