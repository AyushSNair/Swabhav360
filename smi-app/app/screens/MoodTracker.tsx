import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Toast from 'react-native-toast-message';
import { FIREBASE_AUTH } from '../../FirebaseConfig';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';

Toast.show({
  type: 'success',
  text1: 'Mood submitted!',
});

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

const MoodTracker = () => {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [moodHistory, setMoodHistory] = useState<Record<string, MoodType>>({});

  const today = new Date().toISOString().split('T')[0];

  // Helper for header date
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Helper for mood arc color
  const moodArcColor = selectedMood ? MOODS[selectedMood].color : '#ccc';

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
            history[date] = entry.mood;
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
    if (!user) return Toast.show({ type: 'error', text1: 'Not logged in' });

    if (!selectedMood) {
      Toast.show({ type: 'error', text1: 'Please select a mood' });
      return;
    }

    if (intensity < 1 || intensity > 5) {
      Toast.show({ type: 'error', text1: 'Invalid intensity' });
      return;
    }

    try {
      setLoading(true);
      const token = await user.getIdToken();
      const isUpdating = moodHistory.hasOwnProperty(today);

      const response = await fetch('http://192.168.7.10:3000/api/module/mood', {
        method: isUpdating ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mood: selectedMood,
          note: notes,
          intensity,
          date: today,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMoodHistory((prev) => ({ ...prev, [today]: selectedMood }));
        Toast.show({
          type: 'success',
          text1: isUpdating ? 'Mood updated!' : 'Mood submitted!',
        });
        resetForm();
      } else {
        Toast.show({ type: 'error', text1: data.error || 'Submission failed' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Network Error', text2: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedMood(null);
    setNotes('');
    setIntensity(3);
  };

  const moodButtons = useMemo(() => {
    return Object.entries(MOODS).map(([key, { emoji, label }]) => (
      <TouchableOpacity
        key={key}
        onPress={() => setSelectedMood(key as MoodType)}
        style={[
          styles.moodButton,
          selectedMood === key && styles.selectedMood,
        ]}
        accessibilityLabel={`Mood: ${label}`}
        accessibilityRole="button"
      >
        <Text style={styles.moodEmoji}>{emoji}</Text>
        <Text style={{ textAlign: 'center', fontSize: 12 }}>{label}</Text>
      </TouchableOpacity>
    ));
  }, [selectedMood]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F6FF' }}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerDate}>{formattedDate}</Text>
          <Text style={styles.headerGreeting}>Hey Jane</Text>
        </View>
        <View style={styles.profilePic} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {/* Calendar Card */}
          <View style={styles.cardYellow}>
            {!moodHistory[today] && (
              <TouchableOpacity onPress={() => {}}>
                <Text style={styles.noEntryText}>No entries found for today.\nClick here to add your mood for today!</Text>
              </TouchableOpacity>
            )}
            <Calendar
              markedDates={Object.fromEntries(
                Object.entries(moodHistory).map(([date, mood]) => [
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
                  },
                ])
              )}
              markingType="custom"
              style={styles.calendarStyle}
            />
            <Text style={styles.gratefulLabel}>What are you grateful for today?</Text>
            <TextInput
              placeholder="I am grateful for..."
              value={notes}
              onChangeText={setNotes}
              multiline
              style={styles.gratefulInput}
            />
          </View>
          {/* Mood Selector */}
          <View style={styles.moodSelectorContainer}>
            <View style={[styles.moodArc, { borderColor: moodArcColor }]}> 
              <Text style={styles.moodEmojiBig}>{selectedMood ? MOODS[selectedMood].emoji : '🙂'}</Text>
            </View>
            <Text style={styles.moodLabelBig}>{selectedMood ? MOODS[selectedMood].label : 'How are you feeling right now?'}</Text>
            <View style={styles.moodButtonRow}>{moodButtons}</View>
          </View>
          {/* Intensity */}
          <View style={styles.intensitySection}>
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
          </View>
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
      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navIcon}><Ionicons name="home" size={28} color="#6C4AB6" /></TouchableOpacity>
        <TouchableOpacity style={styles.navIcon}><FontAwesome name="smile-o" size={28} color="#F7C04A" /></TouchableOpacity>
        <TouchableOpacity style={styles.navIcon}><MaterialIcons name="bar-chart" size={28} color="#6C4AB6" /></TouchableOpacity>
        <TouchableOpacity style={styles.navIcon}><Ionicons name="settings" size={28} color="#6C4AB6" /></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default MoodTracker;

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
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
    alignItems: 'center',
    width: '30%',
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F6FF',
  },
  headerDate: {
    color: '#6C4AB6',
    fontSize: 13,
    fontWeight: '400',
  },
  headerGreeting: {
    color: '#6C4AB6',
    fontSize: 20,
    fontWeight: '700',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ccc',
  },
  cardYellow: {
    backgroundColor: '#F7C04A',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  noEntryText: {
    color: '#6C4AB6',
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  calendarStyle: {
    borderRadius: 10,
    marginBottom: 10,
  },
  gratefulLabel: {
    color: '#6C4AB6',
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  gratefulInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    minHeight: 40,
    marginBottom: 0,
  },
  moodSelectorContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },
  moodArc: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  moodEmojiBig: {
    fontSize: 48,
  },
  moodLabelBig: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6C4AB6',
    marginBottom: 10,
  },
  moodButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 10,
  },
  intensitySection: {
    marginBottom: 18,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  navIcon: {
    padding: 8,
  },
});
