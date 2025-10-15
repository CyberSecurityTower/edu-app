import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';

export default function LessonViewScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { lessonId, lessonTitle } = params;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <FontAwesome5 name="arrow-left" size={22} color="white" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{lessonTitle || 'Lesson'}</Text>
        </View>
        <View style={styles.headerIcon} />
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        <Text style={styles.contentText}>Lesson Content for ID:</Text>
        <Text style={styles.lessonIdText}>{lessonId}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, minHeight: 60 },
  headerIcon: { width: 50, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentText: { color: 'white', fontSize: 20 },
  lessonIdText: { color: '#10B981', fontSize: 18, marginTop: 10 },
});