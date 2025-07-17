import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // If using Expo
import { FIRESTORE_DB } from '../../FirebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { useRoute, useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Define a type for journey items
interface Journey {
  id: string;
  date?: string;
  totalPoints?: number;
  [key: string]: any;
}

const UserDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId } = route.params as { userId: string };
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    fetchJourneys();
  }, [userId]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const fetchJourneys = async () => {
    if (!userId) {
      setError('No userId provided');
      setLoading(false);
      return;
    }
    try {
      const journeysRef = collection(FIRESTORE_DB, 'users', String(userId), 'dailyJourneys');
      const journeysSnap = await getDocs(journeysRef);
      const journeysList: Journey[] = journeysSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by date (newest first), fallback to 0 if date is missing
      const sortedJourneys = journeysList.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      
      setJourneys(sortedJourneys);
      setError(sortedJourneys.length === 0 ? 'No daily tasks/updates found for this user.' : null);
    } catch (error: any) {
      setError(error.message || 'Unable to load data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchJourneys();
  };

  const getPointsColor = (points: number) => {
    if (points >= 90) return '#10B981'; // Green
    if (points >= 70) return '#F59E0B'; // Yellow
    if (points >= 50) return '#3B82F6'; // Blue
    if (points > 0) return '#8B5CF6'; // Purple
    return '#6B7280'; // Gray
  };

  const getPointsGradient = (points: number) => {
    if (points >= 90) return ['#10B981', '#059669'];
    if (points >= 70) return ['#F59E0B', '#D97706'];
    if (points >= 50) return ['#3B82F6', '#2563EB'];
    if (points > 0) return ['#8B5CF6', '#7C3AED'];
    return ['#6B7280', '#4B5563'];
  };

  const getStatusEmoji = (points: number) => {
    if (points >= 90) return '🏆';
    if (points >= 70) return '⭐';
    if (points >= 50) return '🎯';
    if (points > 0) return '💪';
    return '😴';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const calculateStats = () => {
    if (journeys.length === 0) return { total: 0, average: 0, streak: 0 };
    
    const total = journeys.reduce((sum, journey) => sum + (journey.totalPoints || 0), 0);
    const average = Math.round(total / journeys.length);
    
    // Calculate current streak
    let streak = 0;
    const sortedJourneys = [...journeys].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
    for (const journey of sortedJourneys) {
      if ((journey.totalPoints || 0) > 0) {
        streak++;
      } else {
        break;
      }
    }
    
    return { total, average, streak };
  };

  const stats = calculateStats();

  const renderStatsCard = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.total}</Text>
        <Text style={styles.statLabel}>Total Points</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.average}</Text>
        <Text style={styles.statLabel}>Average</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.streak}</Text>
        <Text style={styles.statLabel}>Current Streak</Text>
      </View>
    </View>
  );

  const renderJourneyItem = ({ item, index }: { item: Journey; index: number }) => (
    <Animated.View
      style={[
        styles.journeyCard,
        {
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.cardTouchable}
        activeOpacity={0.7}
        onPress={() => (navigation as any).navigate('SessionDetails', { userId, date: item.date })}
      >
        <LinearGradient
          colors={getPointsGradient(item.totalPoints || 0) as [string, string]}
          style={styles.pointsBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.pointsEmoji}>{getStatusEmoji(item.totalPoints || 0)}</Text>
          <Text style={styles.pointsText}>{item.totalPoints ?? 0}</Text>
        </LinearGradient>
        
        <View style={styles.cardContent}>
          <Text style={styles.journeyDate}>{formatDate(item.date || '')}</Text>
          <Text style={styles.journeySubtitle}>
            {item.date || 'No date'} • {item.totalPoints ?? 0} points earned
          </Text>
        </View>
        
        <View style={styles.chevron}>
          <Text style={styles.chevronText}>›</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>📊</Text>
      <Text style={styles.emptyTitle}>No Data Available</Text>
      <Text style={styles.emptySubtitle}>
        This user hasn't started their daily journey yet.
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Text style={styles.emptyEmoji}>📊</Text>
      <Text style={styles.emptySubtitle}>
        This user hasn't started their daily journey yet.
      </Text>
      {/* <Text style={styles.errorSubtitle}>{error}</Text> */}
      {/* <TouchableOpacity style={styles.retryButton} onPress={fetchJourneys}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity> */}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />
      
      <LinearGradient
        colors={['#1E40AF', '#3B82F6']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Progress</Text>
        <View style={styles.headerPlaceholder} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      ) : error && journeys.length === 0 ? (
        renderErrorState()
      ) : (
        <FlatList
          data={journeys}
          keyExtractor={item => item.id}
          renderItem={renderJourneyItem}
          ListHeaderComponent={journeys.length > 0 ? renderStatsCard : null}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  listContainer: {
    padding: 20,
  },
  statsContainer: {
    backgroundColor: 'lightyellow',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  journeyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  pointsBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  pointsEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  cardContent: {
    flex: 1,
  },
  journeyDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  journeySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  chevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#3B82F6',
    marginTop: 16,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UserDetailsScreen;