import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { db } from '../firebase'; 
import { doc, onSnapshot } from 'firebase/firestore';
import { useAppState } from '../context/AppStateContext';

const DailyTasks = () => {
  const { user } = useAppState();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const userProgressRef = doc(db, 'userProgress', user.uid);

    // 🔥 اشتراك مباشر في تغييرات Firestore
    const unsubscribe = onSnapshot(
      userProgressRef,
      (snapshot) => {
        const data = snapshot.data();
        const fetchedTasks = data?.dailyTasks?.tasks || [];
        setTasks(fetchedTasks);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching daily tasks:', error);
        setIsLoading(false);
      }
    );

    // إلغاء الاشتراك عند مغادرة الشاشة
    return () => unsubscribe();
  }, [user?.uid]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#10B981" />
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>لا توجد مهام لليوم بعد 🎯</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>مهام اليوم</Text>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id || Math.random().toString()}
        renderItem={({ item }) => (
          <View style={styles.taskCard}>
            <FontAwesome5
              name={item.status === 'done' ? 'check-circle' : 'circle'}
              size={18}
              color={item.status === 'done' ? '#10B981' : '#8A94A4'}
            />
            <Text style={styles.taskText}>{item.title}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 10,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  taskText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 16,
  },
  emptyText: {
    color: '#8A94A4',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default DailyTasks;
