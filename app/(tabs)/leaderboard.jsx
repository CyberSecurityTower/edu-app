// app/(tabs)/leaderboard.jsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import MainHeader from '../../components/MainHeader';
import { useAppState } from '../../context/AppStateContext';
import { getLeaderboard, getUserProgressDocument } from '../../services/firestoreService';

// --- A simplified and clean User Rank Item ---
const UserRankItem = ({ user, rank, isCurrentUser = false }) => {
  const gradientColors = isCurrentUser 
    ? ['#3B82F6', '#4F46E5'] 
    : ['#1E293B', '#334155'];

  return (
    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.rankItem, isCurrentUser && styles.currentUserItem]}>
      <Text style={styles.rankPosition}>{rank}</Text>
      <Image source={{ uri: user.avatarUrl }} style={styles.rankAvatar} />
      <Text style={styles.rankUserName} numberOfLines={1}>{user.name}</Text>
      <Text style={styles.rankUserPoints}>{user.points} pts</Text>
    </LinearGradient>
  );
};

export default function LeaderboardScreen() {
  const { user } = useAppState();
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPoints, setCurrentPoints] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setIsLoading(true);
        if (user?.uid) {
          const [leaderboardData, progressDoc] = await Promise.all([ getLeaderboard(), getUserProgressDocument(user.uid) ]);
          
          setLeaderboard(leaderboardData);
          const userPoints = progressDoc?.stats?.points || 0;
          setCurrentPoints(userPoints);

          const userRankIndex = leaderboardData.findIndex(item => item.id === user.uid);
          if (userRankIndex !== -1) {
            setCurrentUserRank({ ...leaderboardData[userRankIndex], rank: userRankIndex + 1 });
          } else {
            setCurrentUserRank({
              id: user.uid,
              name: progressDoc.stats?.displayName || 'You',
              avatarUrl: progressDoc.stats?.avatarUrl,
              points: userPoints,
              rank: leaderboardData.length > 0 ? '50+' : 1 // If list is empty, you are #1
            });
          }
        }
        setIsLoading(false);
      };
      fetchData();
    }, [user])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerWrapper}>
        <MainHeader title="Ranking" points={currentPoints} />
      </View>
      
      {isLoading ? (
        <View style={styles.centerContent}><ActivityIndicator size="large" color="#10B981" /></View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <UserRankItem user={item} rank={index + 1} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyComponentContainer}>
              <Text style={styles.emptyText}>The leaderboard is empty. Be the first to score!</Text>
            </View>
          }
        />
      )}

      {!isLoading && currentUserRank && (
        <View style={styles.currentUserStickyCard}>
          <UserRankItem 
            user={currentUserRank} 
            rank={currentUserRank.rank}
            isCurrentUser={true}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  headerWrapper: { paddingHorizontal: 20 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 },
  
  // --- Empty List Styles ---
  emptyComponentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '40%', // Push the text down to the center
  },
  emptyText: { color: '#a7adb8ff', fontSize: 16 },

  // --- Rank Item Styles ---
  rankItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3 },
  rankPosition: { color: 'white', opacity: 0.8, fontSize: 16, fontWeight: 'bold', width: 35, textAlign: 'center' },
  rankAvatar: { width: 45, height: 45, borderRadius: 22.5, marginHorizontal: 10 },
  rankUserName: { flex: 1, color: 'white', fontSize: 16, fontWeight: '600' },
  rankUserPoints: { color: '#10B981', fontSize: 15, fontWeight: 'bold' },
  
  // --- Current User Sticky Card ---
  currentUserStickyCard: { position: 'absolute', bottom: 100, left: 20, right: 20, shadowColor: '#60A5FA', shadowOpacity: 0.5, shadowRadius: 10, elevation: 20 },
  currentUserItem: { borderWidth: 2, borderColor: '#60A5FA' },
});