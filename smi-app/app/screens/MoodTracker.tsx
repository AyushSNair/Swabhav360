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
  Animated,
  Dimensions,
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
  const [positiveBehaviors, setPositiveBehaviors] = useState<{ label: string; note?: string }[]>([]);
  const [progressReport, setProgressReport] = useState('');
  const scaleAnim = new Animated.Value(1);
  const fadeAnim = new Animated.Value(1);
  const [newBehaviorLabel, setNewBehaviorLabel] = useState('');
  const [newBehaviorNote, setNewBehaviorNote] = useState('');

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
          positiveBehaviors,
          progressReport,
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
    setPositiveBehaviors([]);
    setProgressReport('');
  };

  const animateMoodSelection = (mood: MoodType) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setSelectedMood(mood);
  };

  const moodButtons = useMemo(() => {
    return Object.entries(MOODS).map(([key, { emoji, label, color }]) => (
      <TouchableOpacity
        key={key}
        onPress={() => animateMoodSelection(key as MoodType)}
        style={[
          styles.moodButton,
          selectedMood === key && styles.selectedMood,
          { borderColor: color },
        ]}
        accessibilityLabel={`Mood: ${label}`}
        accessibilityRole="button"
      >
        <Text style={styles.moodEmoji}>{emoji}</Text>
        <Text style={[styles.moodLabel, { color: selectedMood === key ? color : '#666' }]}>{label}</Text>
      </TouchableOpacity>
    ));
  }, [selectedMood]);

  const addPositiveBehavior = () => {
    if (!newBehaviorLabel.trim()) return;
    setPositiveBehaviors(prev => [...prev, { label: newBehaviorLabel.trim(), note: newBehaviorNote.trim() }]);
    setNewBehaviorLabel('');
    setNewBehaviorNote('');
  };

  const removePositiveBehavior = (index: number) => {
    setPositiveBehaviors(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerDate}>{formattedDate}</Text>
          <Text style={styles.headerGreeting}>How are you feeling today?</Text>
        </View>
        <TouchableOpacity style={styles.profilePic}>
          <Ionicons name="person-circle" size={40} color="#6C4AB6" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Mood Selector */}
          <View style={styles.moodSelectorContainer}>
            <Animated.View 
              style={[
                styles.moodArc,
                { 
                  borderColor: selectedMood ? MOODS[selectedMood].color : '#ccc',
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              <Text style={styles.moodEmojiBig}>
                {selectedMood ? MOODS[selectedMood].emoji : '🙂'}
              </Text>
            </Animated.View>
            <Text style={styles.moodLabelBig}>
              {selectedMood ? MOODS[selectedMood].label : 'Select your mood'}
            </Text>
            <View style={styles.moodButtonRow}>
              {Object.entries(MOODS).map(([key, { emoji, label, color }]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => animateMoodSelection(key as MoodType)}
                  style={[
                    styles.moodButton,
                    selectedMood === key && styles.selectedMood,
                    { borderColor: color }
                  ]}
                >
                  <Text style={styles.moodEmoji}>{emoji}</Text>
                  <Text style={[styles.moodLabel, { color: selectedMood === key ? color : '#666' }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Intensity Section */}
          <View style={styles.intensitySection}>
            <Text style={styles.intensityLabel}>How intense is this feeling?</Text>
            <View style={styles.intensityRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.intensityCircle,
                    intensity === i && styles.selectedIntensity,
                    { 
                      backgroundColor: intensity === i && selectedMood 
                        ? MOODS[selectedMood].color + '20' 
                        : 'transparent' 
                    }
                  ]}
                  onPress={() => setIntensity(i)}
                >
                  <Text style={[
                    styles.intensityText,
                    { 
                      color: intensity === i && selectedMood 
                        ? MOODS[selectedMood].color 
                        : '#666' 
                    }
                  ]}>
                    {i}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Gratitude Section */}
          <View style={styles.gratitudeSection}>
            <Text style={styles.gratefulLabel}>What are you grateful for today?</Text>
            <TextInput
              placeholder="I am grateful for..."
              value={notes}
              onChangeText={setNotes}
              multiline
              style={styles.gratefulInput}
              placeholderTextColor="#999"
            />
          </View>

          {/* Positive Behaviors Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Positive Behaviors</Text>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Behavior (e.g., Helped a friend)"
                value={newBehaviorLabel}
                onChangeText={setNewBehaviorLabel}
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity style={styles.addButton} onPress={addPositiveBehavior}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { marginBottom: 8 }]}
              placeholder="Optional note"
              value={newBehaviorNote}
              onChangeText={setNewBehaviorNote}
              placeholderTextColor="#9CA3AF"
            />
            {positiveBehaviors.length > 0 && (
              <View style={{ marginTop: 8 }}>
                {positiveBehaviors.map((b, i) => (
                  <View key={i} style={styles.behaviorItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.behaviorLabel}>{b.label}</Text>
                      {b.note ? <Text style={styles.behaviorNote}>{b.note}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={() => removePositiveBehavior(i)}>
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Progress Report Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Progress Report for Counselor</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Write your progress report here..."
              value={progressReport}
              onChangeText={setProgressReport}
              multiline
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Calendar Card */}
          <View style={styles.calendarCard}>
            <Text style={styles.calendarTitle}>Your Mood History</Text>
            <Calendar
              markedDates={Object.fromEntries(
                Object.entries(moodHistory).map(([date, mood]) => [
                  date,
                  {
                    customStyles: {
                      container: {
                        backgroundColor: MOODS[mood].color,
                        borderRadius: 8,
                        elevation: 2,
                      },
                      text: {
                        color: 'white',
                        fontWeight: '600',
                      },
                    },
                  },
                ])
              )}
              markingType="custom"
              style={styles.calendarStyle}
              theme={{
                todayTextColor: '#6C4AB6',
                selectedDayBackgroundColor: '#6C4AB6',
                arrowColor: '#6C4AB6',
              }}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[
              styles.submitButton,
              { 
                backgroundColor: selectedMood 
                  ? MOODS[selectedMood].color 
                  : '#ccc' 
              }
            ]} 
            onPress={submitMood}
            disabled={!selectedMood || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitText}>
                {moodHistory[today] ? 'Update Mood' : 'Save Mood'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navIcon}>
          <Ionicons name="home" size={28} color="#6C4AB6" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navIcon, styles.activeNavIcon]}>
          <FontAwesome name="smile-o" size={28} color="#F7C04A" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navIcon}>
          <MaterialIcons name="bar-chart" size={28} color="#6C4AB6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navIcon}>
          <Ionicons name="settings" size={28} color="#6C4AB6" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default MoodTracker;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6FF',
  },
  scrollContainer: {
    padding: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  headerDate: {
    color: '#6C4AB6',
    fontSize: 13,
    fontWeight: '400',
  },
  headerGreeting: {
    color: '#6C4AB6',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0e6ff',
    borderColor: '#ccc',
  },
  moodSelectorContainer: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  moodArc: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  moodEmojiBig: {
    fontSize: 48,
  },
  moodLabelBig: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6C4AB6',
    marginBottom: 16,
  },
  moodButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  moodButton: {
    padding: 12,
    margin: 4,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    width: '30%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedMood: {
    backgroundColor: '#f8f6ff',
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  intensitySection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  intensityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C4AB6',
    marginBottom: 16,
  },
  intensityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  intensityCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#6C4AB6',
  },
  selectedIntensity: {
    borderWidth: 3,
  },
  intensityText: {
    fontSize: 16,
    fontWeight: '600',
  },
  gratitudeSection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gratefulLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C4AB6',
    marginBottom: 12,
  },
  gratefulInput: {
    backgroundColor: '#f8f6ff',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#333',
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C4AB6',
    marginBottom: 12,
  },
  calendarStyle: {
    borderRadius: 12,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  navIcon: {
    padding: 8,
  },
  activeNavIcon: {
    backgroundColor: '#f8f6ff',
    borderRadius: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6C4AB6',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f6ff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#6C4AB6',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  behaviorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  behaviorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C4AB6',
  },
  behaviorNote: {
    fontSize: 14,
    color: '#6B7280',
  },
});
