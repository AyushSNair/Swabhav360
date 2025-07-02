import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { FIRESTORE_DB } from '../../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useRoute } from '@react-navigation/native';

const SessionEntryScreen = () => {
  const route = useRoute();
  const { userId, date, sessionId } = route.params as { userId: string; date: string; sessionId: string };
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      if (!userId || !date || !sessionId) {
        setError('Missing userId, date, or sessionId');
        setLoading(false);
        return;
      }
      try {
        const sessionRef = doc(FIRESTORE_DB, 'users', userId, 'dailyJourneys', date, 'sessions', sessionId);
        const sessionSnap = await getDoc(sessionRef);
        if (!sessionSnap.exists()) {
          setError('Session not found.');
          setSession(null);
        } else {
          setSession(sessionSnap.data());
          setError(null);
        }
      } catch (error: any) {
        setError(error.message || 'Unknown error');
        setSession(null);
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [userId, date, sessionId]);

  // Helper to render questState in a user-friendly way
  const renderQuestState = (questState: any) => {
    if (!questState || typeof questState !== 'object') return <Text>No questions answered.</Text>;
    return Object.entries(questState).map(([questionId, answerObj]: any) => (
      <View key={questionId} style={styles.qnaRow}>
        <Text style={styles.question}>{questionId}:</Text>
        <Text style={styles.answer}>{answerObj?.value ?? 'No answer'}</Text>
      </View>
    ));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Session Entry: {sessionId}</Text>
      {error && <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>}
      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
      ) : session ? (
        <View style={styles.dataBox}>
          {/* Meta info */}
          {'score' in session && (
            <View style={styles.row}><Text style={styles.key}>Score:</Text><Text style={styles.value}>{session.score}</Text></View>
          )}
          {'submitted' in session && (
            <View style={styles.row}><Text style={styles.key}>Submitted:</Text><Text style={styles.value}>{session.submitted ? 'Yes' : 'No'}</Text></View>
          )}
          {'timestamp' in session && (
            <View style={styles.row}><Text style={styles.key}>Timestamp:</Text><Text style={styles.value}>{session.timestamp?.toDate ? session.timestamp.toDate().toString() : String(session.timestamp)}</Text></View>
          )}
          {/* Questions and answers */}
          <Text style={styles.sectionTitle}>Questions & Answers</Text>
          {renderQuestState(session.questState)}
        </View>
      ) : (
        <Text>No data found for this session.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 20,
    textAlign: 'center',
  },
  dataBox: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  key: {
    fontWeight: 'bold',
    color: '#2563EB',
    marginRight: 8,
    width: 120,
  },
  value: {
    color: '#374151',
    flex: 1,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  qnaRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  question: {
    fontWeight: 'bold',
    color: '#3B82F6',
    marginRight: 8,
    width: 120,
  },
  answer: {
    color: '#374151',
    flex: 1,
    flexWrap: 'wrap',
  },
});

export default SessionEntryScreen; 