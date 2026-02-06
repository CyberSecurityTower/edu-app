// app/(tabs)/subjects.jsx

import React, { useState, useCallback, useEffect } from 'react';
import { FlatList, RefreshControl, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import MainHeader from '../../components/MainHeader';
import SubjectCard from '../../components/SubjectCard';
import { SubjectsSkeleton } from '../../components/HomeScreenSkeletons';
import { 
  refreshEducationalPathCache, 
  fetchBatchSubjectStats 
} from '../../services/supabaseService';

const SubjectsScreen = () => {
  const { user, points, pathDetails, setPathDetails } = useAppState();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ Local state for subjects merged with stats
  const [subjectsWithStats, setSubjectsWithStats] = useState([]);

  // ✅ Function to fetch and merge stats
  const loadStats = useCallback(async () => {
    // If no path details yet, don't try to load stats
    if (!user?.uid || !pathDetails?.subjects) return;

    try {
      // 1. Extract IDs
      const subjectIds = pathDetails.subjects.map(s => s.id);
      
      // 2. Fetch stats batch
      const statsMap = await fetchBatchSubjectStats(user.uid, subjectIds);

      // 3. Merge data safely
      const mergedData = pathDetails.subjects.map(subject => ({
        ...subject,
        mastery_percent: statsMap ? (statsMap[subject.id] || 0) : 0
      }));

      setSubjectsWithStats(mergedData);
    } catch (e) {
      console.log("Error loading subject stats:", e.message);
    }
  }, [user?.uid, pathDetails]);

  // ✅ Update when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const fresh = await refreshEducationalPathCache(user.selectedPathId);
      if (fresh) setPathDetails(fresh);
      // loadStats will trigger automatically via useEffect/useFocusEffect if pathDetails changes
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ Safe Render for SubjectCard to prevent "Component is not a function" crash
  const renderSubjectItem = ({ item }) => {
    // If SubjectCard import failed (is object/undefined), fallback to prevent crash
    if (!SubjectCard || typeof SubjectCard !== 'function') {
        return (
            <View style={{ padding: 20, margin: 10, backgroundColor: '#1E293B', borderRadius: 10 }}>
                <Text style={{ color: 'red' }}>Error: SubjectCard Component Missing</Text>
                <Text style={{ color: 'white' }}>{item.title || item.name}</Text>
            </View>
        );
    }
    return <SubjectCard item={item} />;
  };

  // Loading Skeleton State
  if (!pathDetails && user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <MainHeader 
          title={t('tabSubjects')} 
          points={points} 
          isCompact 
          hideNotifications={true} 
          user={user} 
        />
        <SubjectsSkeleton />
      </SafeAreaView>
    );
  }

  // Determine data source
  const dataToRender = subjectsWithStats.length > 0 ? subjectsWithStats : (pathDetails?.subjects || []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={dataToRender}
        renderItem={renderSubjectItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
        ListHeaderComponent={
          <MainHeader 
            title={t('tabSubjects')} 
            points={points} 
            hideNotifications={true} 
            user={user} 
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ color: 'white' }}>{t('noSubjectsFound')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  listContent: { paddingHorizontal: 8, paddingBottom: 120 },
});

export default SubjectsScreen;