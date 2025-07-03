"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useQuest, QuestPeriod, QuestState } from "../QuestContext"
import { useLanguage } from '../../contexts/LanguageContext'
import i18n from '../../i18n'
import { Picker } from '@react-native-picker/picker'

const { width } = Dimensions.get('window');

// Web-compatible gradient wrapper
const GradientView = ({ colors, style, children, start, end, ...props }: {
  colors: string[];
  style?: any;
  children?: React.ReactNode;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  [key: string]: any;
}) => {
  if (Platform.OS === 'web') {
    const gradientStyle = {
      background: `linear-gradient(135deg, ${colors.join(', ')})`,
      ...style,
    };
    return <View style={gradientStyle} {...props}>{children}</View>;
  }
  return (
    <LinearGradient colors={colors} style={style} start={start} end={end} {...props}>
      {children}
    </LinearGradient>
  );
};

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
  icon?: string
  category?: string
}

const initialTasks: Task[] = [
  {
    id: "1",
    text: "task_coach_1",
    points: 10,
    icon: "football-outline",
    category: "sports"
  },
  {
    id: "2",
    text: "task_coach_2",
    points: 15,
    icon: "eye-outline",
    category: "analysis"
  },
  {
    id: "3",
    text: "task_coach_3",
    points: 20,
    isCounter: true,
    icon: "target-outline",
    category: "practice"
  },
  {
    id: "4",
    text: "task_coach_4",
    points: 10,
    isInput: true,
    icon: "journal-outline",
    category: "reflection"
  },
]

// Glassmorphism Card Component
const GlassCard = ({ children, style = {}, gradient = ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] }: {
  children: React.ReactNode;
  style?: any;
  gradient?: string[];
}) => {
  return (
    <GradientView
      colors={gradient}
      style={[styles.glassCard, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </GradientView>
  );
};

// Animated Task Card Component
const TaskCard = ({ 
  task, 
  questState, 
  onToggle, 
  onInput, 
  onCounter, 
  isDayComplete 
}: {
  task: Task;
  questState: any;
  onToggle: (taskId: string) => void;
  onInput: (taskId: string, text: string) => void;
  onCounter: (taskId: string, amount: number) => void;
  isDayComplete: boolean;
}) => {
  const state = questState.coach?.[task.id] || {};
  const isComplete = task.isCounter
    ? (state.count || 0) > 0
    : task.isInput
      ? (state.value || "").trim() !== ""
      : state.checked;

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (!isDayComplete && !task.isCounter && !task.isInput) {
      onToggle(task.id);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      sports: '#ef4444',
      analysis: '#3b82f6',
      practice: '#f59e0b',
      reflection: '#8b5cf6',
    };
    return colors[category as keyof typeof colors] || '#6366f1';
  };

  return (
    <Animated.View style={[styles.taskCardContainer, { transform: [{ scale: scaleAnim }] }]}>
      <GlassCard style={[
        styles.taskCard,
        isComplete && styles.taskCardCompleted
      ]}>
        <TouchableOpacity
          style={styles.taskContent}
          onPress={handlePress}
          activeOpacity={0.8}
          disabled={isDayComplete}
        >
          {/* Task Icon */}
          <View style={[
            styles.taskIcon,
            { backgroundColor: getCategoryColor(task.category || 'sports') + '20' }
          ]}>
            <Ionicons 
              name={isComplete ? 'checkmark-circle' : (task.icon as any) || 'ellipse-outline'} 
              size={24} 
              color={isComplete ? '#10b981' : getCategoryColor(task.category || 'sports')} 
            />
          </View>

          {/* Task Details */}
          <View style={styles.taskDetails}>
            <Text style={[styles.taskTitle, isComplete && styles.taskTitleCompleted]}>
              {i18n.t(task.text)}
            </Text>
            
            {/* Counter Input */}
            {task.isCounter && (
              <View style={styles.counterContainer}>
                <TouchableOpacity
                  style={[styles.counterButton, styles.counterButtonMinus]}
                  onPress={() => !isDayComplete && onCounter(task.id, -1)}
                  disabled={isDayComplete}
                >
                  <Ionicons name="remove" size={16} color="white" />
                </TouchableOpacity>
                <Text style={styles.counterText}>{state.count || 0}</Text>
                <TouchableOpacity
                  style={[styles.counterButton, styles.counterButtonPlus]}
                  onPress={() => !isDayComplete && onCounter(task.id, 1)}
                  disabled={isDayComplete}
                >
                  <Ionicons name="add" size={16} color="white" />
                </TouchableOpacity>
              </View>
            )}

            {/* Text Input */}
            {task.isInput && (
              <TextInput
                style={[styles.textInput, isComplete && styles.textInputCompleted]}
                value={state.value || ""}
                onChangeText={(text: string) => !isDayComplete && onInput(task.id, text)}
                placeholder={i18n.t('type_your_response')}
                placeholderTextColor="rgba(255,255,255,0.5)"
                editable={!isDayComplete}
                multiline
                numberOfLines={3}
              />
            )}
          </View>

          {/* Points Badge */}
          <View style={styles.pointsContainer}>
            <GradientView
              colors={['#f59e0b', '#f97316']}
              style={styles.pointsBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.pointsText}>+{task.points}</Text>
            </GradientView>
          </View>
        </TouchableOpacity>

        {/* Completion Indicator */}
        {isComplete && (
          <View style={styles.completionIndicator}>
            <GradientView
              colors={['#10b981', '#059669']}
              style={styles.completionBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="checkmark" size={16} color="white" />
            </GradientView>
          </View>
        )}
      </GlassCard>
    </Animated.View>
  );
};

export default function TasksScreen() {
  const [questState, setQuestState] = useState<QuestState>({ coach: {} })
  const [isDayComplete, setIsDayComplete] = useState(false)
  const { setQuestState: setCtxQuestState } = useQuest()
  const { language, setLanguage } = useLanguage()

  // Initialize quest state
  useEffect(() => {
    const initialState: QuestState = { coach: {} };
    initialState.coach = {}; // Ensure it's defined
    initialTasks.forEach((task) => {
      initialState.coach![task.id] = task.isCounter ? { count: 0 } : task.isInput ? { value: "" } : { checked: false };
    });
    setQuestState(initialState);
  }, [])

  // Sync with context
  useEffect(() => {
    setCtxQuestState(questState)
  }, [questState, setCtxQuestState])

  // Calculate stats
  let totalPoints = 0
  let completedTasks = 0
  const totalTasks = initialTasks.length

  initialTasks.forEach((task) => {
    const state = questState.coach?.[task.id] || {}
    if (task.isCounter) {
      if ((state?.count || 0) > 0) {
        completedTasks++
        totalPoints += task.points
      }
    } else if (task.isInput) {
      if (state?.value?.trim() !== "") {
        completedTasks++
        totalPoints += task.points
      }
    } else if (state?.checked) {
      completedTasks++
      totalPoints += task.points
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
      initialTasks.forEach((task) => {
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header with Gradient */}
      <GradientView
        colors={['#6366f1', '#8b5cf6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{i18n.t('my_tasks')}</Text>
          
          {/* Language Picker */}
          <View style={styles.languageContainer}>
            <GlassCard style={styles.languagePicker}>
              <Picker
                selectedValue={language}
                style={styles.picker}
                onValueChange={setLanguage}
                dropdownIconColor="white"
              >
                <Picker.Item label="EN" value="en" color="white" />
                <Picker.Item label="मर" value="mr" color="white" />
              </Picker>
            </GlassCard>
          </View>

          {/* Points Display */}
          <View style={styles.headerPoints}>
            <GradientView
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.pointsDisplay}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="star" size={16} color="#f59e0b" />
              <Text style={styles.pointsText}>{totalPoints}</Text>
            </GradientView>
          </View>
        </View>

        {/* Progress Overview */}
        <GlassCard style={styles.progressOverview}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>{i18n.t('coach_assignments')}</Text>
              <Text style={styles.progressSubtitle}>{i18n.t('coach_tasks_subtitle')}</Text>
            </View>
            <View style={styles.progressStats}>
              <Text style={styles.progressPoints}>{totalPoints}</Text>
              <Text style={styles.progressLabel}>{i18n.t('total_points')}</Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <GradientView
                colors={['#10b981', '#059669']}
                style={[styles.progressBarFill, { width: `${percentComplete}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={styles.progressPercentage}>{percentComplete}%</Text>
          </View>
        </GlassCard>
      </GradientView>

      {/* Tasks List */}
      <KeyboardAvoidingView
        style={styles.tasksContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          style={styles.tasksList}
          contentContainerStyle={styles.tasksContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {initialTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              questState={questState}
              onToggle={(taskId) => handleToggle("coach", taskId)}
              onInput={(taskId, text) => handleInput("coach", taskId, text)}
              onCounter={(taskId, amount) => handleCounter("coach", taskId, amount)}
              isDayComplete={isDayComplete}
            />
          ))}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => !isDayComplete && handleClear("coach")}
              disabled={isDayComplete}
            >
              <GlassCard style={styles.clearButtonContent}>
                <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.8)" />
                <Text style={styles.clearButtonText}>{i18n.t('clear_all')}</Text>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => alert(i18n.t('tasks_submitted'))}
              disabled={isDayComplete}
            >
              <GradientView
                colors={isDayComplete ? ['#6b7280', '#4b5563'] : ['#10b981', '#059669']}
                style={styles.submitButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons 
                  name={isDayComplete ? "checkmark-circle" : "paper-plane"} 
                  size={20} 
                  color="white" 
                />
                <Text style={styles.submitButtonText}>
                  {isDayComplete ? i18n.t('completed') : i18n.t('submit')}
                </Text>
              </GradientView>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
  },
  languageContainer: {
    minWidth: 80,
  },
  languagePicker: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    width: 80,
    height: 40,
    color: 'white',
  },
  headerPoints: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  pointsDisplay: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  progressOverview: {
    padding: 20,
    borderRadius: 20,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  progressStats: {
    alignItems: "flex-end",
  },
  progressPoints: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
  },
  progressLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    minWidth: 40,
  },
  tasksContainer: {
    flex: 1,
  },
  tasksList: {
    flex: 1,
  },
  tasksContent: {
    padding: 20,
    paddingTop: 10,
  },
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  taskCardContainer: {
    marginBottom: 16,
  },
  taskCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  taskCardCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  taskContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 20,
  },
  taskIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 8,
    lineHeight: 22,
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "rgba(255,255,255,0.6)",
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 16,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  counterButtonMinus: {
    backgroundColor: "#ef4444",
  },
  counterButtonPlus: {
    backgroundColor: "#10b981",
  },
  counterText: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    minWidth: 32,
    textAlign: "center",
  },
  textInput: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: "white",
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  textInputCompleted: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  pointsContainer: {
    marginLeft: 12,
  },
  pointsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  completionIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  completionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
  },
  clearButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  clearButtonText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 2,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
})