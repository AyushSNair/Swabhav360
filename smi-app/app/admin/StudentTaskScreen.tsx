import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { createTask, getTasks, deleteTask } from '../../services/classService';

const hardcodedCoachTasks = [
  {
    id: 'coach1',
    title: 'Coach Task: Practice mindfulness',
    description: 'Spend 10 minutes meditating today.',
    dueDate: '2024-07-01',
    status: 'active',
    assignedBy: 'Coach'
  }
];

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
      setTasks([...studentTasks, ...hardcodedCoachTasks]);
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

  function formatDate(dateString: string) {
    if (!dateString) return 'No due date';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={{paddingBottom: 32}}>
      <View style={styles.container}>
        <Text style={styles.title}>Tasks for {studentName}</Text>
        <Text style={styles.subtitle}>Class: {className}</Text>
        <Text style={styles.subtitle}>Student ID: {studentId}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assigned Tasks</Text>
          {loading ? (
            <ActivityIndicator />
          ) : tasks.length === 0 ? (
            <Text style={styles.noTasks}>No tasks assigned yet</Text>
          ) : (
            <View style={styles.cardList}>
              {tasks.map(item => (
                <View style={styles.taskCard} key={item.id}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Text style={styles.taskTitle}>{item.title}</Text>
                    {/* Only show delete for backend tasks (not hardcoded coach tasks) */}
                    {!item.assignedBy && (
                      <TouchableOpacity onPress={() => handleDeleteTask(item.id, item.title)}>
                        <Text style={{color: 'red', fontWeight: 'bold', fontSize: 18}}>×</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {item.description && <Text style={styles.taskDescription}>{item.description}</Text>}
                  <Text style={styles.taskDetail}>Due: {formatDate(item.dueDate)}</Text>
                  <Text style={styles.taskDetail}>Status: {item.status || 'active'}</Text>
                  {item.assignedBy && <Text style={styles.taskDetail}>Assigned by: {item.assignedBy}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assign New Task</Text>
          <TextInput style={styles.textInput} placeholder="Task title" value={newTaskTitle} onChangeText={setNewTaskTitle} />
          <TextInput style={[styles.textInput, styles.textArea]} placeholder="Description (optional)" value={newTaskDescription} onChangeText={setNewTaskDescription} multiline numberOfLines={3} />
          <TextInput style={styles.textInput} placeholder="Due date (YYYY-MM-DD)" value={newTaskDueDate} onChangeText={setNewTaskDueDate} />
          <TouchableOpacity style={styles.assignButton} onPress={handleAssignTask} disabled={creating || !newTaskTitle.trim()}>
            <Text style={styles.assignButtonText}>{creating ? 'Assigning...' : 'Assign Task'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1 },
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 4 },
  section: { marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  cardList: { flex: 1 },
  taskCard: { backgroundColor: '#fff', padding: 15, marginBottom: 12, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  taskTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  taskDescription: { marginTop: 5, color: '#666' },
  taskDetail: { fontSize: 12, color: '#666', marginTop: 2 },
  noTasks: { textAlign: 'center', color: '#666', fontStyle: 'italic', marginVertical: 20 },
  textInput: { backgroundColor: '#fff', padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 10 },
  textArea: { height: 80 },
  assignButton: { backgroundColor: '#007bff', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  assignButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
}); 