"use client"

import React, { useState, useEffect } from "react"
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useQuest } from "../QuestContext"
import { saveSession, loadSessions, subscribeToJourneyUpdates, updateDailyTotals } from "../../services/journeyService"
import { getAuth } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FIRESTORE_DB } from '../../FirebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Task = {
  id: string
  text: string
  points: number
  items?: string[]
  isCounter?: boolean
  isInput?: boolean
  hasAdd?: boolean
  hasMedia?: boolean
  max?: number
  isChecklistCount?: boolean
}

type QuestPeriod = "morning" | "workout" | "afternoon" | "evening" | "daily"

type Quests = {
  [key in QuestPeriod]: Task[]
}

type QuestState = {
  [key in QuestPeriod]: {
    [taskId: string]: {
      checked?: boolean
      count?: number
      value?: string
    }
  }
}

const initialQuests: Quests = {
  morning: [
    { id: "1", text: "Slept 8 hours (slept before 9:30 PM last night?)", points: 3 },
    { id: "2", text: "Brushed your teeth?", points: 3 },
    { id: "3", text: "Went to poop?", points: 3 },
    { id: "4", text: "Boiled water and drank?", points: 3 },
    {
      id: "5",
      text: "Packed session items in advance?",
      points: 3,
      items: ["Shoes", "Socks", "Shinpad", "Bag", "Bottles", "Notebook"],
      isChecklistCount: true,
    },
    { id: "6", text: "Thanked God your Creator?", points: 3 },
  ],
  workout: [
    { id: "1", text: "25 Pushups", points: 3, isCounter: true },
    { id: "2", text: "25 Pullups", points: 3, isCounter: true },
    { id: "3", text: "25 Glute Bridges", points: 3, isCounter: true },
    { id: "4", text: "25 Squats", points: 3, isCounter: true },
    { id: "5", text: "Juggling – enter number done today", points: 5, isInput: true, max: 999 },
    { id: "6", text: "Practiced only with team members", points: 3 },
  ],
  afternoon: [
    { id: "1", text: "Went to school today?", points: 3 },
    { id: "2", text: "Helped someone? – explain the situation", points: 5, isInput: true, max: 200 },
    { id: "3", text: "Forgave someone? – explain the situation", points: 5, isInput: true, max: 200 },
  ],
  evening: [
    { id: "1", text: "Washed jersey kit after the game?", points: 3 },
    { id: "2", text: "Dinner before 8 PM?", points: 3 },
    { id: "3", text: "Daily update (before 9 PM)", points: 5, isInput: true, max: 500 },
    { id: "4a", text: "What good happened today?", points: 3, isInput: true, max: 500 },
    { id: "4b", text: "What bad happened today?", points: 3, isInput: true, max: 500 },
    { id: "4c", text: "Highest moment of the day?", points: 3, isInput: true, max: 500 },
    { id: "4d", text: "Lowest moment of the day?", points: 3, isInput: true, max: 500 },
  ],
  daily: [
    { id: "1", text: "Drank minimum 2 litres of water?", points: 3 },
    { id: "2", text: "Went to turf today?", points: 3 },
    { id: "3", text: "Listened to parents and helped them?", points: 3 },
    { id: "4", text: "Respect and value girls? in neighbourhood, school, and public?", points: 3 },
    { id: "5", text: "No outside food?", points: 5 },
    { id: "6", text: 'No bf/gf? say "My focus is career now, so I will not talk"', points: 3 },        
    { id: "7", text: "No addictions? – porn, cigarette, tobacco, etc.", points: 3 },
    { id: "8", text: 'No talking to area friends? say "My focus is career now, so I will not talk"', points: 3 },
  ],
}

function getInitialQuestState(quests: Quests): QuestState {
  const initialState = {} as QuestState
  ;(Object.keys(quests) as QuestPeriod[]).forEach((period) => {
    initialState[period] = {}
    quests[period].forEach((task) => {
      if (task.isCounter) {
        initialState[period][task.id] = { count: 0 }
      } else if (task.isInput) {
        initialState[period][task.id] = { value: "" }
      } else {
        initialState[period][task.id] = { checked: false }
      }
    })
  })
  return initialState
}

interface SessionData {
  submitted: boolean;
  score: number;
  timestamp: string;
}

const QuestCard = React.memo(
  ({
    title,
    time,
    icon,
    color,
    phrase,
    period,
    tasks,
    questState,
    onToggle,
    onInput,
    onCounter,
    onClear,
    onSessionSubmit,
    isSessionSubmitted,
    submittedSessions,
  }: {
    title: string
    time?: string
    icon: React.ComponentProps<typeof Ionicons>['name']
    color: string
    phrase: string
    period: QuestPeriod
    tasks: Task[]
    questState: QuestState[QuestPeriod]
    onToggle: (period: QuestPeriod, taskId: string) => void
    onInput: (period: QuestPeriod, taskId: string, value: string) => void
    onCounter: (period: QuestPeriod, taskId: string, change: number) => void
    onClear: (period: QuestPeriod) => void
    onSessionSubmit: (period: QuestPeriod) => void
    isSessionSubmitted: boolean
    submittedSessions: Record<string, SessionData>
  }) => {
    const completed = tasks.filter((task) => {
      const periodState = questState[period as QuestPeriod];
      if (!periodState) return false;
      
      type TaskState = {
        checked?: boolean;
        count?: number;
        value?: string;
      };
      
      // Safely access task state with proper type checking
      const taskState = (periodState as Record<string, TaskState>)[task.id];
      if (!taskState) return false;
      
      if (task.isCounter) return (taskState.count || 0) > 0;
      if (task.isInput) {
        const val = taskState.value ?? "";
        if (task.id === "5" && period === "workout") {
          return val !== "" && Number(val) > 0;
        }
        return val.trim() !== "";
      }
      return taskState.checked || false;
    }).length

    const handleSubmit = () => {
      if (onSessionSubmit) {
        onSessionSubmit(period as QuestPeriod);
      }
    }

    return (
      <View style={styles.questCard}>
        <View style={styles.questHeader}>
          <View style={[styles.questIconContainer, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.questTitle}>{time ? `${title} (${time})` : title}</Text>
            <Text style={styles.questPhrase}>{`"${phrase}"`}</Text>
          </View>
          <Text style={styles.questProgressText}>
            {completed}/{tasks.length}
          </Text>
        </View>
        <View style={[styles.questTasks, isSessionSubmitted && { opacity: 0.6 }]} 
              pointerEvents={isSessionSubmitted ? 'none' : 'auto'}>
          {tasks.map((task: Task) => {
            const taskState = questState[task.id] || {}
            return (
              <View key={task.id} style={styles.taskItem}>
                <View style={styles.taskInfo}>
                  <TouchableOpacity
                    style={[styles.taskCheckbox, taskState.checked && styles.taskCheckboxChecked]}
                    onPress={() => onToggle(period, task.id)}
                  >
                    {taskState.checked && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskText}>{task.text}</Text>
                    {task.items && (
                      <View style={styles.taskTags}>
                        {task.items.map((item: string, index: number) => (
                          <View key={index} style={styles.taskTag}>
                            <Text style={styles.taskTagText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {task.isInput && (
                      <TextInput
                        key={`${period}-${task.id}`}
                        style={
                          task.id === "5" && period === "workout"
                            ? styles.numberInput
                            : styles.textInput
                        }
                        keyboardType={task.id === "5" && period === "workout" ? "number-pad" : "default"}
                        value={taskState.value || ""}
                        onChangeText={(text) => onInput(period, task.id, text)}
                        maxLength={task.max || 50}
                        placeholder={task.id === "5" && period === "workout" ? "0" : "Enter details..."}
                        multiline={task.id !== "5" || period !== "workout"}
                        numberOfLines={task.id === "5" && period === "workout" ? 1 : 3}
                        autoFocus={false}
                      />
                    )}
                    {task.hasAdd && (
                      <TouchableOpacity style={styles.addButton}>
                        <Ionicons name="add-circle-outline" size={16} color="#6b7280" />
                        <Text style={styles.addButtonText}>Add details</Text>
                      </TouchableOpacity>
                    )}
                    {task.hasMedia && (
                      <TouchableOpacity style={styles.mediaButton}>
                        <Ionicons name="mic-outline" size={16} color="#6b7280" />
                        <Text style={styles.mediaButtonText}>Record audio</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={styles.taskPoints}>
                  {task.isCounter && (
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => onCounter(period, task.id, -1)}
                    >
                      <Ionicons name="remove-circle-outline" size={16} color="#6b7280" />
                    </TouchableOpacity>
                  )}
                  {task.isCounter && (
                    <Text style={styles.taskCount}>{taskState.count || 0}</Text>
                  )}
                  {task.isCounter && (
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={() => onCounter(period, task.id, 1)}
                    >
                      <Ionicons name="add-circle-outline" size={16} color="#6b7280" />
                    </TouchableOpacity>
                  )}
                  <Text style={styles.taskPointsText}>{task.points} points</Text>
                </View>
              </View>
            )
          })}
        </View>
        <View style={styles.questActionsRow}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.clearButton]} 
            onPress={() => onClear(period)}
            disabled={isSessionSubmitted}
          >
            <Ionicons name="close-circle-outline" size={18} color="#64748b" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.submitButton,
              isSessionSubmitted && { 
                backgroundColor: '#f0fdf4', 
                borderColor: '#bbf7d0' 
              }
            ]} 
            onPress={handleSubmit}
            disabled={isSessionSubmitted}
          >
            <Ionicons 
              name={isSessionSubmitted ? "checkmark-done" : "checkmark-circle-outline"} 
              size={18} 
              color="#10b981"
            />
            <Text style={styles.submitButtonText}>
              {isSessionSubmitted ? "Submitted" : "Submit"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }
)

export default function JourneyScreen() {
  const [quests] = useState<Quests>(initialQuests)
  const [questState, setQuestState] = useState<QuestState>(() => getInitialQuestState(initialQuests))
  const [submittedSessions, setSubmittedSessions] = useState<Record<string, SessionData>>({});
  const [isDayComplete, setIsDayComplete] = useState(false);
  
  const { setQuestState: setCtxQuestState, streak, updateStats } = useQuest();
  
  // Calculate stats
  const stats = React.useMemo(() => {
    let points = 0;
    let completed = 0;
    let total = 0;

    // Calculate points from submitted sessions
    points = Object.entries(submittedSessions).reduce((sum, [period, session]) => {
      if (session?.submitted) {
        console.log(`Session ${period} points:`, session.score);
        return sum + (session.score || 0);
      }
      return sum;
    }, 0);

    console.log('Total points from sessions:', points);

    // Calculate task completion stats
    Object.entries(quests).forEach(([period, tasks]) => {
      tasks.forEach((task) => {
        total++;
        const periodState = questState[period as QuestPeriod];
        if (!periodState) return;
        
        const state = periodState[task.id];
        if (!state) return;
        
        if (task.isCounter) {
          if ((state.count || 0) > 0) {
            completed++;
          }
        } else if (task.isInput) {
          const val = state.value || '';
          if (task.id === "5" && period === "workout") {
            if (val !== "" && Number(val) > 0) completed++;
          } else if (val.trim() !== "") {
            completed++;
          }
        } else if (state.checked) {
          completed++;
        }
      });
    });

    // Calculate percentage based on completed tasks
    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { 
      points, 
      completed, 
      total,
      percentComplete: Math.min(100, percentComplete) // Cap at 100%
    };
  }, [submittedSessions, questState, quests]);
  
  // Update the context with the latest stats
  React.useEffect(() => {
    updateStats({
      points: stats.points,
      completed: stats.completed,
      total: stats.total
    });
  }, [stats, updateStats]);
  
  const { points: totalPoints, completed: completedTasks, total: totalTasks, percentComplete } = stats;
  
  // Load saved sessions and quest state on mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const auth = getAuth();
        
        // Wait for auth state to be ready
        return new Promise<void>((resolve) => {
          const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) {
              console.log('No user signed in');
              unsubscribe();
              resolve();
              return;
            }

            try {
              // Load data from Firestore
              const data = await loadSessions();
              
              if (data) {
                // Update local state with Firestore data
                setSubmittedSessions(data.sessions);
                
                // Update quest state if available
                const updatedQuestState = { ...questState };
                let hasUpdates = false;
                
                Object.entries(data.sessions).forEach(([period, session]) => {
                  console.log(`Loading session for ${period}:`, session);
                  if (session.questState) {
                    updatedQuestState[period as QuestPeriod] = {
                      ...updatedQuestState[period as QuestPeriod],
                      ...session.questState
                    };
                    hasUpdates = true;
                  }
                });
                
                if (hasUpdates) {
                  console.log('Updating quest state with:', updatedQuestState);
                  setQuestState(updatedQuestState);
                } else {
                  console.log('No quest state updates needed');
                }
              }
              
              // Set up real-time listener
              const unsubscribeFirestore = subscribeToJourneyUpdates(
                new Date().toISOString().split('T')[0],
                (updatedData) => {
                  if (updatedData) {
                    setSubmittedSessions(updatedData.sessions);
                  }
                }
              );
              
              // Clean up function
              return () => {
                unsubscribe();
                if (unsubscribeFirestore) unsubscribeFirestore();
              };
            } catch (error) {
              console.error('Error loading Firestore data:', error);
            } finally {
              resolve();
            }
          });
        });
      } catch (error) {
        console.error('Error in loadSavedData:', error);
      }
    };
    
    loadSavedData();
  }, []);
  
  const calculateSessionScore = (period: string) => {
    const sessionTasks = quests[period as QuestPeriod];
    return sessionTasks.reduce((total, task) => {
      const taskState = questState[period as QuestPeriod]?.[task.id];
      if (taskState?.checked) {
        return total + (task.points || 0);
      } else if (task.isCounter && taskState?.count) {
        return total + ((task.points || 0) * taskState.count);
      } else if (task.isInput && taskState?.value) {
        return total + (task.points || 0);
      }
      return total;
    }, 0);
  };

  const handleSessionSubmit = async (period: QuestPeriod) => {
    try {
      const score = calculateSessionScore(period);
      
      // Get the current quest state for this period
      const currentQuestState = questState[period] || {};
      
      // Update local state optimistically first
      const sessionData = {
        submitted: true,
        score: score,
        timestamp: new Date().toISOString(),
        questState: currentQuestState
      };
      
      console.log('Submitting session with quest state:', {
        period,
        sessionData,
        currentQuestState
      });
      
      setSubmittedSessions(prev => ({
        ...prev,
        [period]: sessionData
      }));
      
      // Save to Firestore
      await saveSession(period, sessionData);
      
      // Update daily totals
      await updateDailyTotals();
      
    } catch (error) {
      console.error('Error saving session submission:', error);
      // Revert local state on error
      setSubmittedSessions(prev => ({
        ...prev,
        [period]: { ...prev[period], submitted: false }
      }));
    }
  };
  // Sync with context
  React.useEffect(() => {
    setCtxQuestState(questState)
  }, [questState, setCtxQuestState])

  const handleClear = (period: QuestPeriod) => {
    setQuestState((prev) => {
      const newPeriodState = { ...prev[period] }
      quests[period].forEach((task) => {
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

  const handleToggle = async (period: QuestPeriod, taskId: string) => {
    const newChecked = !questState[period]?.[taskId]?.checked;
    
    // Optimistic update
    setQuestState(prev => ({
      ...prev,
      [period]: {
        ...prev[period],
        [taskId]: {
          ...prev[period]?.[taskId],
          checked: newChecked
        }
      }
    }));
    
    // Update in Firestore if session is submitted
    if (submittedSessions[period]?.submitted) {
      try {
        const sessionRef = doc(
          FIRESTORE_DB,
          'users',
          getAuth().currentUser?.uid || '',
          'dailyJourneys',
          new Date().toISOString().split('T')[0],
          'sessions',
          period
        );
        
        await updateDoc(sessionRef, {
          [`questState.${taskId}.checked`]: newChecked,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        console.error('Error updating toggle in Firestore:', error);
      }
    }
  };

  const handleCounter = async (period: QuestPeriod, taskId: string, amount: number) => {
    const currentCount = questState[period]?.[taskId]?.count || 0;
    const newCount = Math.max(0, currentCount + amount);
    
    // Optimistic update
    setQuestState(prev => ({
      ...prev,
      [period]: {
        ...prev[period],
        [taskId]: {
          ...prev[period]?.[taskId],
          count: newCount
        }
      }
    }));
    
    // Update in Firestore if session is submitted
    if (submittedSessions[period]?.submitted) {
      try {
        const sessionRef = doc(
          FIRESTORE_DB,
          'users',
          getAuth().currentUser?.uid || '',
          'dailyJourneys',
          new Date().toISOString().split('T')[0],
          'sessions',
          period
        );
        
        await updateDoc(sessionRef, {
          [`questState.${taskId}.count`]: newCount,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        console.error('Error updating counter in Firestore:', error);
      }
    }
  };

  const handleInput = async (period: QuestPeriod, taskId: string, text: string) => {
    const value = (taskId === "5" && period === "workout") 
      ? text.replace(/[^0-9]/g, "") 
      : text;
    
    // Optimistic update
    setQuestState(prev => ({
      ...prev,
      [period]: {
        ...prev[period],
        [taskId]: {
          ...prev[period]?.[taskId],
          value
        }
      }
    }));
    
    // Update in Firestore if session is submitted
    if (submittedSessions[period]?.submitted) {
      try {
        const sessionRef = doc(
          FIRESTORE_DB,
          'users',
          getAuth().currentUser?.uid || '',
          'dailyJourneys',
          new Date().toISOString().split('T')[0],
          'sessions',
          period
        );
        
        await updateDoc(sessionRef, {
          [`questState.${taskId}.value`]: value,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        // Error handling without logging
      }
    }
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
          <Text style={styles.headerTitle}>Swabhav360</Text>
          <View style={styles.headerPoints}>
            <Ionicons name="star" size={16} color="#f59e0b" />
            <Text style={styles.headerPointsText}>{totalPoints}</Text>
          </View>
        </View>

        {/* Journey Card */}
        <LinearGradient colors={["#6d28d9", "#4f46e5"]} style={styles.journeyCard}>
          <View style={styles.journeyHeader}>
            <Text style={styles.journeyTitle}>My Journey Today</Text>
            <View>
              <Text style={styles.journeyPoints}>{totalPoints}</Text>
              <Text style={styles.journeyPointsLabel}>Total Points</Text>
            </View>
          </View>
          <Text style={styles.journeySubtitle}>Ready to become your best self?</Text>
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Daily Progress</Text>
            <Text style={styles.progressPercentage}>{percentComplete}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${percentComplete}%` }]} />
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="flash-outline" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="ribbon-outline" size={24} color="#6d28d9" />
            <Text style={styles.statValue}>2</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#10b981" />
            <Text style={styles.statValue}>{percentComplete}%</Text>
            <Text style={styles.statLabel}>Complete</Text>
          </View>
        </View>

        {/* Quests */}
        <View style={styles.questsContainer}>
          <View style={isDayComplete && { opacity: 0.6 }} pointerEvents={isDayComplete ? 'none' : 'auto'}>
            <QuestCard
              title="Morning Quest"
              time="6 AM – 9 AM"
              icon="sunny-outline"
              color="#f59e0b"
              tasks={quests.morning}
              questState={questState.morning}
              onToggle={handleToggle}
              onInput={handleInput}
              onCounter={handleCounter}
              onClear={handleClear}
              onSessionSubmit={handleSessionSubmit}
              isSessionSubmitted={!!submittedSessions.morning?.submitted}
              submittedSessions={submittedSessions}
              period="morning"
              phrase="Start your day right"
            />
          </View>

          <View style={[styles.questCard, isDayComplete && { opacity: 0.6 }]} pointerEvents={isDayComplete ? 'none' : 'auto'}>
            <QuestCard
              title="Workout Session"
              icon="fitness-outline"
              color="#ef4444"
              tasks={quests.workout}
              questState={questState.workout}
              onToggle={handleToggle}
              onInput={handleInput}
              onCounter={handleCounter}
              onClear={handleClear}
              onSessionSubmit={handleSessionSubmit}
              isSessionSubmitted={!!submittedSessions.workout?.submitted}
              submittedSessions={submittedSessions}
              period="workout"
              phrase="Stay fit and strong"
            />
          </View>

          <View style={[styles.questCard, isDayComplete && { opacity: 0.6 }]} pointerEvents={isDayComplete ? 'none' : 'auto'}>
            <QuestCard
              title="Afternoon Check"
              time="1 PM – 3 PM"
              icon="time-outline"
              color="#3b82f6"
              tasks={quests.afternoon}
              questState={questState.afternoon}
              onToggle={handleToggle}
              onInput={handleInput}
              onCounter={handleCounter}
              onClear={handleClear}
              onSessionSubmit={handleSessionSubmit}
              isSessionSubmitted={!!submittedSessions.afternoon?.submitted}
              submittedSessions={submittedSessions}
              period="afternoon"
              phrase="Midday check-in"
            />
          </View>

          <View style={[styles.questCard, isDayComplete && { opacity: 0.6 }]} pointerEvents={isDayComplete ? 'none' : 'auto'}>
            <QuestCard
              title="Evening Review"
              time="6 PM – 8 PM"
              icon="moon-outline"
              color="#8b5cf6"
              tasks={quests.evening}
              questState={questState.evening}
              onToggle={handleToggle}
              onInput={handleInput}
              onCounter={handleCounter}
              onClear={handleClear}
              onSessionSubmit={handleSessionSubmit}
              isSessionSubmitted={!!submittedSessions.evening?.submitted}
              submittedSessions={submittedSessions}
              period="evening"
              phrase="Reflect on your day"
            />
          </View>

          <View style={[styles.questCard, isDayComplete && { opacity: 0.6 }]} pointerEvents={isDayComplete ? 'none' : 'auto'}>
            <QuestCard
              title="Daily Habits"
              time="All Day"
              icon="shield-checkmark-outline"
              color="#10b981"
              tasks={quests.daily}
              questState={questState.daily}
              onToggle={handleToggle}
              onInput={handleInput}
              onCounter={handleCounter}
              onClear={handleClear}
              onSessionSubmit={handleSessionSubmit}
              isSessionSubmitted={!!submittedSessions.daily?.submitted}
              submittedSessions={submittedSessions}
              period="daily"
              phrase="Daily goals and habits"
            />
          </View>
        </View>
        <View style={{ height: 40 }} />

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
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
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  journeyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  journeyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    width: "60%",
  },
  journeyPoints: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "right",
  },
  journeyPointsLabel: {
    fontSize: 14,
    color: "#e0e7ff",
    textAlign: "right",
  },
  journeySubtitle: {
    fontSize: 16,
    color: "#e0e7ff",
    marginTop: 8,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  progressLabel: {
    fontSize: 14,
    color: "#e0e7ff",
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    marginTop: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 4,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    marginTop: -10,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doneButtonContainer: {
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: 12,
  },
  doneButton: {
    flexDirection: 'row',
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  disabledButton: {
    backgroundColor: '#6b7280',
    shadowColor: '#6b7280',
  },
  disabledButtonContainer: {
    opacity: 0.8,
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  doneButtonIcon: {
    marginLeft: 8,
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  questsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  questCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  questIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  questTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  questPhrase: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
  },
  questProgressText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "bold",
    marginLeft: 8,
  },
  questTasks: {
    gap: 16,
  },
  taskItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  taskInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    flex: 1,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  taskCheckboxChecked: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  taskText: {
    fontSize: 16,
    flexShrink: 1,
    lineHeight: 22,
  },
  taskTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  taskTag: {
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  taskTagText: {
    fontSize: 12,
    color: "#4b5563",
  },
  taskPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  taskCount: {
    marginHorizontal: 4,
    minWidth: 24,
    textAlign: 'center',
  },
  taskPointsText: {
    marginLeft: 8,
    color: '#6b7280',
    fontSize: 12,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  counterButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    fontSize: 16,
    fontWeight: "bold",
    minWidth: 20,
    textAlign: "center",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    lineHeight: 20,
    textAlignVertical: "top",
    minHeight: 100,
    width: "100%",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    color: "#1f2937",
  },
  numberInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: "center",
    fontSize: 16,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    color: "#1f2937",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: "#6b7280",
  },
  mediaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  mediaButtonText: {
    fontSize: 14,
    color: "#6b7280",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  clearButton: {
    backgroundColor: "#f3f4f6",
  },
  submitButton: {
    backgroundColor: "#e0fdf4",
  },
  clearButtonText: {
    color: "#64748b",
    fontWeight: "bold",
    fontSize: 14,
  },
  questActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  submitButtonText: {
    color: "#10b981",
    fontWeight: "bold",
    fontSize: 14,
  },

})