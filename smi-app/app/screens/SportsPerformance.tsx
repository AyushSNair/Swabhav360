import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, FlatList, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { VictoryChart, VictoryLine, VictoryTheme, VictoryAxis } from 'victory-native';

const SKILLS = [
  { key: 'left_leg', label: 'Left Leg Practice' },
  { key: 'right_leg', label: 'Right Leg Practice' },
  { key: 'coordination', label: 'Coordination' },
];

const SportsPerformance = () => {
  const [skills, setSkills] = useState({ left_leg: 0, right_leg: 0, coordination: 0 });
  const [metrics, setMetrics] = useState<{ date: string; value: number }[]>([]);
  const [metricValue, setMetricValue] = useState('');
  const [media, setMedia] = useState<{ uri: string; type: 'photo' | 'video' }[]>([]);
  const [coachNotes, setCoachNotes] = useState('');

  // Skill increment
  const incrementSkill = (key: keyof typeof skills) => {
    setSkills(prev => ({ ...prev, [key]: prev[key] + 1 }));
  };

  // Add performance metric
  const addMetric = () => {
    if (!metricValue) return;
    setMetrics(prev => [...prev, { date: new Date().toLocaleDateString(), value: parseFloat(metricValue) }]);
    setMetricValue('');
  };

  // Pick photo/video
  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setMedia(prev => [...prev, { uri: asset.uri, type: asset.type === 'video' ? 'video' : 'photo' }]);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Sports Performance</Text>

      {/* Skill Tracking */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Individual Skill Tracking</Text>
        {SKILLS.map(skill => (
          <View key={skill.key} style={styles.skillRow}>
            <Text style={styles.skillLabel}>{skill.label}</Text>
            <View style={styles.skillValueRow}>
              <Text style={styles.skillValue}>{skills[skill.key]}</Text>
              <TouchableOpacity style={styles.incrementButton} onPress={() => incrementSkill(skill.key as keyof typeof skills)}>
                <Text style={styles.incrementButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Progress Media */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Progress Photos/Videos</Text>
        <TouchableOpacity style={styles.addButton} onPress={pickMedia}>
          <Text style={styles.addButtonText}>Add Photo/Video</Text>
        </TouchableOpacity>
        <ScrollView horizontal style={{ marginTop: 12 }}>
          {media.map((item, idx) => (
            <View key={idx} style={styles.mediaThumb}>
              {item.type === 'photo' ? (
                <Image source={{ uri: item.uri }} style={styles.mediaImage} />
              ) : (
                <View style={styles.videoThumb}><Text>🎬</Text></View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Performance Metrics */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Performance Metrics Over Time</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="Metric value (e.g., time, reps)"
            value={metricValue}
            onChangeText={setMetricValue}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.addButton} onPress={addMetric}>
            <Text style={styles.addButtonText}>Log</Text>
          </TouchableOpacity>
        </View>
        {metrics.length > 0 && (
          <VictoryChart theme={VictoryTheme.material} domainPadding={10} height={220}>
            <VictoryAxis dependentAxis tickFormat={(x) => `${x}`} />
            <VictoryAxis tickFormat={(x) => x} />
            <VictoryLine
              data={metrics}
              x="date"
              y="value"
              style={{ data: { stroke: '#6C4AB6', strokeWidth: 2 } }}
            />
          </VictoryChart>
        )}
      </View>

      {/* Coach Notes */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Coach Observations & Notes</Text>
        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder="Coach's notes..."
          value={coachNotes}
          onChangeText={setCoachNotes}
          multiline
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F6FF', padding: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#6C4AB6', marginBottom: 16, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#6C4AB6', marginBottom: 8 },
  skillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  skillLabel: { fontSize: 16, color: '#6C4AB6' },
  skillValueRow: { flexDirection: 'row', alignItems: 'center' },
  skillValue: { fontSize: 18, fontWeight: '700', color: '#6C4AB6', marginRight: 8 },
  incrementButton: { backgroundColor: '#6C4AB6', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4 },
  incrementButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  addButton: { backgroundColor: '#6C4AB6', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  mediaThumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#F8F6FF', marginRight: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mediaImage: { width: 64, height: 64, borderRadius: 12 },
  videoThumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: '#f8f6ff', borderRadius: 12, padding: 12, fontSize: 16, color: '#333', marginBottom: 8 },
});

export default SportsPerformance; 