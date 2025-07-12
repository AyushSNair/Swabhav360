import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Alert
} from 'react-native';
import { FIREBASE_AUTH } from '../../FirebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import AttendanceTracker from './attendance-tracker';
import SkillAssessment from './skill-assessment';
import Tasks from './tasks';

const API_URL = 'https://smi-backend-ieme.onrender.com/api/class';

interface Student {
  id: string;
  name: string;
  email: string;
  present: boolean;
}

interface Class {
  id: string;
  name: string;
  subject: string;
  time: string;
  students: Student[];
}

const CoachDashboard = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'classes' | 'attendance' | 'skills' | 'tasks'>('classes');
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [showStudents, setShowStudents] = useState(false);
  const [isViewingAttendance, setIsViewingAttendance] = useState(false);
  const [isViewingSkills, setIsViewingSkills] = useState(false);
  const [isViewingTasks, setIsViewingTasks] = useState(false);



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

  const handleSaveAttendance = async (classId: string, date: string, attendance: any[]) => {
    try {
      const response = await fetch(`${API_URL}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await FIREBASE_AUTH.currentUser?.getIdToken()}`
        },
        body: JSON.stringify({
          classId,
          date,
          attendance
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save attendance');
      }

      Alert.alert('Success', 'Attendance saved successfully');
      setShowStudents(false);
      setSelectedClass(null);
    } catch (error) {
      console.error('Error saving attendance:', error);
      Alert.alert('Error', 'Failed to save attendance');
    }
  };

  const handleSaveAssessment = async (classId: string, assessment: any): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await FIREBASE_AUTH.currentUser?.getIdToken()}`
        },
        body: JSON.stringify(assessment)
      });

      if (!response.ok) {
        throw new Error('Failed to save assessment');
      }

      Alert.alert('Success', 'Skill assessment saved successfully');
    } catch (error) {
      console.error('Error saving assessment:', error);
      Alert.alert('Error', 'Failed to save skill assessment');
      throw error; // Re-throw to let the SkillAssessment component handle the error
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading your classes...</Text>
      </View>
    );
  }

  const renderClassCard = ({ item }: { item: Class }) => (
    <TouchableOpacity
      style={styles.classCard}
      activeOpacity={0.9}
      onPress={() => {
        setSelectedClass(item);
        if (activeTab === 'classes') {
          setShowStudents(true);
          setIsViewingAttendance(false);
        }
      }}>
      <View style={styles.classCardContent}>
        <Text style={styles.classTitle}>{item.name}</Text>
        <Text style={styles.classSubtitle}>{item.students.length} students</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
    </TouchableOpacity>
  );

  const renderStudentList = () => {
    if (!selectedClass) return null;
    
    const handleViewAttendance = (classItem: Class) => {
      setSelectedClass(classItem);
      setIsViewingAttendance(true);
    };

    const handleViewSkills = (classItem: Class) => {
      setSelectedClass(classItem);
      setIsViewingSkills(true);
    };

    const handleViewTasks = (classItem: Class) => {
      setSelectedClass(classItem);
      setIsViewingTasks(true);
    };

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              setShowStudents(false);
              setIsViewingAttendance(false);
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Back to Classes</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedClass.name}</Text>
          <TouchableOpacity 
            style={styles.attendanceButton}
            onPress={() => setIsViewingAttendance(true)}
          >
            <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
            <Text style={styles.attendanceButtonText}>View Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.skillsButton}
            onPress={() => setIsViewingSkills(true)}
          >
            <MaterialIcons name="assessment" size={20} color="#FFFFFF" />
            <Text style={styles.skillsButtonText}>Skill Assessment</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tasksButton}
            onPress={() => setIsViewingTasks(true)}
          >
            <MaterialIcons name="assignment" size={20} color="#FFFFFF" />
            <Text style={styles.tasksButtonText}>Tasks</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.studentListContainer}>
          <Text style={styles.studentListTitle}>Students in this class</Text>
          <FlatList
            data={selectedClass.students}
            renderItem={({ item }) => (
              <View style={styles.studentCard}>
                <MaterialIcons name="person" size={24} color="#4F46E5" />
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.studentEmail}>{item.email}</Text>
                </View>
              </View>
            )}
            keyExtractor={item => item.id}
          />
        </View>
      </View>
    );
  };

  if (selectedClass && activeTab === 'attendance') {
    return (
      <AttendanceTracker 
        selectedClass={selectedClass}
        onBack={() => setSelectedClass(null)}
        onSave={handleSaveAttendance}
      />
    );
  }

  if (selectedClass && activeTab === 'skills') {
    return (
      <SkillAssessment 
        selectedClass={selectedClass}
        onBack={() => setSelectedClass(null)}
        onSave={handleSaveAssessment}
      />
    );
  }

  if (selectedClass && activeTab === 'tasks') {
    return (
      <Tasks 
        selectedClass={selectedClass}
        onBack={() => setSelectedClass(null)}
      />
    );
  }

  const renderContent = () => {
    if (showStudents && selectedClass) return renderStudentList();
    
    return (
      <View style={styles.container}>
        {/* Header with gradient */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.coachName}>Coach!</Text>
            </View>
            <View style={styles.avatar}>
              <MaterialIcons name="account-circle" size={48} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.subtitle}>Manage your classes and track attendance</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="class" size={24} color="#4F46E5" />
            <Text style={styles.statNumber}>{classes.length}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </View>
          <View style={styles.statCard}>  
            <MaterialIcons name="people" size={24} color="#10B981" />
            <Text style={styles.statNumber}>
              {classes.reduce((acc: number, cls: Class) => acc + cls.students.length, 0)}
            </Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
        </View>

        {/* Content will be shown here */}
        
        {/* Content Area */}
        <View style={styles.contentContainer}>
          {activeTab === 'classes' ? (
            <View style={{ flex: 1 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Classes</Text>
                <TouchableOpacity style={styles.refreshButton}>
                  <MaterialIcons name="refresh" size={20} color="#4F46E5" />
                </TouchableOpacity>
              </View>
              
              {classes.length > 0 ? (
                <FlatList
                  data={classes}
                  renderItem={renderClassCard}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.classList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <View style={styles.emptyIllustration}>
                        <MaterialIcons name="class" size={64} color="#E0E7FF" />
                      </View>
                      <Text style={styles.emptyTitle}>No Classes Found</Text>
                      <Text style={styles.emptyText}>You don't have any classes assigned yet.</Text>
                    </View>
                  }
                />
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIllustration}>
                    <MaterialIcons name="class" size={64} color="#E0E7FF" />
                  </View>
                  <Text style={styles.emptyTitle}>No Classes Assigned</Text>
                  <Text style={styles.emptyText}>You'll see your classes here once they're assigned.</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.attendanceContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {activeTab === 'skills' ? 'Skill Assessment' : 
                   activeTab === 'tasks' ? 'Task Management' : 
                   'Mark Attendance'}
                </Text>
              </View>
              
              {classes.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIllustration}>
                    <MaterialIcons name="check-circle" size={64} color="#E0E7FF" />
                  </View>
                  <Text style={styles.emptyTitle}>No Classes Available</Text>
                  <Text style={styles.emptyText}>You need to have classes assigned to mark attendance.</Text>
                </View>
              ) : (
                <FlatList
                  data={classes}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.classCard}
                      onPress={() => setSelectedClass(item)}
                    >
                      <View style={styles.classHeader}>
                        <Text style={styles.classTitle}>{item.name}</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
                      </View>
                      <Text style={styles.classSubtitle}>{item.students.length} students</Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.classList}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          )}
        </View>
        
        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={[styles.navButton, activeTab === 'classes' && styles.activeNavButton]}
            onPress={() => setActiveTab('classes')}
          >
            <MaterialIcons 
              name="class" 
              size={24} 
              color={activeTab === 'classes' ? '#4F46E5' : '#6B7280'} 
            />
            <Text style={[styles.navButtonText, activeTab === 'classes' && styles.activeNavButtonText]}>
              Classes
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, activeTab === 'attendance' && styles.activeNavButton]}
            onPress={() => setActiveTab('attendance')}
          >
            <MaterialIcons 
              name="check-circle" 
              size={24} 
              color={activeTab === 'attendance' ? '#4F46E5' : '#6B7280'} 
            />
            <Text style={[styles.navButtonText, activeTab === 'attendance' && styles.activeNavButtonText]}>
              Attendance
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, activeTab === 'skills' && styles.activeNavButton]}
            onPress={() => setActiveTab('skills')}
          >
            <MaterialIcons 
              name="assessment" 
              size={24} 
              color={activeTab === 'skills' ? '#4F46E5' : '#6B7280'} 
            />
            <Text style={[styles.navButtonText, activeTab === 'skills' && styles.activeNavButtonText]}>
              Skills
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, activeTab === 'tasks' && styles.activeNavButton]}
            onPress={() => setActiveTab('tasks')}
          >
            <MaterialIcons 
              name="assignment" 
              size={24} 
              color={activeTab === 'tasks' ? '#4F46E5' : '#6B7280'} 
            />
            <Text style={[styles.navButtonText, activeTab === 'tasks' && styles.activeNavButtonText]}>
              Tasks
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={24} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  studentListContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  studentListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  studentInfo: {
    marginLeft: 16,
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  classCardContent: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  header: {
    backgroundColor: '#4F46E5',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#E0E7FF',
    marginBottom: 2,
  },
  coachName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#C7D2FE',
    maxWidth: '80%',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: -24,
    marginBottom: 24,
    zIndex: 10,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabsContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabIcon: {
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#4F46E5',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  classList: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  classHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginLeft: -24, // To center the title accounting for the back button
  },
  classHeaderRight: {
    width: 24, // Same as back button for balance
  },
  classTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  studentRow: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  studentList: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 120,
  },
  attendanceButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  skillsButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillsButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  tasksButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    marginBottom: 16,
    flexDirection: 'row',
  },
  tasksButtonText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  dateSelector: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    margin: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  dateLabel: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 8,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    margin: 20,
    marginTop: 10,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIllustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  // Instruction container
  instructionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginTop: 16,
  },
  infoIcon: {
    marginBottom: 16,
    backgroundColor: '#EEF2FF',
    width: 48,
    height: 48,
    borderRadius: 24,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  instructionText: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  // Bottom navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeNavButton: {
    backgroundColor: '#EEF2FF',
  },
  navButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeNavButtonText: {
    color: '#4F46E5',
  },
  profileButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 16,
  },
  logoutText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 2,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  dateInput: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 15,
  },
  modalButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  attendanceContainer: {
    flex: 1,
    padding: 20,
  },
});

export default CoachDashboard;
