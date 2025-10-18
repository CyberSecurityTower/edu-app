// app/(tabs)/leaderboard.jsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import RadialGradient from 'react-native-radial-gradient'; // قد تحتاج لتثبيت هذه المكتبة

import MainHeader from '../../components/MainHeader';
import { useAppState } from '../../context/AppStateContext';
import { getLeaderboard, getUserProgressDocument } from '../../services/firestoreService';

// --- NEW: Podium Item Component (Max Level Style) ---
const PodiumItem = ({ user, rank }) => {
  const rankStyles = {
    1: { container: styles.podiumFirst, avatar: styles.podiumAvatarFirst, name: styles.podiumNameFirst, iconColor: '#FFD700' },
    2: { container: styles.podiumSecond, avatar: styles.podiumAvatarSecond, name: styles.podiumNameSecond, iconColor: '#C0C0C0' },
    3: { container: styles.podiumThird, avatar: styles.podiumAvatarThird, name: styles.podiumNameThird, iconColor: '#CD7F32' },
  };

  return (
    <View style={[styles.podiumItemContainer, rankStyles[rank].container]}>
      <View>
        <Image source={{ uri: user.avatarUrl }} style={[styles.podiumAvatarBase, rankStyles[rank].avatar]} />
        <View style={[styles.podiumRankCircle, { backgroundColor: rankStyles[rank].iconColor }]}>
          <FontAwesome5 name={rank === 1 ? "crown" : "medal"} size={rank === 1 ? 18 : 16} color="white" />
        </View>
      </View>
      <Text style={[styles.podiumNameBase, rankStyles[rank].name]} numberOfLines={1}>{user.name}</Text>
      <Text style={styles.podiumPoints}>{user.points} pts</Text>
    </View>
  );
};

// --- UPDATED: User Rank Item Component (Max Level Style) ---
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
    <>
      <View style={styles.podiumContainer}>
        {topThree.length >= 2 && <PodiumItem user={topThree[1]} rank={2} />}
        {topThree.length >= 1 && <PodiumItem user={topThree[0]} rank={1} />}
        {topThree.length >= 3 && <PodiumItem user={topThree[2]} rank={3} />}
      </View>
      {restOfLeaderboard.length > 0 && (
        <Text style={styles.listTitle}>Top 50 Ranking</Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* --- FIX #1: ADDED THE CONSISTENT MAIN HEADER --- */}
      <View style={styles.headerWrapper}>
        <MainHeader title="Ranking" points={currentPoints} />
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

      {/* --- FIX #3: MAX LEVEL STICKY CARD --- */}
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

// --- NEW "MAX LEVEL" STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  headerWrapper: { paddingHorizontal: 20 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 120 }, // Increased padding for sticky card
  emptyText: { color: '#a7adb8ff', fontSize: 16, marginTop: 40 },
  listTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginTop: 20 },

  // --- Podium Styles (V2) ---
  podiumContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingTop: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', paddingBottom: 20 },
  podiumItemContainer: { alignItems: 'center', width: '33%' },
  podiumAvatarBase: { borderRadius: 50, borderWidth: 3 },
  podiumAvatarFirst: { width: 90, height: 90, borderColor: '#FFD700' },
  podiumAvatarSecond: { width: 70, height: 70, borderColor: '#C0C0C0' },
  podiumAvatarThird: { width: 70, height: 70, borderColor: '#CD7F32' },
  podiumRankCircle: { position: 'absolute', bottom: -5, right: -5, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0C0F27' },
  podiumNameBase: { color: 'white', fontWeight: 'bold', marginTop: 10 },
  podiumNameFirst: { fontSize: 16 },
  podiumNameSecond: { fontSize: 14 },
  podiumNameThird: { fontSize: 14 },
  podiumPoints: { color: '#a7adb8ff', fontSize: 12, marginTop: 2 },
  podiumFirst: { transform: [{ translateY: 0 }] },
  podiumSecond: { transform: [{ translateY: 20 }] },
  podiumThird: { transform: [{ translateY: 20 }] },
  
  // --- Rank List Styles (V2) ---
  rankItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3 },
  rankPosition: { color: 'white', opacity: 0.8, fontSize: 16, fontWeight: 'bold', width: 35, textAlign: 'center' },
  rankAvatar: { width: 45, height: 45, borderRadius: 22.5, marginHorizontal: 10 },
  rankUserName: { flex: 1, color: 'white', fontSize: 16, fontWeight: '600' },
  rankUserPoints: { color: '#10B981', fontSize: 15, fontWeight: 'bold' },
  
  // --- Current User Sticky Card (V2) ---
  currentUserStickyCard: { position: 'absolute', bottom: 100, left: 20, right: 20, shadowColor: '#60A5FA', shadowOpacity: 0.5, shadowRadius: 10, elevation: 20 },
  currentUserItem: { borderWidth: 2, borderColor: '#60A5FA' },
});