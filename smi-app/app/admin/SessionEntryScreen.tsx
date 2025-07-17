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
    if (!questState || typeof questState !== 'object') {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No questions answered in this session.</Text>
        </View>
      );
    }

    const questEntries = Object.entries(questState);
    if (questEntries.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No questions answered in this session.</Text>
        </View>
      );
    }

    return questEntries.map(([questionId, answerObj]: any, index) => (
      <View key={questionId} style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <Text style={styles.questionNumber}>Q{index + 1}</Text>
          <Text style={styles.questionId}>{questionId}</Text>
        </View>
        <View style={styles.questionContent}>
          <Text style={styles.questionLabel}>Question:</Text>
          <Text style={styles.questionText}>
            {answerObj?.question || questionId}
          </Text>
        </View>
        <View style={styles.answerContent}>
          <Text style={styles.answerLabel}>Answer:</Text>
          <Text style={styles.answerText}>
            {answerObj?.checked === true ? 'Completed' : 'Not completed'}
          </Text>
        </View>
      </View>
    ));
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Not available';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return String(timestamp);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Session Details</Text>
        <Text style={styles.sessionId}>ID: {sessionId}</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading session...</Text>
        </View>
      ) : session ? (
        <View style={styles.content}>
          {/* Session Overview */}
          <View style={styles.overviewCard}>
            <Text style={styles.sectionTitle}>Session Overview</Text>
            <View style={styles.overviewGrid}>
              {'score' in session && (
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Score</Text>
                  <Text style={styles.overviewValue}>{session.score}</Text>
                </View>
              )}
              {'submitted' in session && (
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Status</Text>
                  <Text style={[styles.overviewValue, session.submitted ? styles.submitted : styles.notSubmitted]}>
                    {session.submitted ? 'Submitted' : 'Not Submitted'}
                  </Text>
                </View>
              )}
              {'timestamp' in session && (
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Date & Time</Text>
                  <Text style={styles.overviewValue}>{formatTimestamp(session.timestamp)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Questions & Answers */}
          <View style={styles.questionsSection}>
            <Text style={styles.sectionTitle}>Questions & Answers</Text>
            {renderQuestState(session.questState)}
          </View>
        </View>
      ) : (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No data found for this session.</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  sessionId: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 16,
    marginTop: 12,
  },
  content: {
    gap: 20,
  },
  overviewCard: {
    backgroundColor: '#e4ffaa',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  overviewItem: {
    flex: 1,
    minWidth: 120,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  submitted: {
    color: '#059669',
  },
  notSubmitted: {
    color: '#DC2626',
  },
  questionsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    minWidth: 28,
    textAlign: 'center',
  },
  questionId: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'monospace',
    flex: 1,
  },
  questionContent: {
    marginBottom: 12,
  },
  questionLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  questionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
    fontWeight: '500',
  },
  answerContent: {
    backgroundColor: 'lightyellow',
    borderRadius: 8,
    padding: 12,
  },
  answerLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  answerText: {
    fontSize: 15,
    color: '#1E293B',
    lineHeight: 20,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default SessionEntryScreen;