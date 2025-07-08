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
        <Text style={styles.title}>{className}</Text>
        <Text style={styles.subtitle}>Class ID: {classId}</Text>
        {/* Show coach info */}
        <Text style={styles.subtitle}>
          Assigned Coach: {coach ? (coach.name || coach.email) : 'None'}
        </Text>

        <View style={styles.statsCard}>
          <Text style={styles.statsText}>Total Students: {classStudents.length}</Text>
          <Text style={styles.statsText}>Total Tasks: {tasks.length}</Text>
        </View>

        <View style={styles.buttonRow}>
          <Button title="Delete Class" color="red" onPress={handleDeleteClass} />
          <View style={styles.buttonSpacer} />
          <Button title={showStudentManager ? "Hide Student Manager" : "Manage Students"} onPress={() => setShowStudentManager(!showStudentManager)} />
          <View style={styles.buttonSpacer} />
          {/* <Button title={showTaskManager ? "Hide Task Manager" : "Manage Tasks"} onPress={() => setShowTaskManager(!showTaskManager)} /> */}
        </View>

        {showTaskManager && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tasks ({tasks.length})</Text>
              <TouchableOpacity style={styles.createTaskButton} onPress={() => setShowCreateTaskModal(true)}>
                <Text style={styles.createTaskButtonText}>+ New Task</Text>
              </TouchableOpacity>
            </View>
            {taskLoading ? (
              <ActivityIndicator />
            ) : tasks.length === 0 ? (
              <Text style={styles.noTasks}>No tasks assigned yet</Text>
            ) : (
              <View style={styles.cardList}>
                {tasks.map(item => (
                  <View style={styles.taskCard} key={item.id}>
                    <View style={styles.taskHeader}>
                      <Text style={styles.taskTitle}>{item.title}</Text>
                      <TouchableOpacity style={styles.deleteTaskButton} onPress={() => handleDeleteTask(item.id, item.title)}>
                        <Text style={styles.deleteTaskButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                    {item.description && <Text style={styles.taskDescription}>{item.description}</Text>}
                    <View style={styles.taskDetails}>
                      <Text style={styles.taskDetail}>Due: {formatDate(item.dueDate)}</Text>
                      <Text style={styles.taskDetail}>Assigned to: {getAssignedStudentsCount(item)} students</Text>
                      <Text style={styles.taskDetail}>Status: {item.status || 'active'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {showStudentManager && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Students ({classStudents.length})</Text>
            {classStudents.length > 0 ? (
              <View style={styles.cardList}>
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
                    <Text style={styles.studentName}>{item.name || item.email}</Text>
                    <Button title="Remove" color="red" onPress={() => handleStudentToggle(item.id, true)} disabled={actionLoading === item.id} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.noStudents}>No students in this class</Text>
            )}

            <Text style={styles.sectionTitle}>Available Students</Text>
            {studentLoading ? (
              <ActivityIndicator />
            ) : (
              <View style={styles.cardList}>
                {students.filter(student => !classData?.studentIds || !classData.studentIds.includes(student.id)).map(item => {
                  const currentClass = getStudentCurrentClass(item.id);
                  const isEnrolledElsewhere = currentClass !== null;
                  return (
                    <View style={styles.studentCard} key={item.id}>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{item.name || item.email}</Text>
                        {isEnrolledElsewhere && (
                          <Text style={styles.enrolledText}>Currently in: {currentClass}</Text>
                        )}
                      </View>
                      <Button title="Add" color="green" onPress={() => handleStudentToggle(item.id, false)} disabled={actionLoading === item.id || isEnrolledElsewhere} />
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
                <TouchableOpacity onPress={() => setShowCreateTaskModal(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                <Text style={styles.inputLabel}>Task Title *</Text>
                <TextInput style={styles.textInput} placeholder="Enter task title" value={newTaskTitle} onChangeText={setNewTaskTitle} autoFocus={true} />
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput style={[styles.textInput, styles.textArea]} placeholder="Enter task description" value={newTaskDescription} onChangeText={setNewTaskDescription} multiline={true} numberOfLines={3} />
                <Text style={styles.inputLabel}>Due Date (Optional)</Text>
                <TextInput style={styles.textInput} placeholder="YYYY-MM-DD" value={newTaskDueDate} onChangeText={setNewTaskDueDate} />
                <Text style={styles.inputLabel}>Assign to Students</Text>
                {classStudents.length > 0 ? (
                  classStudents.map(student => (
                    <TouchableOpacity key={student.id} style={[styles.studentSelectionItem, selectedStudents.includes(student.id) && styles.selectedStudent]} onPress={() => toggleStudentSelection(student.id)}>
                      <Text style={[styles.studentSelectionText, selectedStudents.includes(student.id) && styles.selectedStudentText]}>{student.name || student.email}</Text>
                      {selectedStudents.includes(student.id) && (<Text style={styles.checkmark}>✓</Text>)}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noStudentsText}>No students in class to assign</Text>
                )}
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreateTaskModal(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.createModalButton, !newTaskTitle.trim() && styles.disabledButton]} onPress={handleCreateTask} disabled={!newTaskTitle.trim() || creatingTask}>
                    {creatingTask ? (<ActivityIndicator size="small" color="#fff" />) : (<Text style={styles.createModalButtonText}>Create Task</Text>)}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  statsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  buttonSpacer: {
    width: 10,
  },
  studentManager: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 20,
    color: '#333',
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  enrolledText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  noStudents: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  taskManager: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  createTaskButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
  },
  createTaskButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  taskCard: {
    backgroundColor: '#fff',
    padding: 10,
    marginVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deleteTaskButton: {
    padding: 5,
  },
  deleteTaskButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'red',
  },
  taskDescription: {
    marginTop: 5,
    color: '#666',
  },
  taskDetails: {
    marginTop: 5,
  },
  taskDetail: {
    fontSize: 12,
    color: '#666',
  },
  noTasks: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'red',
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  textInput: {
    backgroundColor: '#fff',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 10,
  },
  textArea: {
    height: 100,
  },
  studentSelectionItem: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 5,
  },
  selectedStudent: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  studentSelectionText: {
    color: '#333',
  },
  selectedStudentText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  checkmark: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    padding: 10,
    borderRadius: 5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  createModalButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  createModalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  noStudentsText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  section: {
    flex: 1,
  },
  cardList: {
    flex: 1,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
