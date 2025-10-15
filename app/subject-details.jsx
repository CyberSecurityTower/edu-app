
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, FlatList, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { getSubjectDetails } from '../services/firestoreService';
import { useAppState } from './_layout';
import { LinearGradient } from 'expo-linear-gradient';

// Sub-component for a single lesson item for cleaner code
const LessonItem = ({ item }) => {
  const getIcon = () => {
    switch (item.status) {
      case 'completed':
        return { name: 'check-circle', color: '#10B981' };
      case 'current':
        return { name: 'play-circle', color: '#3B82F6' };
      case 'locked':
      default:
        return { name: 'lock', color: '#6B7280' };
    }
  };
  const icon = getIcon();

  return (
    <Pressable style={[styles.lessonItem, item.status === 'locked' && styles.lessonItemLocked]}>
      <View>
        <Text style={styles.lessonTitle}>{item.title}</Text>
        <Text style={styles.lessonSubtitle}>{item.duration || '15 min'}</Text>
      </View>
      <FontAwesome5 name={icon.name} size={24} color={icon.color} solid />
    </Pressable>
  );
};

export default function SubjectDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAppState();

  const [subject, setSubject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubject = async () => {
      if (user?.selectedPathId && params.id) {
        const details = await getSubjectDetails(user.selectedPathId, params.id);
        setSubject(details);
      }
      setIsLoading(false);
    };
    fetchSubject();
  }, [user, params.id]);

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  if (!subject) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <FontAwesome5 name="exclamation-triangle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Could not load subject details.</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const progress = subject.progress || 25; // Using a default value for now

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backIcon}>
          <FontAwesome5 name="arrow-left" size={22} color="white" />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>{subject.name}</Text>
          <Text style={styles.headerSubtitle}>{progress}% Completed</Text>
        </View>
        <Image source={require('../assets/images/Logo.png')} style={styles.logo} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <LinearGradient
          colors={['#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressBar, { width: `${progress}%` }]}
        />
      </View>

      <Text style={styles.sectionTitle}>Lessons</Text>

      {/* Lessons List */}
      <FlatList
        data={subject.lessons || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LessonItem item={item} />}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="book-dead" size={60} color="#4B5563" />
            <Text style={styles.emptyText}>No lessons have been added to this subject yet.</Text>
            <Text style={styles.emptySubtext}>Check back soon!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// --- Professional Styles ---
const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27', padding: 20 },
  container: { flex: 1, backgroundColor: '#0C0F27' },
  errorText: { color: '#EF4444', fontSize: 20, textAlign: 'center', marginTop: 20, marginBottom: 30 },
  backButton: { backgroundColor: '#1E293B', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
  backButtonText: { color: '#10B981', fontSize: 16, fontWeight: 'bold' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  backIcon: { padding: 10 },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  headerSubtitle: { color: '#9CA3AF', fontSize: 14, marginTop: 2 },
  logo: { width: 40, height: 40 },
  progressContainer: { height: 8, backgroundColor: '#1E293B', borderRadius: 4, marginHorizontal: 20, marginTop: 15 },
  progressBar: { height: '100%', borderRadius: 4 },
  sectionTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginHorizontal: 20, marginTop: 30, marginBottom: 15 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, opacity: 0.8 },
  emptyText: { color: '#D1D5DB', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
  emptySubtext: { color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 5 },
  lessonItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', padding: 20, borderRadius: 12, marginBottom: 10 },
  lessonItemLocked: { opacity: 0.6 },
  lessonTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
  lessonSubtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
});