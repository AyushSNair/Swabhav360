import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../../FirebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, getDocs } from 'firebase/firestore';

type User = {
  id: string;
  name?: string;
  displayName?: string;
  email?: string;
  schoolName?: string;
  gender?: string;
  profileComplete?: boolean;
};

const COACH_EMAILS = ['coach1@smi.com', 'coach2@smi.com']; // Add all coach emails here

const AdminDashboard = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    await signOut(FIREBASE_AUTH);
    // navigation.navigate('Login'); // No navigation needed, handled by auth state
  };

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const getProfileEmoji = (profileComplete: boolean) => {
    return profileComplete ? '🌟' : '⭐';
  };

  const getGenderEmoji = (gender: string) => {
    switch (gender?.toLowerCase()) {
      case 'male': return '👦';
      case 'female': return '👧';
      default: return '🧒';
    }
  };

  const renderUserCard = ({ item }: { item: User }) => {
    const isCoach = COACH_EMAILS.includes(item.email ?? '');
    return (
      <TouchableOpacity 
        style={styles.userCard} 
        onPress={() => (navigation as any).navigate('UserDetails', { userId: item.id })}
      >
        <View style={styles.userCardHeader}>
          <Text style={styles.userEmoji}>{getGenderEmoji(item.gender ?? "")}</Text>
          <Text style={styles.profileStatus}>
            {getProfileEmoji(item.profileComplete ?? false)}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.name || item.displayName || item.email || 'Mystery Student'}
          </Text>
          {!isCoach && (
            <Text style={styles.userSchool} numberOfLines={1}>
              🏫 {item.schoolName || 'Unknown School'}
            </Text>
          )}
        </View>
        <View style={styles.userStats}>
          <View style={styles.statBadge}>
            <Text style={styles.statValue}>
              {item.profileComplete ? 'Complete' : 'Pending'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Separate students and coaches
  const students = users.filter(user => !COACH_EMAILS.includes(user.email));
  const coaches = users.filter(user => COACH_EMAILS.includes(user.email));

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Admin Command Center</Text>
        <Text style={styles.subtitle}>Managing Young Learners</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Manage Classes Button */}
      <TouchableOpacity
        style={styles.manageClassesButton}
        onPress={() => (navigation as any).navigate('ManageClasses')}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Manage Classes</Text>
      </TouchableOpacity>
      <Text style={styles.manageClassesHint}>Click here to manage classes</Text>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>👥</Text>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>✨</Text>
          <Text style={styles.statNumber}>
            {students.filter(user => user.profileComplete).length}
          </Text>
          <Text style={styles.statLabel}>Complete Student Profiles</Text>
        </View>
      </View>

      {/* Student Explorer Section */}
      <View style={styles.usersSection}>
        <Text style={styles.sectionTitle}>🌟 Student Explorer</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingText}>Loading amazing students...</Text>
          </View>
        ) : students.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No students found yet!</Text>
            <Text style={styles.emptySubtext}>They'll appear here once they join</Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {students.map((student, index) => (
              <View key={student.id} style={styles.cardWrapper}>
                {renderUserCard({ item: student })}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Coaches Section */}
      {coaches.length > 0 && (
        <View style={styles.usersSection}>
          <Text style={styles.sectionTitle}>🧑‍🏫 Coaches</Text>
          <View style={styles.gridContainer}>
            {coaches.map((coach, index) => (
              <View key={coach.id} style={styles.cardWrapper}>
                {renderUserCard({ item: coach })}
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  scrollContent: {
    paddingBottom: 60, // Add proper bottom padding
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  cardWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  manageClassesButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 25,
    marginVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: 220,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 56,
    borderWidth: 2,
    borderColor: '#312E81',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  manageClassesHint: {
    textAlign: 'center',
    color: '#4F46E5',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  header: {
    backgroundColor: '#6366F1',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#C7D2FE',
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  usersSection: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    width: '100%',
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userEmoji: {
    fontSize: 28,
  },
  profileStatus: {
    fontSize: 20,
  },
  userInfo: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  userSchool: {
    fontSize: 12,
    color: '#6B7280',
  },
  userStats: {
    alignItems: 'center',
  },
  statBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  statText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
});

export default AdminDashboard;