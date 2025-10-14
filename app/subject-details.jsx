import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { getSubjectDetails } from '../services/firestoreService';
import { useAppState } from './_layout';
import AnimatedGradientButton from '../components/AnimatedGradientButton';

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
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!subject) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Could not load subject details.</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backIcon}>
          <FontAwesome5 name="arrow-left" size={22} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>{subject.name}</Text>
      </View>

      {/* Smart Tools Section */}
      <View style={styles.toolsSection}>
        <AnimatedGradientButton text="Smart Summary" icon="brain" />
        <AnimatedGradientButton text="Interactive Quiz" icon="question-circle" />
        <AnimatedGradientButton text="Flashcards" icon="clone" />
      </View>

      {/* Lessons List */}
      <Text style={styles.lessonsTitle}>Lessons</Text>
      <FlatList
        data={subject.lessons || []}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => (
          <Pressable style={styles.lessonItem}>
            <Text style={styles.lessonText}>{item.title}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040624',
    paddingHorizontal: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
  backButton: {
    marginTop: 20,
    alignSelf: 'center',
    padding: 10,
    backgroundColor: '#10B981',
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  backIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    color: 'white',
    fontWeight: 'bold',
  },
  toolsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  lessonsTitle: {
    color: 'white',
    fontSize: 20,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  lessonItem: {
    backgroundColor: '#1E1E2F',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  lessonText: {
    color: 'white',
    fontSize: 16,
  },
});
