import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { FIREBASE_AUTH } from '../../FirebaseConfig';

type MoodType =
  | 'very_happy'
  | 'happy'
  | 'neutral'
  | 'sad'
  | 'very_sad'
  | 'angry'
  | 'excited'
  | 'calm'
  | 'anxious';

interface MoodConfig {
  emoji: string;
  color: string;
  label: string;
}

const MOODS: Record<MoodType, MoodConfig> = {
  very_happy: { emoji: '😄', color: '#4CAF50', label: 'Very Happy' },
  happy: { emoji: '😊', color: '#8BC34A', label: 'Happy' },
  neutral: { emoji: '😐', color: '#FFC107', label: 'Neutral' },
  sad: { emoji: '😢', color: '#FF9800', label: 'Sad' },
  very_sad: { emoji: '😭', color: '#F44336', label: 'Very Sad' },
  angry: { emoji: '😡', color: '#E91E63', label: 'Angry' },
  excited: { emoji: '🤩', color: '#9C27B0', label: 'Excited' },
  calm: { emoji: '😌', color: '#00BCD4', label: 'Calm' },
  anxious: { emoji: '😰', color: '#607D8B', label: 'Anxious' },
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  moodButton: {
    padding: 10,
    margin: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
  },
  selectedMood: {
    backgroundColor: '#d1e7dd',
    borderColor: '#28a745',
  },
  moodEmoji: {
    fontSize: 30,
  },
  label: {
    fontWeight: '600',
    marginBottom: 5,
  },
  intensityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  intensityCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIntensity: {
    backgroundColor: '#c8e6c9',
    borderColor: '#388e3c',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    color: 'white',
    fontWeight: '600',
  },
  scrollContainer: {
    padding: 20,
  },
});

const MoodTracker = () => {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [moodHistory, setMoodHistory] = useState<Record<string, MoodType>>({});

  useEffect(() => {
    fetchMoodHistory();
  }, []);

  const fetchMoodHistory = async () => {
    const user = FIREBASE_AUTH.currentUser;
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch('http://192.168.7.10:3000/api/module/mood', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        const history: Record<string, MoodType> = {};
        data.forEach((entry: any) => {
          const date = new Date(entry.date).toISOString().split('T')[0];
          if (typeof entry.mood === 'string' && entry.mood in MOODS) {
            const moodKey = entry.mood as MoodType;
            history[date] = moodKey;
          }
        });
        setMoodHistory(history);
      } else {
        console.warn('Error fetching mood history:', data?.error);
      }
    } catch (err) {
      console.error('Failed to load mood history', err);
    }
  };

  const submitMood = async () => {
    const user = FIREBASE_AUTH.currentUser;
    if (!user) return Alert.alert('Not logged in');

    if (!selectedMood) {
      Alert.alert('Please select a mood');
      return;
    }

    try {
      setLoading(true);
      const token = await user.getIdToken();

      const response = await fetch('http://192.168.7.10:3000/api/module/mood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mood: selectedMood,
          note: notes,
          intensity,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        const today = new Date().toISOString().split('T')[0];
        setMoodHistory((prev) => ({ ...prev, [today]: selectedMood }));
        Alert.alert('Mood submitted!');
        resetForm();
      } else {
        Alert.alert('Error', data.error || 'Failed to submit mood');
      }
    } catch (err) {
      Alert.alert('Network Error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedMood(null);
    setNotes('');
    setIntensity(3);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>How are you feeling today?</Text>

          {/* Mood Selector */}
          <View style={styles.moodGrid}>
            {Object.entries(MOODS).map(([key, { emoji }]) => (
              <TouchableOpacity
                key={key}
                onPress={() => setSelectedMood(key as MoodType)}
                style={[
                  styles.moodButton,
                  selectedMood === key && styles.selectedMood,
                ]}
              >
                <Text style={styles.moodEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Intensity Selector */}
          <Text style={styles.label}>Intensity (1–5):</Text>
          <View style={styles.intensityRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.intensityCircle,
                  intensity === i && styles.selectedIntensity,
                ]}
                onPress={() => setIntensity(i)}
              >
                <Text>{i}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes Input */}
          <TextInput
            placeholder="Add a note (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            style={styles.textInput}
          />

          {/* Calendar */}
          <Text style={styles.label}>Mood Calendar:</Text>
          <Calendar
            markedDates={Object.fromEntries(
              Object.entries(moodHistory)
                .filter(([_, mood]) => MOODS[mood])
                .map(([date, mood]) => [
                  date,
                  {
                    customStyles: {
                      container: {
                        backgroundColor: MOODS[mood].color,
                        borderRadius: 5,
                      },
                      text: {
                        color: 'white',
                      },
                    },
                    marked: true,
                    dotColor: MOODS[mood].color,
                  },
                ])
            )}
            markingType="custom"
            style={{ marginBottom: 20 }}
          />

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={submitMood}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitText}>Submit Mood</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default MoodTracker;
