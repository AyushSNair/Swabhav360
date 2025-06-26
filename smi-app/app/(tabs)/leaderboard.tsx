import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLeaderboard } from '../../services/journeyService';
import { getAuth } from 'firebase/auth';

type User = {
id: string;
name: string;
score: number;
rank: number;
avatar: string;
};

type Filter = 'weekly' | 'monthly' | 'all-time';

export default function LeaderboardScreen() {
const [activeFilter, setActiveFilter] = useState<Filter>('weekly');
const [leaderboard, setLeaderboard] = useState<User[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const auth = getAuth();

useEffect(() => {
const fetchLeaderboard = async () => {
try {
setLoading(true);
const data = await getLeaderboard(activeFilter);
setLeaderboard(data);
setError(null);
} catch (err) {
console.error('Failed to load leaderboard:', err);
setError('Failed to load leaderboard. Please try again.');
} finally {
setLoading(false);
}
};


fetchLeaderboard();
}, [activeFilter]);

const currentUserId = auth.currentUser?.uid;
const topThree = leaderboard.filter(u => u.rank <= 3).sort((a, b) => a.rank - b.rank);
const others = leaderboard.filter(u => u.rank > 3).sort((a, b) => a.rank - b.rank);
const currentUserRank = leaderboard.find(u => u.id === currentUserId)?.rank || 0;

const getPodiumUserStyle = (rank: number) => {
switch (rank) {
case 1: return styles.rank1;
case 2: return styles.rank2;
case 3: return styles.rank3;
default: return {};
}
};

return (
<ScrollView style={styles.container}>
{/* Header */}
<View style={styles.header}>
<Text style={styles.headerTitle}>Leaderboard</Text>
<View style={styles.timeFilter}>
<TouchableOpacity
style={[styles.filterButton, activeFilter === 'weekly' && styles.activeFilter]}
onPress={() => setActiveFilter('weekly')}
>
<Text style={[styles.filterText, activeFilter === 'weekly' && styles.activeFilterText]}>Weekly</Text>
</TouchableOpacity>
<TouchableOpacity
style={[styles.filterButton, activeFilter === 'monthly' && styles.activeFilter]}
onPress={() => setActiveFilter('monthly')}
>
<Text style={[styles.filterText, activeFilter === 'monthly' && styles.activeFilterText]}>Monthly</Text>
</TouchableOpacity>
<TouchableOpacity
style={[styles.filterButton, activeFilter === 'all-time' && styles.activeFilter]}
onPress={() => setActiveFilter('all-time')}
>
<Text style={[styles.filterText, activeFilter === 'all-time' && styles.activeFilterText]}>All Time</Text>
</TouchableOpacity>
</View>
</View>


  {loading ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4f46e5" />
      <Text style={styles.loadingText}>Loading leaderboard...</Text>
    </View>
  ) : error ? (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={40} color="#ef4444" />
      <Text style={styles.errorText}>{error}</Text>
    </View>
  ) : (
    <>
      {/* Top 3 Podium */}
      <View style={styles.podiumContainer}>
        {topThree.map((user) => (
          <View key={user.id} style={[styles.podiumUser, getPodiumUserStyle(user.rank), user.id === currentUserId && styles.currentUser]}>
            <Text style={styles.medalEmoji}>
              {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉'}
            </Text>
            <Text 
              style={[
                styles.podiumName, 
                user.id === currentUserId && styles.currentUserName
              ]} 
              numberOfLines={1}
            >
              {user.id === currentUserId ? 'You' : user.name}
            </Text>
            <Text style={styles.podiumScore}>{user.score.toLocaleString()}</Text>
            <View style={[styles.rankBadge, user.rank === 1 && styles.rank1Badge]}>
              <Text style={[styles.rankText, user.rank === 1 && styles.rank1Text]}>{user.rank}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Current User's Position */}
      {currentUserRank > 3 && (
        <View style={[styles.leaderboardItem, styles.currentUserItem]}>
          <View style={styles.rankContainer}>
            <Text style={styles.rank}>{currentUserRank}</Text>
          </View>
          <Image 
            source={{ uri: leaderboard.find(u => u.id === currentUserId)?.avatar }} 
            style={styles.avatar} 
            onError={() => console.log('Failed to load avatar')}
          />
          <Text style={[styles.name, styles.currentUserName]}>You</Text>
          <Text style={styles.score}>
            {leaderboard.find(u => u.id === currentUserId)?.score.toLocaleString()}
          </Text>
        </View>
      )}
    </>
  )}

  {/* Other Users */}
  {!loading && !error && (
    <View style={styles.leaderboardList}>
      {others
        .filter(user => user.id !== currentUserId) // Don't show current user again if they're in the middle
        .map((user) => (
          <View 
            key={user.id} 
            style={[
              styles.leaderboardItem,
              user.id === currentUserId && styles.currentUserItem
            ]}
          >
            <View style={styles.rankContainer}>
              <Text style={styles.rank}>{user.rank}</Text>
            </View>
            <Image 
              source={{ uri: user.avatar }} 
              style={styles.avatar}
              onError={() => console.log('Failed to load avatar')}
            />
            <Text 
              style={[
                styles.name, 
                user.id === currentUserId && styles.currentUserName
              ]} 
              numberOfLines={1}
            >
              {user.id === currentUserId ? 'You' : user.name}
            </Text>
            <Text style={styles.score}>{user.score.toLocaleString()}</Text>
          </View>
        ))}
    </View>
  )}
  <View style={{height: 100}}/>
</ScrollView>
);
}

const styles = StyleSheet.create({
loadingContainer: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
padding: 20,
},
loadingText: {
marginTop: 10,
color: '#6b7280',
fontSize: 16,
},
errorContainer: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
padding: 20,
},
errorText: {
marginTop: 10,
color: '#ef4444',
textAlign: 'center',
fontSize: 16,
},
currentUserItem: {
backgroundColor: '#f0f9ff',
borderLeftWidth: 3,
borderLeftColor: '#0ea5e9',
},
currentUserName: {
fontWeight: 'bold',
color: '#0ea5e9',
},
currentUser: {
borderWidth: 2,
borderColor: '#0ea5e9',
borderRadius: 12,
padding: 5,
marginBottom: 5,
},
container: {
flex: 1,
backgroundColor: '#f3f4f6',
},
header: {
backgroundColor: '#ffffff',
paddingTop: 50,
paddingBottom: 20,
paddingHorizontal: 20,
alignItems: 'center',
},
headerTitle: {
fontSize: 24,
fontWeight: 'bold',
marginBottom: 20,
},
timeFilter: {
flexDirection: 'row',
backgroundColor: '#e5e7eb',
borderRadius: 20,
padding: 4,
},
filterButton: {
paddingHorizontal: 16,
paddingVertical: 8,
borderRadius: 16,
},
activeFilter: {
backgroundColor: '#ffffff',
shadowColor: '#000',
shadowOffset: { width: 0, height: 1 },
shadowOpacity: 0.1,
shadowRadius: 2,
elevation: 2,
},
filterText: {
fontSize: 14,
color: '#4b5563',
},
activeFilterText: {
fontWeight: 'bold',
color: '#3b82f6',
},
podiumContainer: {
flexDirection: 'row',
justifyContent: 'space-around',
alignItems: 'flex-end',
padding: 20,
paddingBottom: 40,
backgroundColor: '#ffffff',
borderBottomLeftRadius: 30,
borderBottomRightRadius: 30,
marginBottom: 20,
minHeight: 220,
},
podiumUser: {
alignItems: 'center',
width: 120,
paddingHorizontal: 5,
},
podiumName: {
fontSize: 14,
fontWeight: '600',
marginTop: 8,
textAlign: 'center',
flexWrap: 'wrap',
maxWidth: '100%',
paddingHorizontal: 4,
},
podiumScore: {
fontSize: 14,
color: '#6b7280',
marginTop: 4,
fontWeight: 'bold',
},
rank1: {
bottom: 40,
},
rank2: {
bottom: 20,
},
rank3: {
bottom: 20,
},
medalEmoji: {
fontSize: 50,
marginBottom: 10,
},
podiumRank: {
position: 'absolute',
top: -5,
right: 5,
width: 28,
height: 28,
borderRadius: 14,
backgroundColor: '#ffffff',
justifyContent: 'center',
alignItems: 'center',
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.2,
shadowRadius: 2,
elevation: 4,
},
podiumRankText: {
fontSize: 14,
fontWeight: 'bold',
},

listContainer: {
marginHorizontal: 20,
},
userRow: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: '#ffffff',
padding: 16,
borderRadius: 12,
marginBottom: 12,
},
currentUserRow: {
backgroundColor: '#e0e7ff',
borderWidth: 1,
borderColor: '#3b82f6',
},
rank: {
fontSize: 16,
fontWeight: 'bold',
width: 30,
color: '#6b7280',
},
avatar: {
width: 40,
height: 40,
borderRadius: 20,
marginHorizontal: 16,
},
name: {
flex: 1,
fontSize: 16,
fontWeight: 'bold',
},
score: {
fontSize: 16,
fontWeight: 'bold',
color: '#3b82f6',
},
// Rank badge styles
rankBadge: {
position: 'absolute',
top: -10,
right: -10,
backgroundColor: '#3b82f6',
width: 24,
height: 24,
borderRadius: 12,
justifyContent: 'center',
alignItems: 'center',
},
rank1Badge: {
backgroundColor: '#fcd34d',
},
rankText: {
color: 'white',
fontWeight: 'bold',
fontSize: 12,
},
rank1Text: {
color: '#000',
},
leaderboardItem: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: '#ffffff',
padding: 16,
borderRadius: 12,
marginBottom: 12,
marginHorizontal: 20,
},
rankContainer: {
width: 30,
alignItems: 'center',
marginRight: 10,
},
leaderboardList: {
marginTop: 10,
paddingBottom: 20,
},
}); 