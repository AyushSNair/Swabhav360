import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { FIRESTORE_DB } from '../../FirebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { useRoute, useNavigation } from '@react-navigation/native';

const SessionDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId, date } = route.params as { userId: string; date: string };
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!userId || !date) {
        setError('Missing userId or date');
        setLoading(false);
        return;
      }
      try {
        const sessionsRef = collection(FIRESTORE_DB, 'users', userId, 'dailyJourneys', date, 'sessions');
        const sessionsSnap = await getDocs(sessionsRef);
        const sessionsList = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSessions(sessionsList);
        if (sessionsList.length === 0) {
          setError('No sessions found for this date.');
        } else {
          setError(null);
        }
      } catch (error: any) {
        setError(error.message || 'Unknown error');
        console.error('Error fetching sessions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [userId, date]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Details for {date}</Text>
      {error && <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>}
      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.sessionCard} onPress={() => (navigation as any).navigate('SessionEntry', { userId, date, sessionId: item.id })}>
              <Text style={styles.sessionName}>Session: {item.id}</Text>
              <Text>Submitted: {item.submitted ? 'Yes' : 'No'}</Text>
              <Text>Score: {item.score}</Text>
              <Text>Timestamp: {item.timestamp?.toDate ? item.timestamp.toDate().toString() : String(item.timestamp)}</Text>
              {/* Add more session fields as needed */}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text>No sessions found.</Text>}
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
  sessionCard: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
});

export default SessionDetailsScreen; 