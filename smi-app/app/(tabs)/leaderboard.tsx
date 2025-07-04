import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getLeaderboard } from '../../services/journeyService';
import { getAuth } from 'firebase/auth';

const { width } = Dimensions.get('window');

type User = {
  id: string;
  name: string;
  score: number;
  rank: number;
  avatar: string;
  level?: number;
};

type Filter = 'weekly' | 'monthly' | 'all-time';

// Glassmorphism Card Component
const GlassCard = ({ children, style = {}, gradient = ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] }: {
  children: React.ReactNode;
  style?: any;
  gradient?: string[];
}) => {
  return (
    <LinearGradient
      colors={gradient}
      style={[styles.glassCard, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
};

// Animated Podium Component
const PodiumUser = ({ user, position }: { user: User; position: number }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: position * 200,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: position * 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getPodiumHeight = () => {
    switch (position) {
      case 1: return 120;
      case 2: return 100;
      case 3: return 80;
      default: return 60;
    }
  };

  const getMedalEmoji = () => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏅';
    }
  };

  const getPodiumColor = () => {
    switch (position) {
      case 1: return ['#ffd700', '#ffed4e'];
      case 2: return ['#c0c0c0', '#e5e7eb'];
      case 3: return ['#cd7f32', '#f97316'];
      default: return ['#6366f1', '#8b5cf6'];
    }
  };

  return (
    <Animated.View 
      style={[
        styles.podiumUser,
        {
          transform: [
            { scale: scaleAnim },
            { translateY: translateY }
          ]
        }
      ]}
    >
      <View style={styles.podiumUserContent}>
        <Text style={styles.medalEmoji}>{getMedalEmoji()}</Text>
        
        <View style={styles.avatarContainer}>
          <Image source={{ uri: user.avatar }} style={styles.podiumAvatar} />
          <View style={[styles.rankBadge, { backgroundColor: getPodiumColor()[0] }]}>
            <Text style={styles.rankText}>{position}</Text>
          </View>
        </View>
        
        <Text style={styles.podiumName} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={styles.podiumScore}>{user.score.toLocaleString()}</Text>
      </View>
      
      <LinearGradient
        colors={getPodiumColor()}
        style={[styles.podiumBase, { height: getPodiumHeight() }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
    </Animated.View>
  );
};

// Leaderboard Item Component
const LeaderboardItem = ({ user, isCurrentUser = false }: { user: User; isCurrentUser?: boolean }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: user.rank * 50,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <GlassCard style={[
        styles.leaderboardItem,
        isCurrentUser && styles.currentUserItem
      ]}>
        <View style={styles.rankContainer}>
          <Text style={[styles.rank, isCurrentUser && styles.currentUserText]}>
            {user.rank}
          </Text>
        </View>
        
        <View style={styles.avatarContainer}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          {isCurrentUser && (
            <View style={styles.currentUserBadge}>
              <Ionicons name="person" size={12} color="white" />
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={[styles.name, isCurrentUser && styles.currentUserText]} numberOfLines={1}>
            {isCurrentUser ? 'You' : user.name}
          </Text>
          <Text style={styles.level}>Level {user.level || Math.floor(user.score / 100)}</Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={[styles.score, isCurrentUser && styles.currentUserText]}>
            {user.score.toLocaleString()}
          </Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

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
  const filteredLeaderboard = leaderboard.filter(u => u && typeof u === 'object');
  const topThree = filteredLeaderboard.filter(u => u.rank <= 3).sort((a, b) => a.rank - b.rank);
  const others = filteredLeaderboard.filter(u => u.rank > 3).sort((a, b) => a.rank - b.rank);
  const currentUserObj = filteredLeaderboard.find(u => u.id === currentUserId);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6', '#ec4899']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>Leaderboard</Text>
        
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <GlassCard style={styles.filterTabs}>
            {(['weekly', 'monthly', 'all-time'] as Filter[]).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterTab,
                  activeFilter === filter && styles.activeFilterTab
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[
                  styles.filterText,
                  activeFilter === filter && styles.activeFilterText
                ]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1).replace('-', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </GlassCard>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading leaderboard...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Podium Section */}
            {topThree.length > 0 && (
              <View style={styles.podiumSection}>
                <Text style={styles.sectionTitle}>Top Champions</Text>
                <View style={styles.podiumContainer}>
                  {topThree.map((user) => (
                    <PodiumUser
                      key={user.id}
                      user={user}
                      position={user.rank}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Current User Position (if not in top 3) */}
            {currentUserObj && currentUserObj.rank > 3 && (
              <View style={styles.currentUserSection}>
                <Text style={styles.sectionTitle}>Your Position</Text>
                <LeaderboardItem user={currentUserObj} isCurrentUser={true} />
              </View>
            )}

            {/* Other Users */}
            {others.length > 0 && (
              <View style={styles.othersSection}>
                <Text style={styles.sectionTitle}>
                  {topThree.length > 0 ? 'Other Competitors' : 'All Competitors'}
                </Text>
                {others
                  .filter(user => user.id !== currentUserId)
                  .map((user) => (
                    <LeaderboardItem
                      key={user.id}
                      user={user}
                      isCurrentUser={false}
                    />
                  ))}
              </View>
            )}
          </>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 20,
  },
  filterContainer: {
    width: '100%',
  },
  filterTabs: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  activeFilterText: {
    color: 'white',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 16,
  },
  podiumSection: {
    padding: 20,
    paddingTop: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 16,
    paddingHorizontal: 20,
  },
  podiumUser: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 100,
  },
  podiumUserContent: {
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 1,
  },
  medalEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  podiumAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'white',
  },
  rankBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  podiumScore: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  podiumBase: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  currentUserSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  othersSection: {
    paddingHorizontal: 20,
  },
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  currentUserItem: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 16,
  },
  rank: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  currentUserBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  level: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  pointsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  currentUserText: {
    color: '#6366f1',
  },
});