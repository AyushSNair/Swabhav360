"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  ScrollView, 
  Dimensions,
  Animated,
  TouchableOpacity,
  StatusBar
} from "react-native"
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore"
import { FIRESTORE_DB } from "../../FirebaseConfig"
import { useQuest, type QuestPeriod } from "../../app/QuestContext"
import { getAuth, type User } from "firebase/auth"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"

const { width } = Dimensions.get("window")

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
  category?: string
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
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

// Glassmorphism Card Component
const GlassCard = ({ children, style = {}, gradient = ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] }: {
  children: React.ReactNode;
  style?: any;
  gradient?: string[];
}) => {
  return (
    <LinearGradient
      colors={gradient}
      style={[styles.glassCard, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
};

// Animated Badge Card Component
const BadgeCard = ({ badge, index }: { badge: BadgeType; index: number }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 100),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    if (badge.earned) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [badge.earned]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return ['#ffd700', '#ffed4e'];
      case 'epic': return ['#8b5cf6', '#a855f7'];
      case 'rare': return ['#3b82f6', '#60a5fa'];
      default: return ['#6b7280', '#9ca3af'];
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'wellness': return 'leaf';
      case 'fitness': return 'fitness';
      case 'learning': return 'book';
      case 'social': return 'people';
      default: return 'star';
    }
  };

  return (
    <Animated.View
      style={[
        styles.badgeCardContainer,
        {
          transform: [
            { scale: scaleAnim },
            { rotate: badge.earned ? rotate : '0deg' }
          ]
        }
      ]}
    >
      <GlassCard style={[
        styles.badgeCard,
        badge.earned && styles.earnedBadge
      ]}>
        {badge.earned && (
          <Animated.View
            style={[
              styles.badgeGlow,
              {
                opacity: glowOpacity,
                backgroundColor: getRarityColor(badge.rarity || 'common')[0] + '40'
              }
            ]}
          />
        )}
        
        <View style={styles.badgeHeader}>
          <View style={[
            styles.badgeIconContainer,
            { backgroundColor: getRarityColor(badge.rarity || 'common')[0] + '20' }
          ]}>
            <Ionicons 
              name={getCategoryIcon(badge.category || 'default') as any} 
              size={32} 
              color={getRarityColor(badge.rarity || 'common')[0]} 
            />
          </View>
          
          {badge.earned && (
            <View style={styles.earnedIndicator}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.earnedBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="checkmark" size={16} color="white" />
              </LinearGradient>
            </View>
          )}
        </View>

        <Text style={[
          styles.badgeName,
          badge.earned && styles.earnedText
        ]}>
          {badge.name}
        </Text>
        
        <Text style={styles.badgeDescription}>
          {badge.description}
        </Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={getRarityColor(badge.rarity || 'common')}
              style={[
                styles.progressFill,
                { width: `${Math.min((badge.progress.current / badge.progress.target) * 100, 100)}%` }
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <Text style={[
            styles.progressText,
            badge.earned && styles.earnedText
          ]}>
            {badge.progress.current}/{badge.progress.target}
          </Text>
        </View>

        {badge.rarity && (
          <View style={styles.rarityBadge}>
            <LinearGradient
              colors={getRarityColor(badge.rarity)}
              style={styles.rarityGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.rarityText}>
                {badge.rarity.toUpperCase()}
              </Text>
            </LinearGradient>
          </View>
        )}
      </GlassCard>
    </Animated.View>
  );
};

// Default badge requirements with enhanced data
const defaultBadges: BadgeType[] = [
  {
    id: "hygiene_hero",
    name: "Hygiene Hero",
    icon: "🦷",
    description: "Complete all morning routine tasks for 7 consecutive days",
    earned: false,
    progress: { current: 0, target: 7 },
    category: "wellness",
    rarity: "rare",
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
    category: "social",
    rarity: "common",
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
    category: "fitness",
    rarity: "legendary",
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
    category: "wellness",
    rarity: "epic",
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
    category: "learning",
    rarity: "rare",
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
    category: "wellness",
    rarity: "epic",
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

const BadgesTab: React.FC = () => {
  const [badges, setBadges] = useState<BadgeType[]>(defaultBadges)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [badgesLoaded, setBadgesLoaded] = useState<boolean>(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const auth = getAuth()
  const { questState } = useQuest() as { questState: QuestState }

  // Auth state effect
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user)
    })
    return () => unsubscribe()
  }, [auth])

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

  // Calculate earned badges count
  const earnedBadgesCount = badges.filter((badge) => badge.earned).length
  const totalBadges = badges.length

  // Filter badges by category
  const categories = ['all', 'wellness', 'fitness', 'learning', 'social']
  const filteredBadges = selectedCategory === 'all' 
    ? badges 
    : badges.filter(badge => badge.category === selectedCategory)

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading badges...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6', '#ec4899']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>My Badges</Text>
        <View style={styles.headerStats}>
          <GlassCard style={styles.statsCard}>
            <Ionicons name="trophy" size={20} color="#f59e0b" />
            <Text style={styles.statsText}>{earnedBadgesCount}/{totalBadges}</Text>
            <Text style={styles.statsLabel}>Earned</Text>
          </GlassCard>
        </View>
      </LinearGradient>

      {/* Category Filter */}
      <View style={styles.categoryFilter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.activeCategoryButton
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <GlassCard style={[
                styles.categoryButtonContent,
                selectedCategory === category && styles.activeCategoryContent
              ]}>
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === category && styles.activeCategoryText
                ]}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.badgesGrid}>
          {filteredBadges.map((badge, index) => (
            <BadgeCard key={badge.id} badge={badge} index={index} />
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginBottom: 16,
  },
  headerStats: {
    width: '100%',
    alignItems: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  statsText: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
  },
  statsLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  categoryFilter: {
    paddingVertical: 16,
  },
  categoryScroll: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    marginRight: 12,
  },
  categoryButtonContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  activeCategoryContent: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
  },
  categoryButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  activeCategoryText: {
    color: 'white',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: "rgba(255,255,255,0.7)",
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
    marginTop: 16,
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  badgeCardContainer: {
    width: (width - 48) / 2,
    marginBottom: 16,
  },
  badgeCard: {
    padding: 16,
    alignItems: "center",
    position: 'relative',
    overflow: 'hidden',
  },
  earnedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 20,
  },
  badgeHeader: {
    position: 'relative',
    marginBottom: 12,
  },
  badgeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earnedIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  earnedBadgeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeName: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    color: "rgba(255,255,255,0.8)",
  },
  earnedText: {
    color: "white",
  },
  badgeDescription: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 12,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  rarityGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  activeCategoryButton: {
    // Additional styles for active state if needed
  },
})

export default BadgesTab