"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  TextInput,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useQuest, QuestPeriod, QuestState } from "../QuestContext"
import { useLanguage } from '../../contexts/LanguageContext'
import i18n from '../../i18n'
import { Picker } from '@react-native-picker/picker'
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { FIRESTORE_DB } from '../../FirebaseConfig';

type Task = {
  id: string
  text: string
  points: number
  isCounter?: boolean
  isInput?: boolean
  hasAdd?: boolean
  hasMedia?: boolean
  max?: number
  isChecklistCount?: boolean
  title?: string; // Added for clarity in rendering
  completedStudents?: string[]; // Added for completed status
}

export default function TasksScreen() {
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [questState, setQuestState] = useState<QuestState>({ coach: {} })
  const [isDayComplete, setIsDayComplete] = useState(false)
  const { setQuestState: setCtxQuestState } = useQuest()
  const { language, setLanguage } = useLanguage()

  // Fetch tasks assigned to the current student
  const fetchAssignedTasks = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return [];
    const q = query(
      collection(FIRESTORE_DB, 'tasks'),
      where('assignedStudents', 'array-contains', user.uid)
    );
    const querySnapshot = await getDocs(q);
    const tasks: Task[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Ensure required fields exist, fallback if missing
      tasks.push({
        id: doc.id,
        text: data.text || data.title || 'Untitled Task',
        points: typeof data.points === 'number' ? data.points : 0,
        isCounter: data.isCounter,
        isInput: data.isInput,
        hasAdd: data.hasAdd,
        hasMedia: data.hasMedia,
        max: data.max,
        isChecklistCount: data.isChecklistCount,
        title: data.title,
        completedStudents: data.completedStudents || [],
      });
    });
    return tasks;
  };

  useEffect(() => {
    const loadTasks = async () => {
      const tasks = await fetchAssignedTasks();
      setAssignedTasks(tasks);
      // Initialize quest state for fetched tasks
      const initialState: QuestState = { coach: {} };
      tasks.forEach((task) => {
        initialState.coach![task.id] = task.isCounter ? { count: 0 } : task.isInput ? { value: "" } : { checked: false };
      });
      setQuestState(initialState);
    };
    loadTasks();
  }, []);

  useEffect(() => {
    setCtxQuestState(questState)
  }, [questState, setCtxQuestState])

  // Calculate stats
  let totalPoints = 0
  let completedTasks = 0
  const totalTasks = assignedTasks.length

  assignedTasks.forEach((task) => {
    const state = questState.coach?.[task.id] || {}
    const user = getAuth().currentUser;
    let isComplete = false;
    if (Array.isArray(task.completedStudents) && user && task.completedStudents.includes(user.uid)) {
      isComplete = true;
    } else if (task.isCounter) {
      isComplete = (state.count || 0) > 0;
    } else if (task.isInput) {
      isComplete = (state.value || '').trim() !== '';
    } else {
      isComplete = !!state.checked;
    }
    if (isComplete) {
      completedTasks++;
      totalPoints += task.points;
    }
  })

  const percentComplete = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const handleToggle = (period: QuestPeriod, taskId: string) => {
    setQuestState((prev) => {
      const newPeriodState = { ...prev[period] }
      newPeriodState[taskId] = { ...newPeriodState[taskId], checked: !newPeriodState[taskId]?.checked }
      return { ...prev, [period]: newPeriodState }
    })
  }

  const handleInput = (period: QuestPeriod, taskId: string, text: string) => {
    setQuestState((prev) => {
      const newPeriodState = { ...prev[period] }
      newPeriodState[taskId] = { ...newPeriodState[taskId], value: text }
      return { ...prev, [period]: newPeriodState }
    })
  }

  const handleCounter = (period: QuestPeriod, taskId: string, amount: number) => {
    setQuestState((prev) => {
      const newPeriodState = { ...prev[period] }
      const currentCount = newPeriodState[taskId]?.count || 0
      newPeriodState[taskId] = { count: Math.max(0, currentCount + amount) }
      return { ...prev, [period]: newPeriodState }
    })
  }

  const handleClear = (period: QuestPeriod) => {
    setQuestState((prev) => {
      const newPeriodState = { ...prev[period] }
      assignedTasks.forEach((task) => {
        if (task.isCounter) {
          newPeriodState[task.id] = { count: 0 }
        } else if (task.isInput) {
          newPeriodState[task.id] = { value: "" }
        } else {
          newPeriodState[task.id] = { checked: false }
        }
      })
      return { ...prev, [period]: newPeriodState }
    })
  }

  // Helper to check if all tasks are complete
  const allTasksComplete = assignedTasks.length > 0 && assignedTasks.every((task) => {
    const state = questState.coach?.[task.id] || {};
    const user = getAuth().currentUser;
    // If completedStudents exists and includes the user, consider it complete
    if (Array.isArray(task.completedStudents) && user && task.completedStudents.includes(user.uid)) {
      return true;
    }
    if (task.isCounter) {
      return (state.count || 0) > 0;
    } else if (task.isInput) {
      return (state.value || '').trim() !== '';
    } else {
      return !!state.checked;
    }
  });

  const handleSubmit = async () => {
    // Mark all tasks as completed in Firestore for this student
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    for (const task of assignedTasks) {
      const docRef = doc(FIRESTORE_DB, 'tasks', task.id);
      // Fetch current completedStudents array
      const docSnap = await getDoc(docRef);
      let completedStudents = [];
      if (docSnap.exists()) {
        completedStudents = docSnap.data().completedStudents || [];
      }
      if (!completedStudents.includes(user.uid)) {
        await updateDoc(docRef, {
          completedStudents: [...completedStudents, user.uid],
        });
      }
    }
    setIsDayComplete(true);
    alert(i18n.t('tasks_submitted'));
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{i18n.t('my_tasks')}</Text>
          <View style={styles.languageContainer}>
            <Picker
              selectedValue={language}
              style={{ width: 120, height: 50, color: '#4f46e5' }}
              onValueChange={setLanguage}
            >
              <Picker.Item label="English" value="en" />
              <Picker.Item label="मराठी" value="mr" />
            </Picker>
          </View>
          <View style={styles.headerPoints}>
            <Ionicons name="star" size={16} color="#f59e0b" />
            <Text style={styles.headerPointsText}>{totalPoints}</Text>
          </View>
        </View>

        {/* Tasks Card */}
        <LinearGradient colors={["#6d28d9", "#4f46e5"]} style={styles.journeyCard}>
          <View style={styles.journeyHeader}>
            <Text style={styles.journeyTitle}>{i18n.t('coach_assignments')}</Text>
            <View>
              <Text style={styles.journeyPoints}>{totalPoints}</Text>
              <Text style={styles.journeyPointsLabel}>{i18n.t('total_points')}</Text>
            </View>
          </View>

          <Text style={styles.journeySubtitle}>{i18n.t('coach_tasks_subtitle')}</Text>

          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>{i18n.t('task_progress')}</Text>
             <Text style={styles.progressPercentage}>{percentComplete}%</Text>
          </View>

          <View style={styles.progressBar}>
            <LinearGradient 
              colors={["#6d28d9", "#4f46e5"]} 
              style={[styles.progressFill, { width: `${percentComplete}%` }]} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 0 }}
            />
          </View>
        </LinearGradient>

        {/* Tasks List */}
        <View style={styles.questsContainer}>
          <View style={styles.questCard}>
            <View style={[styles.questCardContent, isDayComplete && { opacity: 0.6 }, { borderLeftWidth: 4, borderLeftColor: "#8b5cf6" }]}> 
              <View style={styles.questHeader}>
                <View style={[styles.questIconContainer, { backgroundColor: "#f5f3ff" }]}> 
                  <Ionicons name="clipboard-outline" size={20} color="#7c3aed" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.questTitle}>{i18n.t('coach_assignments')}</Text>
                  <Text style={styles.questPhrase}>"{i18n.t('complete_these_tasks_assigned_by_your_coach')}"</Text>
                </View>
                <Text style={styles.questProgressText}>
                  {completedTasks}/{assignedTasks.length}
                </Text>
              </View>

              <View style={styles.questTasks}>
                {assignedTasks.map((task) => {
                  const state = questState.coach?.[task.id] || {}
                  const user = getAuth().currentUser;
                  let isComplete = false;
                  if (Array.isArray(task.completedStudents) && user && task.completedStudents.includes(user.uid)) {
                    isComplete = true;
                  } else if (task.isCounter) {
                    isComplete = (state.count || 0) > 0;
                  } else if (task.isInput) {
                    isComplete = (state.value || '').trim() !== '';
                  } else {
                    isComplete = !!state.checked;
                  }
                  return (
                    <View key={task.id} style={styles.taskItem}>
                      <TouchableOpacity
                        style={[styles.taskCheckbox, isComplete && styles.taskCheckboxChecked]}
                        onPress={() => !isDayComplete && handleToggle("coach", task.id)}
                      >
                        {isComplete && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                      </TouchableOpacity>
                      <View style={styles.taskInfo}>
                        <Text style={[styles.taskText, isComplete && styles.taskTextCompleted]}>{task.title || i18n.t(task.text)}</Text>

                        {task.isCounter && (
                          <View style={styles.counterContainer}>
                            <TouchableOpacity
                              style={styles.counterButton}
                              onPress={() => !isDayComplete && handleCounter("coach", task.id, -1)}
                              disabled={isDayComplete}
                            >
                              <Ionicons name="remove" size={16} color={isDayComplete ? "#9ca3af" : "#6b7280"} />
                            </TouchableOpacity>
                            <Text style={styles.counterText}>{state.count || 0}</Text>
                            <TouchableOpacity
                              style={styles.counterButton}
                              onPress={() => !isDayComplete && handleCounter("coach", task.id, 1)}
                              disabled={isDayComplete}
                            >
                              <Ionicons name="add" size={16} color={isDayComplete ? "#9ca3af" : "#6b7280"} />
                            </TouchableOpacity>
                          </View>
                        )}

                        {task.isInput && (
                          <TextInput
                            style={[styles.input, isComplete && styles.inputCompleted]}
                            value={state.value || ""}
                            onChangeText={(text: string) => !isDayComplete && handleInput("coach", task.id, text)}
                            placeholder={i18n.t('type_your_response')}
                            editable={!isDayComplete}
                            multiline
                          />
                        )}
                      </View>

                      <View style={styles.pointsContainer}>
                        <Text style={[styles.pointsText, isComplete && styles.pointsTextCompleted]}>+{task.points}</Text>
                      </View>
                    </View>
                  )
                })}
              </View>

              <View style={styles.questFooter}>
                {/* <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => !isDayComplete && handleClear("coach")}
                  disabled={isDayComplete}
                >
                  <Ionicons name="refresh" size={16} color={isDayComplete ? "#9ca3af" : "#6b7280"} />
                  <Text style={[styles.clearButtonText, isDayComplete && { color: "#9ca3af" }]}>{i18n.t('clear_all')}</Text>
                </TouchableOpacity> */}

                {/* Submit task button */}
                <LinearGradient 
                  colors={["#6d28d9", "#4f46e5"]}
                  style={[styles.submitButton, (!allTasksComplete || isDayComplete) && { opacity: 0.6 }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!allTasksComplete || isDayComplete}
                    style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Text style={styles.submitButtonText}>{isDayComplete ? i18n.t('completed') : i18n.t('submit')}</Text>
                  </TouchableOpacity>
                </LinearGradient>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  languageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerPoints: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerPointsText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  journeyCard: {
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  journeyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  journeyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  journeyPoints: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "right",
  },
  journeyPointsLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "right",
  },
  journeySubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: "#e0e7ff",
    fontWeight: "500",
  },
  progressPercentage: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 4,
  },
  questsContainer: {
    flex: 1,
    paddingBottom: 16,
  },
  questCard: {
    borderRadius: 16,
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  questCardContent: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  questHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  questIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  questTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  questPhrase: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  questProgressText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#8b5cf6",
    backgroundColor: "#f5f3ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  questTasks: {
    marginTop: 8,
  },
  questFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    marginTop: 2,
  },
  taskCheckboxChecked: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  taskInfo: {
    flex: 1,
  },
  taskText: {
    fontSize: 15,
    color: "#1f2937",
    lineHeight: 22,
    fontWeight: '500',
  },
  taskTextCompleted: {
    textDecorationLine: "line-through",
    color: "#9ca3af",
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  counterButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  counterText: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    minWidth: 24,
    textAlign: "center",
  },
  input: {
    marginTop: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    minHeight: 44,
    textAlignVertical: "top",
  },
  inputCompleted: {
    backgroundColor: "#f3f4f6",
    opacity: 0.8,
  },
  pointsContainer: {
    marginLeft: 8,
    minWidth: 40,
    alignItems: "flex-end",
  },
  pointsText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7c3aed",
    backgroundColor: "#f5f3ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pointsTextCompleted: {
    color: "#9ca3af",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  clearButtonText: {
    marginLeft: 4,
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },
  submitButton: {
    borderRadius: 8,
    height: 40,
    width: 120,
    overflow: 'hidden',
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
})
