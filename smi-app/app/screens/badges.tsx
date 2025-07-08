"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, Dimensions } from "react-native"
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore"
import { FIRESTORE_DB } from "../../FirebaseConfig"
import { useQuest, type QuestPeriod } from "../QuestContext"
import { getAuth, type User } from "firebase/auth"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"

// Type definitions
interface TaskState {
  checked?: boolean
  count?: number
  value?: string
  completed?: boolean
  state?: TaskState
}

interface QuestState {
  [key: string]: {
    [taskId: string]: TaskState
  }
}

type BadgeType = {
  id: string
  name: string
  icon: string
  description: string
  requirements: BadgeRequirement[]
  earned: boolean
  progress: {
    current: number
    target: number
  }
  lastUpdated?: Date
}

type BadgeRequirement = {
  taskId: string
  requiredCompletions: number
  period: "daily" | "weekly" | "all-time" | "consecutive"
  session?: string
  requiresAllTasks?: boolean
  requiresVerification?: boolean
  requiresAllSessions?: boolean
}

// Storage keys for streaks
const STREAK_KEYS = {
  MORNING_ROUTINE: "@morning_routine_streak",
  ALL_SESSIONS: "@all_sessions_streak",
  THANKED_CREATOR: "@thanked_creator_streak",
  DAILY_HABITS: "@daily_habits_streak",
  NO_OUTSIDE_FOOD: "@no_outside_food_streak",
  LAST_ACTIVE_DATE: "@last_active_date",
} as const

// Streak utility functions
const updateStreak = async (streakKey: string): Promise<number> => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize to start of day
    const todayString = today.toDateString()

    const lastUpdatedKey = `${streakKey}_last_updated`
    const lastUpdated = await AsyncStorage.getItem(lastUpdatedKey)

    // If we already updated the streak today, return the current count
    if (lastUpdated === todayString) {
      const currentCount = await AsyncStorage.getItem(streakKey)
      return currentCount ? Number.parseInt(currentCount, 10) : 0
    }

    // Get current streak count
    const streakCount = await AsyncStorage.getItem(streakKey)
    let lastUpdate = null

    if (lastUpdated) {
      lastUpdate = new Date(lastUpdated)
      lastUpdate.setHours(0, 0, 0, 0) // Normalize to start of day
    }

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let newCount = 1 // Default to 1 if no previous streak

    if (streakCount) {
      const count = Number.parseInt(streakCount, 10)

      if (lastUpdate) {
        const dayDiff = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))

        // If last update was yesterday, increment the streak
        if (dayDiff === 1) {
          newCount = count + 1
        }
        // If there was a gap of more than one day, reset the streak
        else if (dayDiff > 1) {
          newCount = 1
        }
        // If same day, keep the same count (shouldn't happen due to first check)
        else {
          newCount = count
        }
      }
    }

    // Save the updated streak and last updated date
    await AsyncStorage.setItem(streakKey, newCount.toString())
    await AsyncStorage.setItem(lastUpdatedKey, todayString)

    console.log(`Updated ${streakKey} to ${newCount} (last updated: ${todayString})`)
    return newCount
  } catch (error) {
    console.error("Error updating streak:", error)
    return 0
  }
}

// Default badge requirements
const defaultBadges: BadgeType[] = [
  {
    id: "hygiene_hero",
    name: "Hygiene Hero",
    icon: "🦷",
    description: "Complete all morning routine tasks for 7 consecutive days",
    earned: false,
    progress: { current: 0, target: 7 },
    requirements: [
      {
        taskId: "morning_all",
        requiredCompletions: 7,
        period: "consecutive",
        requiresAllTasks: true,
        session: "morning",
      },
    ],
  },
  {
    id: "teamwork_champ",
    name: "Teamwork Champ",
    icon: "⚽",
    description: "Practiced with team members only",
    earned: false,
    progress: { current: 0, target: 1 },
    requirements: [
      {
        taskId: "6",
        requiredCompletions: 1,
        period: "all-time",
        session: "workout",
      },
    ],
  },
  {
    id: "discipline_master",
    name: "Discipline Master",
    icon: "💪",
    description: "30 days continuous streak of completing all 5 sessions",
    earned: false,
    progress: { current: 0, target: 30 },
    requirements: [
      {
        taskId: "all_sessions",
        requiredCompletions: 30,
        period: "consecutive",
        requiresAllSessions: true,
      },
    ],
  },
  {
    id: "gratitude_guardian",
    name: "Gratitude Guardian",
    icon: "🙏",
    description: "7 days continuous streak of thanking your creator",
    earned: false,
    progress: { current: 0, target: 7 },
    requirements: [
      {
        taskId: "6",
        requiredCompletions: 7,
        period: "consecutive",
        session: "morning",
      },
    ],
  },
  {
    id: "focus_fighter",
    name: "Focus Fighter",
    icon: "🎯",
    description: "14 days of completing all daily habits",
    earned: false,
    progress: { current: 0, target: 14 },
    requirements: [
      {
        taskId: "daily_all",
        requiredCompletions: 14,
        period: "consecutive",
        requiresAllTasks: true,
        session: "daily",
      },
    ],
  },
  {
    id: "health_hero",
    name: "Health Hero",
    icon: "🥗",
    description: "21 days continuous streak of no outside food",
    earned: false,
    progress: { current: 0, target: 21 },
    requirements: [
      {
        taskId: "5",
        requiredCompletions: 21,
        period: "consecutive",
        session: "daily",
      },
    ],
  },
]

const { width } = Dimensions.get("window")

const BadgesTab: React.FC = () => {
  // State declarations with proper types
  const [badges, setBadges] = useState<BadgeType[]>(defaultBadges)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [badgesLoaded, setBadgesLoaded] = useState<boolean>(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // Use refs to prevent infinite loops
  const lastProcessedStateRef = useRef<string>("")
  const updateInProgressRef = useRef<boolean>(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Get auth and quest state with proper types
  const auth = getAuth()
  const { questState } = useQuest() as { questState: QuestState }

  // Memoize the quest state hash to prevent unnecessary updates
  const questStateHash = useMemo(() => {
    if (!questState) return ""
    return JSON.stringify(questState)
  }, [questState])

  // Auth state effect
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user)
    })
    return () => unsubscribe()
  }, [auth])

  // Log initial state
  useEffect(() => {
    console.log("BadgesTab component mounted")
    console.log("Initial questState:", questState)
  }, [questState])

  // Helper to check if a task is completed with proper type
  const isTaskCompleted = useCallback((taskState: TaskState | { state?: TaskState } | undefined): boolean => {
    // Handle undefined or null task state
    if (!taskState) return false

    // Handle nested task state (common in quest state structure)
    if ("state" in taskState && taskState.state) {
      taskState = taskState.state
    } else if (typeof taskState === "object" && "state" in taskState && taskState.state) {
      taskState = taskState.state
    }

    // Type guard to ensure we have a TaskState
    const task = taskState as TaskState

    // Check for checked state
    if (task.checked === true) {
      return true
    }

    // Check for counter tasks
    if (typeof task.count === "number" && task.count > 0) {
      return true
    }

    // Check for input tasks with value
    if (typeof task.value === "string" && task.value.trim() !== "") {
      return true
    }

    return false
  }, [])

  // Helper to check if all tasks in a session are completed
  const checkSessionCompletion = useCallback(
    (sessionData: any, sessionName: string): boolean => {
      if (!sessionData || typeof sessionData !== "object") {
        console.log(`No data for session: ${sessionName}`)
        return false
      }

      // Look for the nested session data (e.g., questState.daily.daily)
      const nestedSessionData = sessionData[sessionName]
      if (nestedSessionData && typeof nestedSessionData === "object") {
        console.log(`Checking nested session completion for ${sessionName}:`, nestedSessionData)

        // Check if all tasks in the nested session are completed
        const allTasksCompleted = Object.entries(nestedSessionData).every(([taskId, taskState]) => {
          // Skip nested session objects
          if (["morning", "afternoon", "evening", "workout", "daily"].includes(taskId)) {
            return true
          }
          const completed = isTaskCompleted(taskState as TaskState)
          console.log(`Task ${sessionName}.${taskId} completed:`, completed)
          return completed
        })

        console.log(`Session ${sessionName} all tasks completed:`, allTasksCompleted)
        return allTasksCompleted
      }

      // Fallback: check top-level tasks
      const topLevelCompleted = Object.entries(sessionData).every(([taskId, taskState]) => {
        // Skip nested session objects
        if (["morning", "afternoon", "evening", "workout", "daily"].includes(taskId)) {
          return true
        }
        return isTaskCompleted(taskState as TaskState)
      })

      console.log(`Session ${sessionName} top-level completion:`, topLevelCompleted)
      return topLevelCompleted
    },
    [isTaskCompleted],
  )

  // Get the appropriate streak key for a task
  const getStreakKeyForTask = useCallback((taskId: string): string | null => {
    switch (taskId) {
      case "morning_all":
        return STREAK_KEYS.MORNING_ROUTINE
      case "all_sessions":
        return STREAK_KEYS.ALL_SESSIONS
      case "daily_all":
        return STREAK_KEYS.DAILY_HABITS
      case "6": // Thank creator task
        return STREAK_KEYS.THANKED_CREATOR
      case "5": // No outside food task
        return STREAK_KEYS.NO_OUTSIDE_FOOD
      default:
        return null
    }
  }, [])

  // Save badge progress to Firebase with error handling
  const saveBadgeProgress = useCallback(
    async (badge: BadgeType): Promise<void> => {
      if (!currentUser) {
        console.log("No current user, skipping badge save")
        return
      }

      try {
        const userRef = doc(FIRESTORE_DB, "userBadges", currentUser.uid)

        // Create a clean badge data object
        const badgeData = {
          id: badge.id,
          name: badge.name,
          icon: badge.icon,
          description: badge.description,
          earned: badge.earned,
          progress: badge.progress,
          lastUpdated: serverTimestamp(),
        }

        // First try to get the document
        const docSnap = await getDoc(userRef)

        if (docSnap.exists()) {
          // Document exists, update the specific badge
          await updateDoc(userRef, {
            [`badges.${badge.id}`]: badgeData,
          })
          console.log(`Updated badge ${badge.name} in existing document`)
        } else {
          // Document doesn't exist, create it with badges object
          console.log("Creating new userBadges document")
          await setDoc(userRef, {
            userId: currentUser.uid,
            badges: {
              [badge.id]: badgeData,
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
          console.log(`Created new document with badge ${badge.name}`)
        }

        console.log(`Badge progress saved for ${badge.name}`)
      } catch (error) {
        console.error("Error saving badge progress:", error)
        if (error instanceof Error) {
          console.error("Error details:", error.message, error.stack)
        }
      }
    },
    [currentUser],
  )

  // Track processed tasks to prevent duplicate updates
  const processedTasksRef = useRef<Set<string>>(new Set());
  const lastProcessedState = useRef<string>('');
  const updateInProgress = useRef<boolean>(false);

  // Update badge progress when tasks are completed
  const updateBadgeProgress = useCallback(
    async (taskId: string, isComplete: boolean): Promise<void> => {
      if (!isComplete || !badgesLoaded || !questState || updateInProgress.current) {
        console.log("Skipping badge update - conditions not met");
        return;
      }

      // Skip if we've already processed this task in the current session
      if (processedTasksRef.current.has(taskId)) {
        console.log(`Skipping already processed task: ${taskId}`);
        return;
      }

      // Create a unique key for this update operation
      const updateKey = `${taskId}-${Date.now()}`;
      processedTasksRef.current.add(updateKey);
      updateInProgress.current = true;

      console.log(`Updating badge progress for task: ${taskId}`);

      try {
        // Process badges in a single state update
        setBadges(currentBadges => {
          // Skip if this update is already processed
          const stateKey = JSON.stringify({ taskId, badges: currentBadges });
          if (lastProcessedState.current === stateKey) {
            return currentBadges;
          }
          lastProcessedState.current = stateKey;

          const updatedBadges = [...currentBadges];
          let hasUpdates = false;

          for (let i = 0; i < updatedBadges.length; i++) {
            const badge = updatedBadges[i];
            if (badge.earned) continue;

            // Check requirements for this badge
            const requirementsMet = badge.requirements.every((req) => {
              // Handle session completion badges (e.g., morning_all, daily_all)
              if (req.requiresAllTasks && req.session) {
                const sessionKey = req.session as QuestPeriod;
                return taskId === `${sessionKey}_all`;
              }

              // Handle direct task matches with different formats
              if (taskId === req.taskId) {
                return true;
              }

              // Handle session.taskId format (e.g., 'morning.1')
              if (req.session) {
                const sessionTaskId = `${req.session}.${req.taskId}`;
                if (taskId === sessionTaskId) {
                  return true;
                }
                
                // Handle taskId in format 'session.taskId'
                if (taskId.includes('.')) {
                  const [session, id] = taskId.split('.');
                  if (session === req.session && id === req.taskId) {
                    return true;
                  }
                }
                
                // Handle session completion
                if (taskId === `${req.session}_all`) {
                  return true;
                }
                
                // Handle any session-prefixed task
                if (taskId.startsWith(`${req.session}.`) || taskId.startsWith(`${req.session}_`)) {
                  return true;
                }
              }
              
              // Special case for session completion
              if (taskId.endsWith('_all') && req.requiresAllTasks) {
                const session = taskId.replace('_all', '');
                return req.session === session;
              }

              return false;
            });

            if (!requirementsMet) continue;

            console.log(`Updating badge ${badge.name} for task ${taskId}`);
            hasUpdates = true;

            // Handle consecutive day streaks
            const isConsecutive = badge.requirements.some(req => req.period === 'consecutive');
            
            if (isConsecutive) {
              const streakKey = getStreakKeyForTask(badge.requirements[0].taskId);
              if (streakKey) {
                // Process streak updates asynchronously
                updateStreak(streakKey)
                  .then((streak) => {
                    console.log(`Current streak for ${streakKey}:`, streak);
                    
                    const updatedBadge = {
                      ...badge,
                      progress: {
                        ...badge.progress,
                        current: Math.min(streak, badge.progress.target)
                      },
                      earned: streak >= badge.progress.target,
                      lastUpdated: new Date()
                    };
                    
                    // Update the badge in the state
                    setBadges(prevBadges => 
                      prevBadges.map(b => 
                        b.id === updatedBadge.id ? updatedBadge : b
                      )
                    );
                    
                    // Save to Firestore
                    saveBadgeProgress(updatedBadge);
                    
                    // Show alert for newly earned badge
                    if (!badge.earned && updatedBadge.earned) {
                      Alert.alert(
                        '🎉 Achievement Unlocked!',
                        `You've earned the ${updatedBadge.name} badge!`,
                        [{ text: 'OK' }]
                      );
                    }
                  })
                  .catch(console.error);
              }
            } else {
              // For non-consecutive badges, update the progress
              const updatedBadge = {
                ...badge,
                progress: {
                  ...badge.progress,
                  current: Math.min(badge.progress.current + 1, badge.progress.target)
                },
                earned: badge.progress.current + 1 >= badge.progress.target,
                lastUpdated: new Date()
              };
              
              updatedBadges[i] = updatedBadge;
              
              // Save to Firestore
              saveBadgeProgress(updatedBadge);
              
              // Show alert for newly earned badge
              if (!badge.earned && updatedBadge.earned) {
                Alert.alert(
                  '🎉 Achievement Unlocked!',
                  `You've earned the ${updatedBadge.name} badge!`,
                  [{ text: 'OK' }]
                );
              }
            }
          }

          return hasUpdates ? updatedBadges : currentBadges;
        });
      } finally {
        updateInProgress.current = false;
      }
    },
    [badgesLoaded, questState, getStreakKeyForTask, saveBadgeProgress]
  );

  // Load badges from Firestore on mount
  useEffect(() => {
    const loadBadges = async () => {
      if (!currentUser) {
        setBadges(defaultBadges)
        setBadgesLoaded(true)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const userRef = doc(FIRESTORE_DB, "userBadges", currentUser.uid)
        const docSnap = await getDoc(userRef)

        if (docSnap.exists()) {
          const userData = docSnap.data()
          const userBadges = userData.badges || {}
          const mergedBadges = defaultBadges.map((badge) => ({
            ...badge,
            ...(userBadges[badge.id] || {}),
          }))
          setBadges(mergedBadges)
        } else {
          // Create the document if it doesn't exist
          const initialBadgeData: Record<string, any> = {
            userId: currentUser.uid,
            badges: {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }

          defaultBadges.forEach((badge) => {
            initialBadgeData.badges[badge.id] = badge
          })

          await setDoc(userRef, initialBadgeData)
          setBadges(defaultBadges)
        }
      } catch (err) {
        console.error("Error loading badges:", err)
        setError("Failed to load badges")
        setBadges(defaultBadges)
      } finally {
        setLoading(false)
        setBadgesLoaded(true)
      }
    }

    loadBadges()
  }, [currentUser])

  // Process quest state changes ONLY after badges are loaded - FIXED VERSION
  useEffect(() => {
    if (!badgesLoaded || !questState || updateInProgressRef.current) {
      console.log("Skipping badge update - badges not loaded or no quest state")
      return
    }

    // Prevent processing the same state multiple times
    if (lastProcessedStateRef.current === questStateHash) {
      console.log("Skipping badge update - same quest state hash")
      return
    }

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Debounce the processing to prevent rapid updates
    debounceTimeoutRef.current = setTimeout(() => {
      console.log("Processing quest state changes...")
      lastProcessedStateRef.current = questStateHash

      const sessions: QuestPeriod[] = ["morning", "afternoon", "evening", "workout", "daily"]

      // Check session completions
      sessions.forEach((session) => {
        const sessionData = questState[session]
        if (!sessionData) return

        const isSessionComplete = checkSessionCompletion(sessionData, session)

        if (isSessionComplete) {
          console.log(`Session ${session} is complete, updating badge progress`)
          updateBadgeProgress(`${session}_all`, true)
        }

        // Process individual tasks for direct task matches
        const nestedSessionData = (sessionData as Record<string, any>)[session]
        if (nestedSessionData && typeof nestedSessionData === "object") {
          Object.entries(nestedSessionData).forEach(([taskId, taskState]) => {
            if (sessions.includes(taskId as QuestPeriod)) return

            const taskCompleted = isTaskCompleted(taskState as TaskState)
            if (taskCompleted) {
              updateBadgeProgress(`${session}.${taskId}`, true)
            }
          })
        }
      })

      // Check if all sessions are completed
      const allSessionsCompleted = sessions.every((session) => {
        const sessionData = questState[session]
        return sessionData ? checkSessionCompletion(sessionData, session) : false
      })

      if (allSessionsCompleted) {
        console.log("All sessions completed!")
        updateBadgeProgress("all_sessions", true)
      }
    }, 100) // 100ms debounce

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [questStateHash, badgesLoaded, updateBadgeProgress, checkSessionCompletion, isTaskCompleted])

  const BadgeCard = ({ badge }: { badge: BadgeType }) => (
    <View style={[styles.badgeCard, badge.earned ? styles.earnedBadge : styles.unearnedBadge]}>
      <Text style={styles.badgeIcon}>{badge.icon}</Text>
      <Text style={[styles.badgeName, badge.earned ? styles.earnedText : styles.unearnedText]}>{badge.name}</Text>
      <Text style={styles.badgeDescription}>{badge.description}</Text>
      <Text style={[styles.progressText, badge.earned ? styles.earnedText : styles.unearnedText]}>
        {`${badge.progress.current}/${badge.progress.target}`}
      </Text>
      {badge.earned && (
        <View style={styles.earnedLabel}>
          <Text style={styles.earnedLabelText}>Earned!</Text>
        </View>
      )}
    </View>
  )

  // Calculate earned badges count
  const earnedBadgesCount = badges.filter((badge) => badge.earned).length
  const totalBadges = badges.length

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading badges...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={{ color: "red", marginTop: 10 }}>Debug Info:</Text>
        <Text style={{ color: "red" }}>Loading: {String(loading)}</Text>
        <Text style={{ color: "red" }}>Badges Loaded: {String(badgesLoaded)}</Text>
      </View>
    )
  }

  console.log("Rendering BadgesTab with badges:", badges.length, "loading:", loading)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Badges</Text>
        <View style={styles.headerPoints}>
          <Ionicons name="trophy" size={16} color="#f59e0b" />
          <Text style={styles.headerPointsText}>{`${earnedBadgesCount}/${totalBadges}`}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.badgesGrid}>
          {badges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  headerPoints: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  headerPointsText: {
    color: "#111827",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#6b7280",
    fontSize: 16,
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
    fontSize: 16,
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingBottom: 20,
  },
  badgeCard: {
    width: (width - 48) / 2,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  earnedBadge: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
  },
  unearnedBadge: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  badgeIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  earnedText: {
    color: "#92400E",
  },
  unearnedText: {
    color: "#6B7280",
  },
  badgeDescription: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  earnedLabel: {
    backgroundColor: "#EAB308",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  earnedLabelText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
})

export default BadgesTab
