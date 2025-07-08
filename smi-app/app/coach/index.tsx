import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { FIREBASE_AUTH } from '../../FirebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'https://smi-backend-ieme.onrender.com/api/class'; // Update as needed

const CoachDashboard = () => {
  const navigation = useNavigation();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      const user = FIREBASE_AUTH.currentUser;
      if (!user) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/coach/${user.uid}/classes`);
        const data = await res.json();
        setClasses(data);
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
      setLoading(false);
    };
    fetchClasses();
  }, []);

  const handleLogout = async () => {
    await signOut(FIREBASE_AUTH);
    // navigation.replace('Login'); // No navigation needed, handled by auth state
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.text}>Loading your classes...</Text>
      </View>
    );
  }

  if (selectedClass) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <Text style={styles.text}>{selectedClass.name}</Text>
        <Text style={{ marginBottom: 10 }}>Students in this class:</Text>
        {selectedClass.students && selectedClass.students.length > 0 ? (
          selectedClass.students.map((student: any) => (
            <View key={student.id} style={styles.studentCard}>
              <Text style={styles.studentName}>{student.name || student.email}</Text>
              <Text style={styles.studentEmail}>{student.email}</Text>
            </View>
          ))
        ) : (
          <Text>No students assigned to this class yet.</Text>
        )}
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedClass(null)}>
          <Text style={styles.logoutText}>Back to Classes</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome, Coach!</Text>
      <Text style={{ marginBottom: 16 }}>Your Assigned Classes:</Text>
      {classes.length === 0 ? (
        <Text>No classes assigned yet.</Text>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.classCard} onPress={() => setSelectedClass(item)}>
              <Text style={styles.className}>{item.name}</Text>
              <Text style={styles.classDescription}>{item.description}</Text>
              <Text style={styles.classStats}>{item.students?.length || 0} students</Text>
            </TouchableOpacity>
          )}
        />
      )}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 24,
    textAlign: 'center',
  },
  classCard: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    width: 320,
    alignSelf: 'center',
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  classDescription: {
    color: '#6B7280',
    marginTop: 4,
  },
  classStats: {
    color: '#2563EB',
    marginTop: 8,
    fontWeight: 'bold',
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  studentCard: {
    backgroundColor: '#E0E7FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    width: 300,
    alignSelf: 'center',
  },
  studentName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  studentEmail: {
    color: '#374151',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
});

export default CoachDashboard;
