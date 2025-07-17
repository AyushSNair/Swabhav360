import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  Button, 
  FlatList, 
  ActivityIndicator, 
  Alert, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FIRESTORE_DB } from '../../FirebaseConfig';
import { collection, getDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import { 
  addStudentToClass, 
  removeStudentFromClass, 
  deleteClass, 
  createTask, 
  getTasks, 
  updateTask, 
  deleteTask 
} from '../../services/classService';

export default function ClassDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { classId, className } = route.params as { classId: string; className: string };
  const [classData, setClassData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
  const [showStudentManager, setShowStudentManager] = useState(false);
  const [showTaskManager, setShowTaskManager] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [coach, setCoach] = useState<any | null>(null);
  
  // Task creation state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [creatingTask, setCreatingTask] = useState(false);

  useEffect(() => {
    fetchClass();
    fetchStudents();
    fetchAllClasses();
    fetchTasks();
  }, []);

  async function fetchClass() {
    setLoading(true);
    try {
      const classDoc = await getDoc(doc(FIRESTORE_DB, 'classes', classId));
      if (classDoc.exists()) {
        const data = classDoc.data();
        setClassData(data);
        // Fetch coach info if coachId exists
        if (data.coachId) {
          const coachDoc = await getDoc(doc(FIRESTORE_DB, 'users', data.coachId));
          if (coachDoc.exists()) {
            setCoach({ id: coachDoc.id, ...coachDoc.data() });
          } else {
            setCoach(null);
          }
        } else {
          setCoach(null);
        }
      } else {
        Alert.alert('Error', 'Class not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching class:', error);
      Alert.alert('Error', 'Failed to fetch class details');
    }
    setLoading(false);
  }

  async function fetchStudents() {
    setStudentLoading(true);
    try {
      const usersRef = collection(FIRESTORE_DB, 'users');
      const usersSnap = await getDocs(usersRef);
      const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(usersList);
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to fetch students');
    }
    setStudentLoading(false);
  }

  async function fetchTasks() {
    setTaskLoading(true);
    try {
      const tasksData = await getTasks(classId);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      Alert.alert('Error', 'Failed to fetch tasks');
    }
    setTaskLoading(false);
  }

  async function fetchAllClasses() {
    try {
      const classesRef = collection(FIRESTORE_DB, 'classes');
      const classesSnap = await getDocs(classesRef);
      const classesList = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllClasses(classesList);
    } catch (error) {
      console.error('Error fetching all classes:', error);
    }
  }

  function getStudentCurrentClass(studentId: string): string | null {
    for (const classItem of allClasses) {
      if (classItem.studentIds && classItem.studentIds.includes(studentId)) {
        return classItem.name;
      }
    }
    return null;
  }

  async function handleStudentToggle(studentId: string, isInClass: boolean) {
    setActionLoading(studentId);
    try {
      if (isInClass) {
        await removeStudentFromClass(classId, studentId);
        Alert.alert('Success', 'Student removed from class');
      } else {
        const response = await addStudentToClass(classId, studentId);
        if (response.error) {
          Alert.alert('Cannot Add Student', response.error, [
            { text: 'OK' }
          ]);
        } else {
          Alert.alert('Success', 'Student added to class');
        }
      }
      // Refresh class data to show updated student list
      await fetchClass();
    } catch (error) {
      console.error('Error toggling student:', error);
      Alert.alert('Error', isInClass ? 'Failed to remove student' : 'Failed to add student');
    }
    setActionLoading(null);
  }

  async function handleCreateTask() {
    if (!newTaskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    setCreatingTask(true);
    try {
      const taskData = {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
        dueDate: newTaskDueDate || undefined,
        assignedStudents: selectedStudents
      };

      await createTask(classId, taskData);
      
      // Reset form
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setSelectedStudents([]);
      setShowCreateTaskModal(false);
      
      Alert.alert('Success', 'Task created successfully!');
      fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task');
    }
    setCreatingTask(false);
  }

  async function handleDeleteTask(taskId: string, taskTitle: string) {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${taskTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(classId, taskId);
              Alert.alert('Success', 'Task deleted successfully');
              fetchTasks();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          }
        }
      ]
    );
  }

  function toggleStudentSelection(studentId: string) {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  }

  function formatDate(dateString: string) {
    if (!dateString) return 'No due date';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  }

  function getAssignedStudentsCount(task: any) {
    return task.assignedStudents ? task.assignedStudents.length : 0;
  }

  async function handleDeleteClass() {
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
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting class:', error);
              Alert.alert('Error', 'Failed to delete class');
            }
          }
        }
      ]
    );
  }

  if (loading) return <ActivityIndicator size="large" style={styles.loader} />;

  const classStudents = students.filter(student => 
    classData?.studentIds && classData.studentIds.includes(student.id)
  );

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={{paddingBottom: 32}}>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>{className}</Text>
          <View style={styles.headerInfo}>
            <Text style={styles.classId}>ID: {classId}</Text>
            <View style={styles.coachInfo}>
              <Text style={styles.coachLabel}>Coach:</Text>
              <Text style={styles.coachName}>{coach ? (coach.name || coach.email) : 'Unassigned'}</Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{classStudents.length}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{tasks.length}</Text>
            <Text style={styles.statLabel}>Tasks</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => setShowStudentManager(!showStudentManager)}
          >
            <Text style={styles.primaryButtonText}>
              {showStudentManager ? "Hide" : "Manage"} Students
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.dangerButton} 
            onPress={handleDeleteClass}
          >
            <Text style={styles.dangerButtonText}>Delete Class</Text>
          </TouchableOpacity>
        </View>

        {/* Task Manager Section */}
        {showTaskManager && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tasks ({tasks.length})</Text>
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => setShowCreateTaskModal(true)}
              >
                <Text style={styles.addButtonText}>+ Add Task</Text>
              </TouchableOpacity>
            </View>
            
            {taskLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#4A90E2" />
                <Text style={styles.loadingText}>Loading tasks...</Text>
              </View>
            ) : tasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No tasks created yet</Text>
                <Text style={styles.emptyStateSubtext}>Create your first task to get started</Text>
              </View>
            ) : (
              <View style={styles.taskList}>
                {tasks.map(item => (
                  <View style={styles.taskCard} key={item.id}>
                    <View style={styles.taskHeader}>
                      <Text style={styles.taskTitle}>{item.title}</Text>
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={() => handleDeleteTask(item.id, item.title)}
                      >
                        <Text style={styles.deleteButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                    {item.description && (
                      <Text style={styles.taskDescription}>{item.description}</Text>
                    )}
                    <View style={styles.taskMeta}>
                      <View style={styles.taskMetaItem}>
                        <Text style={styles.taskMetaLabel}>Due:</Text>
                        <Text style={styles.taskMetaValue}>{formatDate(item.dueDate)}</Text>
                      </View>
                      <View style={styles.taskMetaItem}>
                        <Text style={styles.taskMetaLabel}>Assigned:</Text>
                        <Text style={styles.taskMetaValue}>{getAssignedStudentsCount(item)} students</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Student Manager Section */}
        {showStudentManager && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Students ({classStudents.length})</Text>
            
            {classStudents.length > 0 ? (
              <View style={styles.studentList}>
                {classStudents.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.studentCard}
                    onPress={() => (navigation as any).navigate('StudentTaskScreen', {
                      classId,
                      className,
                      studentId: item.id,
                      studentName: item.name || item.email
                    })}
                  >
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{item.name || item.email}</Text>
                      <Text style={styles.studentStatus}>Active</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => handleStudentToggle(item.id, true)}
                      disabled={actionLoading === item.id}
                    >
                      {actionLoading === item.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.removeButtonText}>Remove</Text>
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No students enrolled</Text>
                <Text style={styles.emptyStateSubtext}>Add students from the available list below</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Available Students</Text>
            {studentLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#4A90E2" />
                <Text style={styles.loadingText}>Loading students...</Text>
              </View>
            ) : (
              <View style={styles.studentList}>
                {students.filter(student => !classData?.studentIds || !classData.studentIds.includes(student.id)).map(item => {
                  const currentClass = getStudentCurrentClass(item.id);
                  const isEnrolledElsewhere = currentClass !== null;
                  return (
                    <View style={styles.studentCard} key={item.id}>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{item.name || item.email}</Text>
                        {isEnrolledElsewhere ? (
                          <Text style={styles.enrolledElsewhere}>Enrolled in: {currentClass}</Text>
                        ) : (
                          <Text style={styles.studentStatus}>Available</Text>
                        )}
                      </View>
                      <TouchableOpacity 
                        style={[styles.addStudentButton, isEnrolledElsewhere && styles.disabledButton]}
                        onPress={() => handleStudentToggle(item.id, false)}
                        disabled={actionLoading === item.id || isEnrolledElsewhere}
                      >
                        {actionLoading === item.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.addStudentButtonText}>Add</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Create Task Modal */}
        <Modal
          visible={showCreateTaskModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCreateTaskModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Task</Text>
                <TouchableOpacity 
                  onPress={() => setShowCreateTaskModal(false)} 
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Task Title *</Text>
                  <TextInput 
                    style={styles.textInput} 
                    placeholder="Enter task title" 
                    value={newTaskTitle} 
                    onChangeText={setNewTaskTitle} 
                    autoFocus={true}
                    placeholderTextColor="#999"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput 
                    style={[styles.textInput, styles.textArea]} 
                    placeholder="Enter task description" 
                    value={newTaskDescription} 
                    onChangeText={setNewTaskDescription} 
                    multiline={true} 
                    numberOfLines={3}
                    placeholderTextColor="#999"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Due Date</Text>
                  <TextInput 
                    style={styles.textInput} 
                    placeholder="YYYY-MM-DD" 
                    value={newTaskDueDate} 
                    onChangeText={setNewTaskDueDate}
                    placeholderTextColor="#999"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Assign to Students</Text>
                  {classStudents.length > 0 ? (
                    <View style={styles.studentSelectionList}>
                      {classStudents.map(student => (
                        <TouchableOpacity 
                          key={student.id} 
                          style={[
                            styles.studentSelectionItem, 
                            selectedStudents.includes(student.id) && styles.selectedStudent
                          ]} 
                          onPress={() => toggleStudentSelection(student.id)}
                        >
                          <Text style={[
                            styles.studentSelectionText, 
                            selectedStudents.includes(student.id) && styles.selectedStudentText
                          ]}>
                            {student.name || student.email}
                          </Text>
                          {selectedStudents.includes(student.id) && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noStudentsText}>No students in class to assign</Text>
                  )}
                </View>
              </ScrollView>
              
              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => setShowCreateTaskModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.createButton, !newTaskTitle.trim() && styles.disabledButton]} 
                  onPress={handleCreateTask} 
                  disabled={!newTaskTitle.trim() || creatingTask}
                >
                  {creatingTask ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.createButtonText}>Create Task</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  loader: {
    marginTop: 50,
  },
  
  // Header Styles
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  headerInfo: {
    gap: 4,
  },
  classId: {
    fontSize: 14,
    color: '#7f8c8d',
    fontFamily: 'monospace',
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coachLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  coachName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34495e',
  },
  
  // Stats Styles
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
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
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#E74C3C',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Section Styles
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  addButton: {
    backgroundColor: '#27AE60',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Loading and Empty States
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  loadingText: {
    color: '#7f8c8d',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95a5a6',
  },
  
  // Task Styles
  taskList: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
    borderRadius: 4,
  },
  deleteButtonText: {
    fontSize: 20,
    color: '#E74C3C',
    fontWeight: 'bold',
  },
  taskDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskMetaLabel: {
    fontSize: 12,
    color: '#95a5a6',
    fontWeight: '500',
  },
  taskMetaValue: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  
  // Student Styles
  studentList: {
    gap: 12,
    marginBottom: 24,
  },
  studentCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 4,
  },
  studentStatus: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '500',
  },
  enrolledElsewhere: {
    fontSize: 12,
    color: '#F39C12',
    fontWeight: '500',
  },
  removeButton: {
    backgroundColor: '#E74C3C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addStudentButton: {
    backgroundColor: '#27AE60',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addStudentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  
  // Input Styles
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  // Student Selection Styles
  studentSelectionList: {
    gap: 8,
    maxHeight: 200,
  },
  studentSelectionItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedStudent: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4A90E2',
  },
  studentSelectionText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  selectedStudentText: {
    color: '#4A90E2',
    fontWeight: '500',
  },
  checkmark: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noStudentsText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  
  // Modal Footer Button Styles
  cancelButton: {
    flex: 1,
    backgroundColor: '#ecf0f1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});