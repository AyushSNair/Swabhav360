import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../../FirebaseConfig';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';

const AdminDashboard = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const route = useRoute();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    await signOut(FIREBASE_AUTH);
    router.replace('/login');
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(FIRESTORE_DB, 'users');
        const usersSnap = await getDocs(usersRef);
        const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome, Admin!</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>Registered Users</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.userCard} onPress={() => (navigation as any).navigate('UserDetails', { userId: item.id })}>
              <Text style={styles.userName}>{item.name || item.displayName || item.email || 'No Name'}</Text>
              <Text style={styles.userDetail}>Gender: {item.gender}</Text>
              {item.profileComplete !== undefined && (
                <Text style={styles.userDetail}>Profile Complete: {item.profileComplete ? 'Yes' : 'No'}</Text>
              )}
              <Text style={styles.userDetail}>School: {item.schoolName}</Text>
              {/* Add more user details as needed */}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text>No users found.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 40,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 32,
    marginBottom: 12,
    color: '#111827',
  },
  userCard: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    width: 320,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  userDetail: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
  },
});

export default AdminDashboard;
