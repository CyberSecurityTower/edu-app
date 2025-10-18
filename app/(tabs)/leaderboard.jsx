// app/(tabs)/leaderboard.jsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import MainHeader from '../../components/MainHeader';
import { useAppState } from '../../context/AppStateContext';
import { getLeaderboard, getUserProgressDocument } from '../../services/firestoreService';

// --- NEW: Podium Item Component ---
const PodiumItem = ({ user, rank }) => {
  const rankStyles = [styles.podiumBase, rank === 1 && styles.podiumFirst, rank === 2 && styles.podiumSecond, rank === 3 && styles.podiumThird];
  const rankColors = { 1: ['#FFD700', '#FBBF24'], 2: ['#C0C0C0', '#A8A29E'], 3: ['#CD7F32', '#D97706'] };
  
  return (
    <View style={styles.podiumItemContainer}>
      <Image source={{ uri: user.avatarUrl }} style={[styles.podiumAvatar, rank === 1 && { borderColor: rankColors[1][0] }]} />
      <Text style={styles.podiumName} numberOfLines={1}>{user.name}</Text>
      <Text style={styles.podiumPoints}>{user.points} pts</Text>
      <LinearGradient colors={rankColors[rank]} style={rankStyles}>
        <Text style={styles.podiumRankText}>{rank}</Text>
      </LinearGradient>
    </View>
  );
};

// --- UPDATED: User Rank Item Component ---
const UserRankItem = ({ user, rank, isCurrentUser = false }) => {
  return (
    <View style={[styles.rankItem, isCurrentUser && styles.currentUserItem]}>
      <Text style={styles.rankPosition}>{rank}</Text>
      <Image source={{ uri: user.avatarUrl }} style={styles.rankAvatar} />
      <Text style={styles.rankUserName} numberOfLines={1}>{user.name}</Text>
      <Text style={styles.rankUserPoints}>{user.points} pts</Text>
    </View>
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
            // If user is not in the top list, create a rank object for them
            setCurrentUserRank({
              id: user.uid,
              name: progressDoc.stats?.displayName || 'You',
              avatarUrl: progressDoc.stats?.avatarUrl,
              points: userPoints,
              rank: 'N/A'
            });
          }
        }
        setIsLoading(false);
      };
      fetchData();
    }, [user])
  );

  const topThree = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);

  const renderListHeader = () => (
    <View style={styles.podiumContainer}>
      {topThree.length >= 2 && <PodiumItem user={topThree[1]} rank={2} />}
      {topThree.length >= 1 && <PodiumItem user={topThree[0]} rank={1} />}
      {topThree.length >= 3 && <PodiumItem user={topThree[2]} rank={3} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerWrapper}>
        <MainHeader title="Leaderboard" points={currentPoints} />
      </View>
      
      {isLoading ? (
        <View style={styles.centerContent}><ActivityIndicator size="large" color="#10B981" /></View>
      ) : (
        <FlatList
          data={restOfLeaderboard}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <UserRankItem user={item} rank={index + 4} />}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centerContent}>
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
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
  emptyText: { color: '#a7adb8ff', fontSize: 16 },

  // --- Podium Styles ---
  podiumContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', height: 250, marginBottom: 20 },
  podiumItemContainer: { alignItems: 'center', width: '33%' },
  podiumAvatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: '#334155', marginBottom: 8 },
  podiumName: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  podiumPoints: { color: '#a7adb8ff', fontSize: 12 },
  podiumBase: { width: '80%', justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 8, borderTopRightRadius: 8, marginTop: 5 },
  podiumFirst: { height: 120, elevation: 10, shadowColor: '#FBBF24' },
  podiumSecond: { height: 90 },
  podiumThird: { height: 60 },
  podiumRankText: { color: 'white', fontSize: 24, fontWeight: 'bold' },

  // --- Rank List Styles ---
  rankItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginBottom: 10 },
  rankPosition: { color: '#a7adb8ff', fontSize: 16, fontWeight: 'bold', width: 35, textAlign: 'center' },
  rankAvatar: { width: 45, height: 45, borderRadius: 22.5, marginHorizontal: 10 },
  rankUserName: { flex: 1, color: 'white', fontSize: 16, fontWeight: '600' },
  rankUserPoints: { color: '#10B981', fontSize: 14, fontWeight: 'bold' },
  
  // --- Current User Sticky Card ---
  currentUserStickyCard: { position: 'absolute', bottom: 100, left: 20, right: 20, elevation: 15, shadowColor: '#60A5FA' },
  currentUserItem: { backgroundColor: '#3B82F6', borderWidth: 2, borderColor: '#60A5FA' },
});