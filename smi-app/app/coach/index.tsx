import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FIREBASE_AUTH } from '../../FirebaseConfig';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';

const CoachDashboard = () => {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(FIREBASE_AUTH);
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome, Coach!</Text>
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
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 24,
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
  },
});

export default CoachDashboard;
