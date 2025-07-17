import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  Modal,
  ScrollView
} from "react-native";
import { createClass, listClasses, deleteClass } from "../../services/classService";
import { FIRESTORE_DB } from '../../FirebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

const COACH_EMAILS = ['coach1@smi.com', 'coach2@smi.com'];

export default function ManageClassesScreen() {
  const [classes, setClasses] = useState<any[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigation = useNavigation();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses();
    fetchUsers();
  }, []);

  async function fetchClasses() {
    setLoading(true);
    try {
      const data = await listClasses();
      setClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      Alert.alert('Error', 'Failed to fetch classes');
    }
    setLoading(false);
  }

  async function fetchUsers() {
    try {
      const usersSnap = await getDocs(collection(FIRESTORE_DB, 'users'));
      const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  async function handleCreateClass() {
    if (!newClassName.trim()) {
      Alert.alert('Error', 'Please enter a class name');
      return;
    }
    if (!selectedCoachId) {
      Alert.alert('Error', 'Please select a coach');
      return;
    }
    setCreating(true);
    try {
      await createClass(newClassName, newClassDescription, selectedCoachId);
      setNewClassName("");
      setNewClassDescription("");
      setSelectedCoachId(null);
      setShowCreateModal(false);
      Alert.alert('Success', 'Class created successfully!');
      fetchClasses();
    } catch (error) {
      console.error('Error creating class:', error);
      Alert.alert('Error', 'Failed to create class');
    }
    setCreating(false);
  }

  async function handleDeleteClass(classId: string, className: string) {
    Alert.alert(
      'Delete Class',
      `Are you sure you want to delete "${className}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClass(classId);
              Alert.alert('Success', 'Class deleted successfully');
              fetchClasses();
            } catch (error) {
              console.error('Error deleting class:', error);
              Alert.alert('Error', 'Failed to delete class');
            }
          }
        }
      ]
    );
  }

  function renderClassCard(item: any) {
    const studentCount = item.studentIds ? item.studentIds.length : 0;
    
    // Handle different date formats
    let createdDate = 'N/A';
    if (item.createdAt) {
      try {
        if (item.createdAt.toDate && typeof item.createdAt.toDate === 'function') {
          // Firestore timestamp
          createdDate = new Date(item.createdAt.toDate()).toLocaleDateString();
        } else if (item.createdAt instanceof Date) {
          // JavaScript Date object
          createdDate = item.createdAt.toLocaleDateString();
        } else if (typeof item.createdAt === 'string') {
          // String date
          createdDate = new Date(item.createdAt).toLocaleDateString();
        } else if (typeof item.createdAt === 'number') {
          // Timestamp number
          createdDate = new Date(item.createdAt).toLocaleDateString();
        }
      } catch (error) {
        console.warn('Error parsing date:', error);
        createdDate = 'N/A';
      }
    }

    return (
      <TouchableOpacity 
        style={styles.classCard}
        onPress={() => {
          (navigation as any).navigate('ClassDetails', { 
            classId: item.id, 
            className: item.name 
          });
        }}
        activeOpacity={0.8}
      >
        <View style={styles.classHeader}>
          <View style={styles.classTitleContainer}>
            <Text style={styles.className}>{item.name}</Text>
            <View style={styles.studentBadge}>
              <Text style={styles.studentBadgeText}>{studentCount} students</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteClass(item.id, item.name)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        {item.description && (
          <Text style={styles.classDescription}>{item.description}</Text>
        )}
        
        <View style={styles.cardFooter}>
          <View style={styles.viewDetailsContainer}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Text style={styles.viewDetailsArrow}>→</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Manage Classes</Text>
          <Text style={styles.subtitle}>Create and organize your classes</Text>
        </View>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>＋ New Class</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>📚</Text>
          </View>
          <Text style={styles.statNumber}>{Array.isArray(classes) ? classes.length : 0}</Text>
          <Text style={styles.statLabel}>Total Classes</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>👥</Text>
          </View>
          <Text style={styles.statNumber}>
            {(Array.isArray(classes) ? classes : []).reduce((total, cls) => total + (cls.studentIds ? cls.studentIds.length : 0), 0)}
          </Text>
          <Text style={styles.statLabel}>Total Students</Text>
        </View>
      </View>

      {/* Classes List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading classes...</Text>
        </View>
      ) : (
        <FlatList
          data={Array.isArray(classes) ? classes : []}
          keyExtractor={item => item.id}
          refreshing={loading}
          onRefresh={fetchClasses}
          renderItem={({ item }) => renderClassCard(item)}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Class Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create New Class</Text>
                <Text style={styles.modalSubtitle}>Set up a new class for your students</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowCreateModal(false)}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Class Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Mathematics Grade 10"
                  placeholderTextColor="#999"
                  value={newClassName}
                  onChangeText={setNewClassName}
                  autoFocus={true}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Brief description of the class..."
                  placeholderTextColor="#999"
                  value={newClassDescription}
                  onChangeText={setNewClassDescription}
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Assign Coach *</Text>
                <View style={styles.dropdownContainer}>
                  <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
                    {users.filter(u => COACH_EMAILS.includes(u.email)).map(coach => (
                      <TouchableOpacity
                        key={coach.id}
                        style={[
                          styles.dropdownItem,
                          selectedCoachId === coach.id && styles.selectedDropdownItem
                        ]}
                        onPress={() => setSelectedCoachId(coach.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          selectedCoachId === coach.id && styles.selectedDropdownItemText
                        ]}>
                          {coach.email}
                        </Text>
                        {selectedCoachId === coach.id && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowCreateModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.createModalButton,
                    (!newClassName.trim() || !selectedCoachId) && styles.disabledButton
                  ]}
                  onPress={handleCreateClass}
                  disabled={!newClassName.trim() || !selectedCoachId || creating}
                  activeOpacity={0.8}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.createModalButtonText}>Create Class</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  createButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'flex-start',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 24,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  className: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 6,
  },
  studentBadge: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  studentBadgeText: {
    fontSize: 12,
    color: '#2B6CB0',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: 'bold',
  },
  classDescription: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 22,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 15,
    color: '#4A90E2',
    fontWeight: '500',
    marginRight: 6,
  },
  viewDetailsArrow: {
    fontSize: 16,
    color: '#4A90E2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1A202C',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    maxHeight: 120,
  },
  dropdownScroll: {
    maxHeight: 120,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectedDropdownItem: {
    backgroundColor: '#EBF8FF',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedDropdownItemText: {
    color: '#2B6CB0',
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 16,
    color: '#2B6CB0',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  createModalButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createModalButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#CBD5E0',
    shadowOpacity: 0,
    elevation: 0,
  },
});