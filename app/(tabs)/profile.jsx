
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Image, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppState } from '../../context/AppStateContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { signOut } from 'firebase/auth';

// --- FIX IS HERE (PART 1) ---
// We need to import 'db' from our firebase config, and the firestore functions we want to use.
import { auth, db } from '../../firebase'; 
import { doc, writeBatch } from 'firebase/firestore';

import { getUserProgressDocument, getEducationalPathById } from '../../services/firestoreService';
import SubjectCard from '../../components/SubjectCard';
import AnimatedGradientButton from '../../components/AnimatedGradientButton';

// These components were defined locally in your code, so I'll recreate them here
// to ensure the file is complete.
const SubscriptionCard = ({ subscription }) => (
  <View style={styles.subscriptionCard}>
    <Text style={styles.subscriptionTextBold}>{subscription?.plan || 'Basic Plan'}</Text>
    <Text style={styles.subscriptionText}>
      Status: <Text style={{ color: subscription?.status === 'active' ? '#10B981' : '#EF4444' }}>{subscription?.status || 'N/A'}</Text>
    </Text>
    <AnimatedGradientButton text="Manage Subscription" buttonWidth={200} buttonHeight={45} fontSize={14} />
  </View>
);
const MenuItem = ({ icon, name, onPress, isLogout = false }) => (
  <Pressable style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemContent}>
      <FontAwesome5 name={icon} size={18} color={isLogout ? '#EF4444' : '#a7adb8ff'} style={styles.menuIcon} />
      <Text style={[styles.menuText, isLogout && styles.logoutText]}>{name}</Text>
    </View>
    {!isLogout && <FontAwesome5 name="chevron-right" size={16} color="#6B7280" />}
  </Pressable>
);
const StatItem = ({ icon, value, label }) => (
  <View style={styles.statBox}>
    <FontAwesome5 name={icon} size={20} color="#a7adb8ff" solid />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);


export default function ProfileScreen() {
  const { user, setUser } = useAppState();
  const router = useRouter();
  const [stats, setStats] = useState({ points: 0, lessonsCompleted: 0 });
  const [savedSubjects, setSavedSubjects] = useState([]);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- FIX IS HERE (PART 2) ---
  // This function will now work correctly because 'db', 'writeBatch', and 'doc' are imported.
  const addDummyUser = async () => {
    console.log("Adding a dummy user...");
    try {
      const batch = writeBatch(db);
      const randomId = Math.random().toString(36).substring(7);
      const dummyUID = `dummy_${randomId}`;
      const firstName = "Bot";
      const lastName = `User ${randomId}`;
      const displayName = `${firstName} ${lastName}`;
      const points = Math.floor(Math.random() * 500) + 50;

      const userRef = doc(db, "users", dummyUID);
      batch.set(userRef, {
        uid: dummyUID,
        firstName: firstName,
        lastName: lastName,
        email: `${dummyUID}@test.com`,
        profileStatus: "completed",
      });

      const progressRef = doc(db, "userProgress", dummyUID);
      batch.set(progressRef, {
        stats: {
          points: points,
          displayName: displayName,
          avatarUrl: `https://ui-avatars.com/api/?name=${displayName.replace(" ", "+")}`,
        }
      });

      await batch.commit();
      Alert.alert("Success", `Dummy user "${displayName}" added with ${points} points!`);

    } catch (error) {
      console.error("Error adding dummy user:", error);
      Alert.alert("Error", "Could not add dummy user.");
    }
  };

  useFocusEffect(
  useCallback(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }
      
      // --- UPDATE: Fetch leaderboard data at the same time ---
      const [progressDoc, pathDetails, leaderboardData] = await Promise.all([
        getUserProgressDocument(user.uid),
        getEducationalPathById(user.selectedPathId),
        getLeaderboard(), // Fetch the leaderboard to find the user's rank
      ]);
      
      if (progressDoc) {
        // --- UPDATE: Calculate all stats together ---
        const userStats = progressDoc.stats || { points: 0 };
        const streak = progressDoc.streakCount || 0;
        
        const userRankIndex = leaderboardData.findIndex(item => item.id === user.uid);
        const rank = userRankIndex !== -1 ? userRankIndex + 1 : '50+';

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
        
        // --- UPDATE: Set all stats in one go ---
        setStats({ 
          points: userStats.points, 
          lessonsCompleted: completedCount,
          streak: streak,
          rank: rank,
        });

        // (Saved Subjects logic remains the same)
        if (pathDetails) {
          const favoriteIds = progressDoc.favorites?.subjects || [];
          const filteredFavorites = (pathDetails.subjects || []).filter(subject => favoriteIds.includes(subject.id));
          setSavedSubjects(filteredFavorites);
          setUserProgress(progressDoc.pathProgress?.[user.selectedPathId] || {});
        }
      }
      setIsLoading(false);
    };

    fetchData();
  }, [user])
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
              setUser(null); // Clear user from global state
              // The root layout will automatically redirect to the auth flow.
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
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.userInfoContainer}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <View style={styles.userInfoTextContainer}>
            <Text style={styles.userName}>{fullName}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <SubscriptionCard subscription={user?.subscription} />

        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsRow}>
          <StatItem icon="star" value={stats.points} label="Points" />
          <StatItem icon="check-circle" value={stats.lessonsCompleted} label="Lessons Done" />
        </View>
        
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
          <View style={styles.emptySavedContainer}>
            <Text style={styles.emptySavedText}>Your saved subjects will appear here.</Text>
          </View>
        )}
        
        <Pressable onPress={addDummyUser} style={{ backgroundColor: 'darkred', padding: 15, borderRadius: 10, alignItems: 'center', marginVertical: 20 }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>ADD DUMMY USER (FOR TESTING)</Text>
        </Pressable>
        
        <View style={styles.menuGroup}>
          <MenuItem icon="user-cog" name="Settings" onPress={() => router.push('/(setup)/edit-profile')} />
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  userInfoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  userInfoTextContainer: { marginLeft: 15 },
  userName: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  userEmail: { color: '#a7adb8ff', fontSize: 14, marginTop: 4 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  subscriptionCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 30 },
  subscriptionText: { color: '#a7adb8ff', fontSize: 16, textAlign: 'center', marginBottom: 5 },
  subscriptionTextBold: { color: '#E5E7EB', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  manageLink: { color: '#3B82F6', fontSize: 15, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 30 },
  statBox: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginHorizontal: 5 },
  statValue: { color: 'white', fontSize: 22, fontWeight: 'bold', marginVertical: 5 },
  statLabel: { color: '#a7adb8ff', fontSize: 12 },
  emptySavedContainer: { backgroundColor: '#1E293B', borderRadius: 16, padding: 30, alignItems: 'center', marginBottom: 30 },
  emptySavedText: { color: '#a7adb8ff', fontSize: 15, textAlign: 'center' },
  menuGroup: { marginTop: 10, backgroundColor: '#1E293B', borderRadius: 12, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#334155' },
  menuItemContent: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { width: 25, textAlign: 'center' },
  menuText: { color: 'white', fontSize: 16, marginLeft: 15 },
  logoutText: { color: '#EF4444' },
});