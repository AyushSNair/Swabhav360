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
      >
        <View style={styles.classHeader}>
          <Text style={styles.className}>{item.name}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteClass(item.id, item.name)}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        
        {item.description && (
          <Text style={styles.classDescription}>{item.description}</Text>
        )}
        
        <View style={styles.classStats}>
                     <View style={styles.statItem}>
             <Text style={styles.statLabel}>Students</Text>
             <Text style={styles.statNumber}>{studentCount}</Text>
           </View>
           {/* <View style={styles.statItem}>
             <Text style={styles.statLabel}>Created</Text>
             <Text style={styles.statNumber}>{createdDate}</Text>
           </View> */}
        </View>
        
        <View style={styles.cardFooter}>
          <Text style={styles.viewDetailsText}>Tap to view details →</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Manage Classes</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ New Class</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{Array.isArray(classes) ? classes.length : 0}</Text>
          <Text style={styles.statLabel}>Total Classes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {(Array.isArray(classes) ? classes : []).reduce((total, cls) => total + (cls.studentIds ? cls.studentIds.length : 0), 0)}
          </Text>
          <Text style={styles.statLabel}>Total Students</Text>
        </View>
      </View>

      {/* Classes List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
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
              <Text style={styles.modalTitle}>Create New Class</Text>
              <TouchableOpacity 
                onPress={() => setShowCreateModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Class Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter class name"
                value={newClassName}
                onChangeText={setNewClassName}
                autoFocus={true}
              />

              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter class description"
                value={newClassDescription}
                onChangeText={setNewClassDescription}
                multiline={true}
                numberOfLines={3}
              />

              {/* Coach Dropdown */}
              <Text style={{marginTop: 10, marginBottom: 4}}>Assign Coach:</Text>
              <View style={styles.dropdownContainer}>
                <ScrollView style={{maxHeight: 100}}>
                  {users.filter(u => COACH_EMAILS.includes(u.email)).map(coach => (
                    <TouchableOpacity
                      key={coach.id}
                      style={selectedCoachId === coach.id ? styles.selectedDropdownItem : styles.dropdownItem}
                      onPress={() => setSelectedCoachId(coach.id)}
                    >
                      <Text>{coach.email}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.createModalButton, !newClassName.trim() && styles.disabledButton]}
                  onPress={handleCreateClass}
                  disabled={!newClassName.trim() || creating}
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  listContainer: {
    padding: 20,
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  className: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  classDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  classStats: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statItem: {
    marginRight: 30,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  createModalButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createModalButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  dropdownItem: {
    padding: 8,
  },
  selectedDropdownItem: {
    backgroundColor: '#007AFF',
    borderRadius: 4,
    padding: 8,
  },
});
