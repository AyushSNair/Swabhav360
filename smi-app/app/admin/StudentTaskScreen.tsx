import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { createTask, getTasks, deleteTask } from '../../services/classService';



export default function StudentTaskScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { classId, className, studentId, studentName } = route.params as { classId: string, className: string, studentId: string, studentName: string };
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchStudentTasks();
  }, []);

  async function fetchStudentTasks() {
    setLoading(true);
    try {
      const allTasks = await getTasks(classId);
      // Filter tasks assigned to this student
      const studentTasks = allTasks.filter((t: any) => t.assignedStudents && t.assignedStudents.includes(studentId));
      setTasks([...studentTasks]);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch tasks');
    }
    setLoading(false);
  }

  async function handleAssignTask() {
    if (!newTaskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }
    setCreating(true);
    try {
      await createTask(classId, {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
        dueDate: newTaskDueDate || undefined,
        assignedStudents: [studentId]
      });
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      Alert.alert('Success', 'Task assigned!');
      fetchStudentTasks();
    } catch (error) {
      Alert.alert('Error', 'Failed to assign task');
    }
    setCreating(false);
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
              fetchStudentTasks();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete task');
            }
          }
        }
      ]
    );
  }

  function formatDate(dateValue: any) {
    if (!dateValue) return 'No due date';

    // Firestore Timestamp support
    if (typeof dateValue === 'object' && dateValue._seconds) {
      const date = new Date(dateValue._seconds * 1000);
      if (!isNaN(date.getTime())) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      }
      return 'Invalid date';
    }

    let date: Date | null = null;
    if (typeof dateValue === 'string') {
      const parts = dateValue.trim().split('-');
      if (parts.length === 3) {
        date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else {
        date = new Date(dateValue);
      }
    } else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    }
    if (date && !isNaN(date.getTime())) {
      // Always return YYYY-MM-DD
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    return 'Invalid date';
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed': return '#10B981';
      case 'overdue': return '#EF4444';
      case 'active': return '#F59E0B';
      default: return '#6B7280';
    }
  }

  function getStatusBackgroundColor(status: string) {
    switch (status) {
      case 'completed': return '#D1FAE5';
      case 'overdue': return '#FEE2E2';
      case 'active': return '#FEF3C7';
      default: return '#F3F4F6';
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{paddingBottom: 32}}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.title}>📋 Tasks for {studentName}</Text>
            <View style={styles.headerInfo}>
              <View style={styles.infoChip}>
                <Text style={styles.infoLabel}>Class:</Text>
                <Text style={styles.infoValue}>{className}</Text>
              </View>
              {/* <View style={styles.infoChip}>
                <Text style={styles.infoLabel}>Student ID:</Text>
                <Text style={styles.infoValue}>{studentId}</Text>
              </View> */}
            </View>
          </View>

          {/* Tasks Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📝 Assigned Tasks</Text>
              <Text style={styles.taskCount}>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</Text>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading tasks...</Text>
              </View>
            ) : tasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📋</Text>
                <Text style={styles.emptyStateTitle}>No tasks assigned yet</Text>
                <Text style={styles.emptyStateSubtitle}>Tasks will appear here when assigned</Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {tasks.map(item => (
                  <View style={styles.taskCard} key={item.id}>
                    <View style={styles.taskCardHeader}>
                      <View style={styles.taskTitleContainer}>
                        <Text style={styles.taskTitle}>{item.title}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusBackgroundColor(item.status || 'active') }]}> 
                          <Text style={[styles.statusText, { color: getStatusColor(item.status || 'active') }]}> 
                            {item.status || 'active'}
                          </Text>
                        </View>
                      </View>
                      {/* Only show delete for backend tasks (not hardcoded coach tasks) */}
                      {!item.assignedBy && (
                        <TouchableOpacity 
                          style={styles.deleteButton}
                          onPress={() => handleDeleteTask(item.id, item.title)}
                        >
                          <Text style={styles.deleteButtonText}>×</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {item.description && (
                      <Text style={styles.taskDescription}>{item.description}</Text>
                    )}
                    
                    <View style={styles.taskFooter}>
                      <View style={styles.taskDetail}>
                        <Text style={styles.taskDetailIcon}>📅</Text>
                        <Text style={styles.taskDetailText}>Due: {formatDate(item.dueDate)}</Text>
                      </View>
                      {item.assignedBy && (
                        <View style={styles.taskDetail}>
                          <Text style={styles.taskDetailIcon}>👨‍🏫</Text>
                          <Text style={styles.taskDetailText}>Assigned by: {item.assignedBy}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Assign New Task Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>➕ Assign New Task</Text>
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Task Title *</Text>
                <TextInput 
                  style={styles.textInput} 
                  placeholder="Enter task title" 
                  value={newTaskTitle} 
                  onChangeText={setNewTaskTitle}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput 
                  style={[styles.textInput, styles.textArea]} 
                  placeholder="Enter task description" 
                  value={newTaskDescription} 
                  onChangeText={setNewTaskDescription} 
                  multiline 
                  numberOfLines={3}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Due Date</Text>
                <TextInput 
                  style={styles.textInput} 
                  placeholder="YYYY-MM-DD" 
                  value={newTaskDueDate} 
                  onChangeText={setNewTaskDueDate}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              
              <TouchableOpacity 
                style={[styles.assignButton, (!newTaskTitle.trim() || creating) && styles.assignButtonDisabled]} 
                onPress={handleAssignTask} 
                disabled={creating || !newTaskTitle.trim()}
              >
                {creating ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.assignButtonText}>Assigning...</Text>
                  </View>
                ) : (
                  <Text style={styles.assignButtonText}>✨ Assign Task</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  container: { 
    flex: 1, 
    padding: 20 
  },
  header: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  headerInfo: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  infoChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  section: { 
    marginBottom: 32 
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  taskCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  cardList: { 
    gap: 16 
  },
  taskCard: { 
    backgroundColor: '#FFFFFF', 
    padding: 20, 
    borderRadius: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 8, 
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitleContainer: {
    flex: 1,
    gap: 8,
  },
  taskTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1F2937',
    lineHeight: 24,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 20,
  },
  taskDescription: { 
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  taskFooter: {
    gap: 8,
  },
  taskDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskDetailIcon: {
    fontSize: 14,
  },
  taskDetailText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: { 
    backgroundColor: '#F9FAFB', 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderRadius: 12, 
    fontSize: 15,
    color: '#1F2937',
    // transition: 'border-color 0.2s',
  },
  textArea: { 
    height: 100,
    textAlignVertical: 'top',
  },
  assignButton: { 
    backgroundColor: '#007AFF', 
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12, 
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  assignButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignButtonText: { 
    color: '#FFFFFF', 
    fontWeight: '700', 
    fontSize: 16,
    letterSpacing: 0.5,
  },
});