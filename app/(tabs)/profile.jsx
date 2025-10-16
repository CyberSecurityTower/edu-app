import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppState } from '../_layout';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { getUserProgressDocument } from '../../services/firestoreService';

// Helper component for menu items
const MenuItem = ({ icon, name, onPress }) => (
  <Pressable style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemContent}>
      <FontAwesome5 name={icon} size={20} color="#a7adb8ff" style={styles.menuIcon} />
      <Text style={styles.menuText}>{name}</Text>
    </View>
    <FontAwesome5 name="chevron-right" size={16} color="#6B7280" />
  </Pressable>
);

// Helper component for stats
const StatItem = ({ icon, value, label }) => (
  <View style={styles.statBox}>
    <FontAwesome5 name={icon} size={24} color="#10B981" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);


export default function ProfileScreen() {
  const { user, setUser } = useAppState();
  const router = useRouter();
  const [stats, setStats] = useState({ points: 0, lessonsCompleted: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }
      
      const progressDoc = await getUserProgressDocument(user.uid);
      if (progressDoc) {
        const userStats = progressDoc.stats || { points: 0 };
        
        // Calculate completed lessons
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
        
        setStats({
          points: userStats.points,
          lessonsCompleted: completedCount,
        });
      }
      setIsLoading(false);
    };

    fetchUserStats();
  }, [user]);

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive", 
          onPress: async () => {
            await signOut(auth);
            setUser(null); // Immediately clear user state
            router.replace('/(auth)/'); // Redirect to auth flow
          } 
        }
      ]
    );
  };

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Guest';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>My Profile</Text>

        {/* User Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <FontAwesome5 name="user-graduate" size={40} color="white" />
          </View>
          <Text style={styles.userName}>{fullName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>My Stats</Text>
          {isLoading ? (
            <ActivityIndicator color="#10B981" style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.statsRow}>
              <StatItem icon="star" value={stats.points} label="Points" />
              <StatItem icon="check-circle" value={stats.lessonsCompleted} label="Lessons Done" />
            </View>
          )}
        </View>

        {/* Menu Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuGroup}>
            <MenuItem icon="user-edit" name="Edit Profile" onPress={() => {}} />
            <MenuItem icon="bell" name="Notifications" onPress={() => {}} />
            <MenuItem icon="shield-alt" name="Security" onPress={() => {}} />
            <MenuItem icon="question-circle" name="Help Center" onPress={() => {}} />
          </View>
        </View>

        {/* Logout Button */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  headerTitle: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  
  // Profile Card
  profileCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 30 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: '#10B981' },
  userName: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  userEmail: { color: '#a7adb8ff', fontSize: 14, marginTop: 4 },

  // Sections
  sectionContainer: { marginBottom: 30 },
  sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  
  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 20, alignItems: 'center', marginHorizontal: 5 },
  statValue: { color: 'white', fontSize: 24, fontWeight: 'bold', marginVertical: 8 },
  statLabel: { color: '#a7adb8ff', fontSize: 12 },

  // Menu
  menuGroup: { backgroundColor: '#1E293B', borderRadius: 12 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#334155' },
  menuItemContent: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { width: 30 },
  menuText: { color: 'white', fontSize: 16, marginLeft: 10 },

  // Logout Button
  logoutButton: { backgroundColor: '#1E293B', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  logoutButtonText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' },
});