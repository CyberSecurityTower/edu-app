import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

import MainHeader from '../../components/MainHeader';
import { useAppState } from '../../context/AppStateContext';
import { getLeaderboard, getUserProgressDocument } from '../../services/firestoreService';

const UserRankItem = ({ user, rank }) => {
  const avatarUrl = `https://ui-avatars.com/api/?name=${user.name.replace(' ', '+')}&background=1E293B&color=FFFFFF&size=128`;
  
  let rankColor = '#a7adb8ff';
  if (rank === 1) rankColor = '#FFD700'; // Gold
  if (rank === 2) rankColor = '#C0C0C0'; // Silver
  if (rank === 3) rankColor = '#CD7F32'; // Bronze

  return (
    <View style={styles.rankItem}>
      <Text style={[styles.rankPosition, { color: rankColor }]}>{rank}</Text>
      <Image source={{ uri: avatarUrl }} style={styles.rankAvatar} />
      <View style={styles.rankUserDetails}>
        <Text style={styles.rankUserName}>{user.name}</Text>
        <Text style={styles.rankUserPoints}>{user.points} pts</Text>
      </View>
      {rank <= 3 && <FontAwesome5 name="medal" size={24} color={rankColor} />}
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
          const [leaderboardData, progressDoc] = await Promise.all([
            getLeaderboard(),
            getUserProgressDocument(user.uid),
          ]);
          
          setLeaderboard(leaderboardData);
          setCurrentPoints(progressDoc?.stats?.points || 0);

          // Find current user's rank
          const userRank = leaderboardData.findIndex(item => item.id === user.uid);
          setCurrentUserRank(userRank !== -1 ? userRank + 1 : null);
        }
        setIsLoading(false);
      };
      fetchData();
    }, [user])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MainHeader title="Ranking" points={currentPoints} />
      
      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <UserRankItem user={item} rank={index + 1} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>The leaderboard is empty. Be the first to score!</Text>
            </View>
          }
        />
      )}

      {/* Current User's Rank Card */}
      {!isLoading && currentUserRank && (
        <View style={styles.currentUserCard}>
          <UserRankItem 
            user={{ name: `${user.firstName} ${user.lastName}`, points: currentPoints }} 
            rank={currentUserRank} 
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0F27' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20 },
  emptyText: { color: '#a7adb8ff', fontSize: 16 },
  
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  rankPosition: {
    fontSize: 20,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'center',
  },
  rankAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginLeft: 5,
  },
  rankUserDetails: {
    flex: 1,
    marginLeft: 15,
  },
  rankUserName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rankUserPoints: {
    color: '#a7adb8ff',
    fontSize: 14,
    marginTop: 2,
  },
  currentUserCard: {
    padding: 20,
    backgroundColor: '#0C0F27',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
});