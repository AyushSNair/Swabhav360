import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  Modal, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, doc, setDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { FIRESTORE_DB } from '../../FirebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface Student {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
  students: Student[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  assignedTo: string[];
  createdAt: Date;
  classId: string;
}

interface TasksProps {
  selectedClass: Class;
  onBack: () => void;
}

const Tasks: React.FC<TasksProps> = ({ selectedClass, onBack }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [loading, setLoading] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const tasksRef = collection(FIRESTORE_DB, 'tasks');
      const q = query(tasksRef, where('classId', '==', selectedClass.id));
      const querySnapshot = await getDocs(q);
      
      const loadedTasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      })) as Task[];
      
      setTasks(loadedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim() || !taskDescription.trim() || selectedStudents.length === 0) {
      Alert.alert('Error', 'Please fill in all fields and select at least one student');
      return;
    }

    try {
      setLoading(true);
      const tasksRef = collection(FIRESTORE_DB, 'tasks');
      const taskData = {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        dueDate: Timestamp.fromDate(dueDate),
        assignedTo: selectedStudents,
        classId: selectedClass.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (editingTask) {
        await setDoc(doc(tasksRef, editingTask.id), taskData, { merge: true });
        Alert.alert('Success', 'Task updated successfully');
      } else {
        await setDoc(doc(tasksRef), taskData);
        Alert.alert('Success', 'Task created successfully');
      }

      resetForm();
      loadTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      Alert.alert('Error', 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTaskTitle('');
    setTaskDescription('');
    setDueDate(new Date());
    setSelectedStudents([]);
    setEditingTask(null);
    setShowAddTask(false);
  };

  const handleEditTask = (task: Task) => {
    setTaskTitle(task.title);
    setTaskDescription(task.description);
    setDueDate(task.dueDate);
    setSelectedStudents(task.assignedTo);
    setEditingTask(task);
    setShowAddTask(true);
  };

  const getTaskPriority = (dueDate: Date) => {
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 2) return 'urgent';
    if (diffDays <= 7) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority: string): [string, string] => {
    switch (priority) {
      case 'overdue': return ['#EF4444', '#DC2626'];
      case 'urgent': return ['#F59E0B', '#D97706'];
      case 'medium': return ['#3B82F6', '#2563EB'];
      default: return ['#10B981', '#059669'];
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'overdue': return 'error';
      case 'urgent': return 'warning';
      case 'medium': return 'schedule';
      default: return 'check-circle';
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => {
    const priority = getTaskPriority(item.dueDate);
    const priorityColors = getPriorityColor(priority);
    const priorityIcon = getPriorityIcon(priority);

    return (
      <View style={styles.taskContainer}>
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.taskCard}
        >
          <View style={styles.taskHeader}>
            <LinearGradient
              colors={priorityColors}
              style={styles.priorityBadge}
            >
              <MaterialIcons name={priorityIcon} size={16} color="#FFFFFF" />
            </LinearGradient>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEditTask(item)}
            >
              <MaterialIcons name="edit" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.taskContent}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text style={styles.taskDescription}>{item.description}</Text>
            
            <View style={styles.taskMeta}>
              <View style={styles.dueDateContainer}>
                <MaterialIcons name="schedule" size={16} color="#6B7280" />
                <Text style={styles.dueDateText}>
                  {item.dueDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.assignedContainer}>
              <Text style={styles.assignedLabel}>Assigned to:</Text>
              <View style={styles.studentsContainer}>
                {(!item.assignedTo || item.assignedTo.length === 0) ? (
                  <Text style={styles.noStudentsText}>All students</Text>
                ) : (
                  (() => {
                    // Find all matching students
                    const assignedNames = (item.assignedTo || [])
                      .map(userId => {
                        const student = selectedClass.students.find(s => s.id === userId);
                        return student ? student.name : null;
                      })
                      .filter(Boolean);

                    if (assignedNames.length > 0) {
                      return (
                        <Text style={styles.studentNameText}>
                          {assignedNames.join(', ')}
                        </Text>
                      );
                    } else {
                      return (
                        <Text style={styles.noStudentsText}>(Unknown students)</Text>
                      );
                    }
                  })()
                )}
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667EEA', '#764BA2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Task Manager</Text>
            <Text style={styles.subtitle}>{selectedClass.name}</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddTask(true)}
          >
            <MaterialIcons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667EEA" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      ) : tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <MaterialIcons name="assignment" size={80} color="#E5E7EB" />
          </View>
          <Text style={styles.emptyTitle}>No tasks yet</Text>
          <Text style={styles.emptyDescription}>
            Create your first task to get started with managing assignments
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => setShowAddTask(true)}
          >
            <Text style={styles.emptyButtonText}>Create Task</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTaskItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.tasksList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add/Edit Task Modal */}
      <Modal
        visible={showAddTask}
        animationType="slide"
        transparent={true}
        onRequestClose={resetForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#667EEA', '#764BA2']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </Text>
              <TouchableOpacity onPress={resetForm} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Task Title</Text>
                <TextInput
                  style={styles.input}
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  placeholder="Enter task title"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={taskDescription}
                  onChangeText={setTaskDescription}
                  placeholder="Enter task description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Due Date</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <MaterialIcons name="event" size={20} color="#667EEA" />
                  <Text style={styles.dateButtonText}>
                    {dueDate.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                  <MaterialIcons name="expand-more" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={dueDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setDueDate(selectedDate);
                    }
                  }}
                />
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Assign To Students</Text>
                <View style={styles.studentsGrid}>
                  {selectedClass.students.map(student => (
                    <TouchableOpacity
                      key={student.id}
                      style={[
                        styles.studentOption,
                        selectedStudents.includes(student.id) && styles.selectedStudent
                      ]}
                      onPress={() => toggleStudentSelection(student.id)}
                    >
                      <View style={[
                        styles.studentCheckbox,
                        selectedStudents.includes(student.id) && styles.selectedCheckbox
                      ]}>
                        {selectedStudents.includes(student.id) && (
                          <MaterialIcons name="check" size={16} color="#FFFFFF" />
                        )}
                      </View>
                      <Text style={[
                        styles.studentName,
                        selectedStudents.includes(student.id) && styles.selectedStudentName
                      ]}>
                        {student.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={resetForm}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveTask}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#667EEA', '#764BA2']}
                  style={styles.saveButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingTask ? 'Update Task' : 'Create Task'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#667EEA',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tasksList: {
    padding: 16,
  },
  taskContainer: {
    marginBottom: 16,
  },
  taskCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priorityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  taskDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  assignedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assignedLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  studentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667EEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  studentInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  moreStudents: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  moreStudentsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  studentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  studentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedStudent: {
    backgroundColor: '#EEF2FF',
    borderColor: '#667EEA',
  },
  studentCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  selectedCheckbox: {
    backgroundColor: '#667EEA',
    borderColor: '#667EEA',
  },
  studentName: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedStudentName: {
    color: '#667EEA',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  studentNameText: {
    fontSize: 14,
    color: '#374151',
    marginRight: 4,
  },
  noStudentsText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default Tasks;