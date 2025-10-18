
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Image, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppState } from '../../context/AppStateContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, writeBatch } from 'firebase/firestore';

import { getUserProgressDocument, getEducationalPathById, getLeaderboard } from '../../services/firestoreService';
import SubjectCard from '../../components/SubjectCard';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';

// --- No changes to these sub-components ---
const SmartSubscriptionCard = ({ subscription }) => { /* ... same as before ... */ };
const EmptySavedSubjects = () => { /* ... same as before ... */ };
const MenuItem = ({ icon, name, onPress, isLogout = false }) => { /* ... same as before ... */ };

// --- StatsGrid and StatItem are here for completeness ---
const StatsGrid = ({ stats }) => (
  <View style={styles.statsGrid}>
    <StatItem icon="star" value={stats.points} label="Points" />
    <StatItem icon="trophy" value={stats.rank} label="Rank" />
    <StatItem icon="check-circle" value={stats.lessonsCompleted} label="Lessons Done" />
    <StatItem icon="fire-alt" value={stats.streak} label="Day Streak" />
  </View>
);

const StatItem = ({ icon, value, label }) => (
  <View style={styles.statBox}>
    <FontAwesome5 name={icon} size={22} color="#a7adb8ff" solid />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// --- Main Profile Screen Component ---
export default function ProfileScreen() {
  const { user, setUser } = useAppState();
  const router = useRouter();
  const [stats, setStats] = useState({ points: 0, lessonsCompleted: 0, rank: 'N/A', streak: 0 });
  const [savedSubjects, setSavedSubjects] = useState([]);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- NEW: "Stale-While-Revalidate" Data Fetching Logic ---
  const fetchData = useCallback(async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    
    // Fetch all data in parallel for maximum efficiency
    const [progressDoc, pathDetails, leaderboard] = await Promise.all([
      getUserProgressDocument(user.uid),
      getEducationalPathById(user.selectedPathId),
      getLeaderboard(),
    ]);
    
    if (progressDoc) {
      // Stats Logic
      const userStats = progressDoc.stats || { points: 0 };
      const streak = progressDoc.streakCount || 0;
      let completedCount = 0;
      if (progressDoc.pathProgress) {
        Object.values(progressDoc.pathProgress).forEach(path => {
          Object.values(path.subjects).forEach(subject => {
            if (subject.lessons) {
              completedCount += Object.values(subject.lessons).filter(status => status === 'completed').length;
            }
          });
        });
      }
      const rankIndex = leaderboard.findIndex(item => item.id === user.uid);
      const rank = rankIndex !== -1 ? `#${rankIndex + 1}` : '50+';
      setStats({ points: userStats.points, lessonsCompleted: completedCount, rank, streak });

      // Saved Subjects Logic
      if (pathDetails) {
        const favoriteIds = progressDoc.favorites?.subjects || [];
        const filteredFavorites = (pathDetails.subjects || []).filter(subject => favoriteIds.includes(subject.id));
        setSavedSubjects(filteredFavorites);
        setUserProgress(progressDoc.pathProgress?.[user.selectedPathId] || {});
      }
    }
  }, [user]);

  // This effect runs the fetch logic whenever the screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      fetchData().finally(() => {
        // We only set loading to false, we never set it to true here.
        // This ensures subsequent focuses don't show a spinner.
        if (isLoading) setIsLoading(false);
      });
    }, [fetchData])
  );

  const handleLogout = () => { /* ... same as before ... */ };
  const addDummyUser = async () => { /* ... same as before ... */ };
 
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Guest';
  const avatarUrl = `https://ui-avatars.com/api/?name=${fullName.replace(' ', '+')}&background=3B82F6&color=FFFFFF&size=128&bold=true`;

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ... The rest of the JSX is the same as the previous version ... */}
        <View style={styles.header}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <Text style={styles.userName}>{fullName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
        
        <Text style={styles.sectionTitle}>Statistics</Text>
        <StatsGrid stats={stats} />

        <Text style={styles.sectionTitle}>Subscription</Text>
        <SmartSubscriptionCard subscription={user?.subscription} />
        
        <Text style={styles.sectionTitle}>Saved Subjects</Text>
        {savedSubjects.length > 0 ? (
          <FlatList
            data={savedSubjects}
            renderItem={({ item }) => <SubjectCard item={item} userProgress={userProgress} />}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={{ marginHorizontal: -8 }}
          />
        ) : (
          <EmptySavedSubjects />
        )}
        
        <View style={styles.menuGroup}>
          <MenuItem icon="user-cog" name="Edit Profile" onPress={() => router.push('/(setup)/edit-profile')} />
          <MenuItem icon="question-circle" name="Help & Support" onPress={() => {}} />
          <MenuItem icon="sign-out-alt" name="Log Out" onPress={handleLogout} isLogout={true} />
        </View>

        <Pressable onPress={addDummyUser} style={styles.dummyButton}>
          <Text style={styles.dummyButtonText}>ADD DUMMY USER (FOR TESTING)</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- UPDATED STYLES ---
const styles = StyleSheet.create({
  // ... other styles are the same ...
  container: { flex: 1, backgroundColor: '#0C0F27' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginVertical: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 15 },
  userName: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  userEmail: { color: '#a7adb8ff', fontSize: 15, marginTop: 4 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginTop: 25 },
  
  // Stats Grid Styles
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  statBox: { 
    width: '50%', 
    padding: 15, // Increased padding for better spacing
    // --- FIX IS HERE ---
    alignItems: 'center', // This centers the content horizontally
    // --- END OF FIX ---
  },
  statValue: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  statLabel: { color: '#a7adb8ff', fontSize: 12, marginTop: 2, textTransform: 'uppercase' }, // Added uppercase for style
  // Empty Saved Subjects Styles
  emptySavedContainer: { backgroundColor: '#1E293B', borderRadius: 16, padding: 30, alignItems: 'center' },
  emptySavedTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 15 },
  emptySavedText: { color: '#a7adb8ff', fontSize: 15, textAlign: 'center', marginVertical: 10, lineHeight: 22, maxWidth: '90%' },

  // Menu & Other Styles
  menuGroup: { marginTop: 30, backgroundColor: '#1E293B', borderRadius: 12, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#334155' },
  menuItemContent: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { width: 25, textAlign: 'center' },
  menuText: { color: 'white', fontSize: 16, marginLeft: 15 },
  logoutText: { color: '#EF4444' },
  dummyButton: { backgroundColor: 'darkred', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  dummyButtonText: { color: 'white', fontWeight: 'bold' },
});