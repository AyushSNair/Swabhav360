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
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, doc, setDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { FIRESTORE_DB } from '@/config/FirebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';

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

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{item.title}</Text>
      </View>
      <Text style={styles.taskDescription}>{item.description}</Text>
      <Text style={styles.dueDate}>
        Due: {item.dueDate.toLocaleDateString()}
      </Text>
      <View style={styles.assignedToContainer}>
        <Text style={styles.assignedToTitle}>Assigned to:</Text>
        {item.assignedTo.map(studentId => {
          const student = selectedClass.students.find(s => s.id === studentId);
          return student ? (
            <Text key={studentId} style={styles.assignedStudent}>
              • {student.name}
            </Text>
          ) : null;
        })}
      </View>
      <TouchableOpacity 
        style={styles.editButton}
        onPress={() => handleEditTask(item)}
      >
        <MaterialIcons name="edit" size={20} color="#4F46E5" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#4F46E5" />
          <Text style={styles.backButtonText}>Back to Class</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Task Management</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddTask(true)}
        >
          <MaterialIcons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
      ) : tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="assignment" size={48} color="#E5E7EB" />
          <Text style={styles.emptyText}>No tasks assigned yet</Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => setShowAddTask(true)}
          >
            <Text style={styles.primaryButtonText}>Create Your First Task</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTaskItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.taskList}
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <Text style={styles.label}>Task Title</Text>
              <TextInput
                style={styles.input}
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="Enter task title"
                placeholderTextColor="#9CA3AF"
              />

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

              <Text style={styles.label}>Due Date</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {dueDate.toLocaleDateString()}
                </Text>
                <MaterialIcons name="event" size={20} color="#6B7280" />
              </TouchableOpacity>

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

              <Text style={styles.label}>Assign To</Text>
              <View style={styles.studentsList}>
                {selectedClass.students.map(student => (
                  <TouchableOpacity
                    key={student.id}
                    style={[
                      styles.studentChip,
                      selectedStudents.includes(student.id) && styles.selectedStudentChip
                    ]}
                    onPress={() => toggleStudentSelection(student.id)}
                  >
                    <Text style={[
                      styles.studentChipText,
                      selectedStudents.includes(student.id) && styles.selectedStudentChipText
                    ]}>
                      {student.name}
                    </Text>
                  </TouchableOpacity>
                ))}
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
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingTask ? 'Update Task' : 'Create Task'}
                  </Text>
                )}
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#4F46E5',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#4F46E5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  taskList: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },

  taskDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  dueDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  assignedToContainer: {
    marginTop: 8,
  },
  assignedToTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  assignedStudent: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 4,
  },
  editButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  formContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 14,
    color: '#111827',
  },
  studentsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  studentChip: {
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedStudentChip: {
    backgroundColor: '#4F46E5',
  },
  studentChipText: {
    fontSize: 12,
    color: '#4B5563',
  },
  selectedStudentChipText: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelButton: {
    padding: 12,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Tasks;
