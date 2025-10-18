import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Image, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppState } from '../../context/AppStateContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { getUserProgressDocument, getEducationalPathById } from '../../services/firestoreService';
import SubjectCard from '../../components/SubjectCard';
import AnimatedGradientButton from '../../components/AnimatedGradientButton'; // Added missing import

const SubscriptionCard = ({ subscription }) => { /* ... (This component is correct) ... */ };
const MenuItem = ({ icon, name, onPress, isLogout = false }) => { /* ... (This component is correct) ... */ };
const StatItem = ({ icon, value, label }) => { /* ... (This component is correct) ... */ };

export default function ProfileScreen() {
  const { user, setUser } = useAppState();
  const router = useRouter();
  const [stats, setStats] = useState({ points: 0, lessonsCompleted: 0 });
  const [savedSubjects, setSavedSubjects] = useState([]);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Use isLoading for initial load

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        if (!user?.uid) {
          setIsLoading(false);
          return;
        }
        
        const [progressDoc, pathDetails] = await Promise.all([
          getUserProgressDocument(user.uid),
          getEducationalPathById(user.selectedPathId)
        ]);
        
        if (progressDoc) {
          // Stats logic
          const userStats = progressDoc.stats || { points: 0 };
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
          setStats({ points: userStats.points, lessonsCompleted: completedCount });

          // Saved Subjects logic
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

  const handleLogout = () => { /* ... (This function is correct) ... */ };
 
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
  subscriptionText: { color: '#a7adb8ff', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  subscriptionTextBold: { color: '#E5E7EB', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  manageLink: { color: '#3B82F6', fontSize: 15, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 30 },
  statBox: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginHorizontal: 5 },
  statValue: { color: 'white', fontSize: 22, fontWeight: 'bold', marginVertical: 5 },
  statLabel: { color: '#a7adb8ff', fontSize: 12 },
  emptySavedContainer: { backgroundColor: '#1E293B', borderRadius: 16, padding: 30, alignItems: 'center', marginBottom: 30 },
  emptySavedText: { color: '#a7adb8ff', fontSize: 15, textAlign: 'center' },
  menuGroup: { marginTop: 30, backgroundColor: '#1E293B', borderRadius: 12, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#334155' },
  menuItemContent: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { width: 25 },
  menuText: { color: 'white', fontSize: 16, marginLeft: 15 },
  logoutText: { color: '#EF4444' },
});