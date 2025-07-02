import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { FIRESTORE_DB } from '../../FirebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { useRoute, useNavigation } from '@react-navigation/native';

const UserDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId } = route.params as { userId: string };
  const [journeys, setJourneys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('UserDetailsScreen userId:', userId);
    const fetchJourneys = async () => {
      if (!userId) {
        setError('No userId provided');
        setLoading(false);
        return;
      }
      try {
        console.log('Fetching journeys for userId:', userId);
        const journeysRef = collection(FIRESTORE_DB, 'users', String(userId), 'dailyJourneys');
        const journeysSnap = await getDocs(journeysRef);
        console.log('journeysSnap size:', journeysSnap.size);
        const journeysList = journeysSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setJourneys(journeysList);
        if (journeysList.length === 0) {
          setError('No daily tasks/updates found for this user.');
        } else {
          setError(null);
        }
      } catch (error: any) {
        setError(error.message || 'Unknown error');
        console.error('Error fetching journeys:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchJourneys();
  }, [userId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Daily Tasks/Updates</Text>
      {error && <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>}
      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={journeys}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.journeyCard} onPress={() => (navigation as any).navigate('SessionDetails', { userId, date: item.date })}>
              <Text style={styles.journeyDate}>Date: {item.date}</Text>
              <Text style={styles.journeyPoints}>Total Points: {item.totalPoints}</Text>
              {/* Add more details as needed */}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text>No daily tasks/updates found.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 20,
    textAlign: 'center',
  },
  journeyCard: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  journeyDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  journeyPoints: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
  },
});

export default UserDetailsScreen; 