
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Image, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppState } from '../../context/AppStateContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

import { getUserProgressDocument, getEducationalPathById, getLeaderboard } from '../../services/firestoreService';
import SubjectCard from '../../components/SubjectCard';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';

// --- SUB-COMPONENTS ---

const SmartSubscriptionCard = ({ subscription }) => {
  if (!subscription) return null;

  const isTrial = subscription.plan === 'Trial';
  let daysRemaining = 0;
  let progress = 0;

  if (isTrial && subscription.expiresOn) {
    const expiryDate = subscription.expiresOn.toDate();
    const today = new Date();
    const createdAtDate = subscription.createdAt ? subscription.createdAt.toDate() : new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
    const totalTrialMs = expiryDate.getTime() - createdAtDate.getTime();
    const totalTrialDays = Math.ceil(totalTrialMs / (1000 * 60 * 60 * 24));
    
    daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    daysRemaining = Math.max(0, daysRemaining);
    progress = totalTrialDays > 0 ? ((totalTrialDays - daysRemaining) / totalTrialDays) * 100 : 0;
  }

  return (
    <View style={styles.subscriptionCard}>
      <Text style={styles.subscriptionPlan}>{subscription.plan}</Text>
      {isTrial ? (
        <>
          <Text style={styles.subscriptionStatus}>{daysRemaining} days remaining in your trial</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        </>
      ) : (
        <Text style={styles.subscriptionStatus}>Renews on: {subscription.renewsOn?.toDate().toLocaleDateString() || 'N/A'}</Text>
      )}
      <AnimatedGradientButton text="Upgrade to Pro" buttonWidth={220} buttonHeight={45} fontSize={16} />
    </View>
  );
};

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

const EmptySavedSubjects = () => {
  const router = useRouter();
  return (
    <View style={styles.emptySavedContainer}>
      <FontAwesome5 name="bookmark" size={40} color="#4B5563" />
      <Text style={styles.emptySavedTitle}>No Saved Subjects</Text>
      <Text style={styles.emptySavedText}>Tap the star on a subject to save it here for quick access.</Text>
      <AnimatedGradientButton text="Browse Subjects" onPress={() => router.push('/(tabs)/')} buttonWidth={200} buttonHeight={45} fontSize={15} />
    </View>
  );
};

const MenuItem = ({ icon, name, onPress, isLogout = false }) => (
  <Pressable style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemContent}>
      <FontAwesome5 name={icon} size={18} color={isLogout ? '#EF4444' : '#a7adb8ff'} style={styles.menuIcon} />
      <Text style={[styles.menuText, isLogout && styles.logoutText]}>{name}</Text>
    </View>
    {!isLogout && <FontAwesome5 name="chevron-right" size={16} color="#6B7280" />}
  </Pressable>
);

// --- MAIN PROFILE SCREEN COMPONENT ---
export default function ProfileScreen() {
  const { user, setUser } = useAppState();
  const router = useRouter();
  const [stats, setStats] = useState({ points: 0, lessonsCompleted: 0, rank: 'N/A', streak: 0 });
  const [savedSubjects, setSavedSubjects] = useState([]);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    
    const [progressDoc, pathDetails, leaderboard] = await Promise.all([
      getUserProgressDocument(user.uid),
      getEducationalPathById(user.selectedPathId),
      getLeaderboard(),
    ]);
    
    if (progressDoc) {
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

      if (pathDetails) {
        const favoriteIds = progressDoc.favorites?.subjects || [];
        const filteredFavorites = (pathDetails.subjects || []).filter(subject => favoriteIds.includes(subject.id));
        setSavedSubjects(filteredFavorites);
        setUserProgress(progressDoc.pathProgress?.[user.selectedPathId] || {});
      }
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchData().finally(() => {
        if (isLoading) setIsLoading(false);
      });
    }, [fetchData])
  );

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: async () => {
            try {
              await signOut(auth);
              setUser(null);
            } catch (error) {
              console.error("Error signing out: ", error);
            }
          } 
        }
      ]
    );
  };
 
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Guest';
  const avatarUrl = `https://ui-avatars.com/api/?name=${fullName.replace(' ', '+')}&background=3B82F6&color=FFFFFF&size=128&bold=true`;

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#10B981" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0C0F27' },
  // --- FIX IS HERE ---
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingBottom: 120 // Increased padding to avoid overlap with floating tab bar
  },
  // --- END OF FIX ---
  header: { alignItems: 'center', marginVertical: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 15 },
  userName: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  userEmail: { color: '#a7adb8ff', fontSize: 15, marginTop: 4 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginTop: 25 },
  
  subscriptionCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, alignItems: 'center' },
  subscriptionPlan: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  subscriptionStatus: { color: '#a7adb8ff', fontSize: 14, marginVertical: 10 },
  progressBarContainer: { height: 6, width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, marginBottom: 15 },
  progressBar: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  statBox: { width: '50%', padding: 15, alignItems: 'center' },
  statValue: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  statLabel: { color: '#a7adb8ff', fontSize: 12, marginTop: 2, textTransform: 'uppercase' },

  emptySavedContainer: { backgroundColor: '#1E293B', borderRadius: 16, padding: 30, alignItems: 'center' },
  emptySavedTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 15 },
  emptySavedText: { color: '#a7adb8ff', fontSize: 15, textAlign: 'center', marginVertical: 10, lineHeight: 22, maxWidth: '90%' },

  menuGroup: { marginTop: 30, backgroundColor: '#1E293B', borderRadius: 12, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#334155' },
  menuItemContent: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { width: 25, textAlign: 'center' },
  menuText: { color: 'white', fontSize: 16, marginLeft: 15 },
  logoutText: { color: '#EF4444' },
});