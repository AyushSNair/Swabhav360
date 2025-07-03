import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  RefreshControl,
  PanGestureHandler,
  State,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuest } from '../QuestContext';
import { useAuth } from '../../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

// Animated Progress Ring Component
const ProgressRing = ({ 
  progress, 
  size = 120, 
  strokeWidth = 8, 
  colors = ['#6366f1', '#8b5cf6'] 
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  colors?: string[];
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={[styles.progressRing, { width: size, height: size }]}>
      <Animated.View style={styles.progressRingContainer}>
        <LinearGradient
          colors={colors}
          style={[styles.progressRingGradient, { width: size, height: size, borderRadius: size / 2 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={[styles.progressRingInner, { 
          width: size - strokeWidth * 2, 
          height: size - strokeWidth * 2,
          borderRadius: (size - strokeWidth * 2) / 2 
        }]} />
      </Animated.View>
      <View style={styles.progressRingText}>
        <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
        <Text style={styles.progressLabel}>Complete</Text>
      </View>
    </View>
  );
};

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

// Animated Task Card Component
const TaskCard = ({ 
  task, 
  onComplete, 
  index 
}: { 
  task: any; 
  onComplete: (id: string) => void; 
  index: number;
}) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  const handleComplete = () => {
    setIsCompleting(true);
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      onComplete(task.id);
      setIsCompleting(false);
    }, 600);
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      if (event.nativeEvent.translationX > 100 && !task.completed) {
        handleComplete();
      }
      
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View
        style={[
          styles.taskCardContainer,
          {
            transform: [
              { scale: scaleAnim },
              { translateX: translateX }
            ],
          },
        ]}
      >
        <GlassCard style={[
          styles.taskCard,
          task.completed && styles.taskCardCompleted,
          isCompleting && styles.taskCardCompleting
        ]}>
          <View style={styles.taskContent}>
            <View style={[styles.taskIcon, task.completed && styles.taskIconCompleted]}>
              <Ionicons 
                name={task.completed ? 'checkmark' : task.icon} 
                size={24} 
                color={task.completed ? '#10b981' : '#6366f1'} 
              />
            </View>
            <View style={styles.taskDetails}>
              <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                {task.title}
              </Text>
              <Text style={styles.taskDescription}>{task.description}</Text>
            </View>
            <View style={styles.taskPoints}>
              <LinearGradient
                colors={['#f59e0b', '#f97316']}
                style={styles.pointsBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.pointsText}>+{task.points}</Text>
              </LinearGradient>
            </View>
          </View>
          
          {!task.completed && (
            <TouchableOpacity 
              style={styles.taskCompleteButton}
              onPress={handleComplete}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.completeButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="checkmark" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          {isCompleting && (
            <View style={styles.completionAnimation}>
              <Animated.View style={styles.rippleEffect} />
            </View>
          )}
        </GlassCard>
      </Animated.View>
    </PanGestureHandler>
  );
};

// Stats Card Component
const StatsCard = ({ icon, value, label, color }: {
  icon: string;
  value: string | number;
  label: string;
  color: string;
}) => {
  return (
    <GlassCard style={styles.statsCard}>
      <View style={[styles.statsIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
    </GlassCard>
  );
};

// Main Journey Screen Component
export default function JourneyScreen() {
  const { user } = useAuth();
  const { questState, totalPoints, completedTasks, totalTasks, streak } = useQuest();
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState({
    level: 12,
    dailyProgress: 67,
    weeklyGoal: 85,
    monthlyStreak: 15
  });

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const [tasks, setTasks] = useState([
    { 
      id: '1', 
      title: 'Morning Meditation', 
      description: '10 minutes mindfulness practice', 
      icon: 'leaf-outline', 
      points: 15, 
      completed: false,
      category: 'wellness'
    },
    { 
      id: '2', 
      title: 'Workout Session', 
      description: '30 minutes cardio training', 
      icon: 'fitness-outline', 
      points: 25, 
      completed: false,
      category: 'fitness'
    },
    { 
      id: '3', 
      title: 'Read 20 Pages', 
      description: 'Personal development book', 
      icon: 'book-outline', 
      points: 20, 
      completed: true,
      category: 'learning'
    },
    { 
      id: '4', 
      title: 'Hydration Goal', 
      description: 'Drink 8 glasses of water', 
      icon: 'water-outline', 
      points: 10, 
      completed: true,
      category: 'health'
    },
    { 
      id: '5', 
      title: 'Evening Reflection', 
      description: 'Journal your thoughts', 
      icon: 'journal-outline', 
      points: 15, 
      completed: false,
      category: 'mindfulness'
    },
  ]);

  const handleTaskComplete = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: true } : task
    ));
    
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setUserStats(prev => ({
        ...prev,
        dailyProgress: Math.min(100, prev.dailyProgress + 15)
      }));
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const completedTasksCount = tasks.filter(task => task.completed).length;
  const taskProgress = (completedTasksCount / tasks.length) * 100;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.9)', 'rgba(139, 92, 246, 0.9)']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Text style={styles.headerTitle}>Your Journey</Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Section with Gradient Background */}
        <LinearGradient
          colors={['#6366f1', '#8b5cf6', '#ec4899']}
          style={styles.heroSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.email?.split('@')[0] || 'Champion'}!</Text>
            </View>

            {/* Main Progress Ring */}
            <View style={styles.progressSection}>
              <ProgressRing 
                progress={taskProgress} 
                size={160} 
                strokeWidth={12}
                colors={['#ffffff', 'rgba(255,255,255,0.8)']}
              />
              <View style={styles.progressDetails}>
                <Text style={styles.progressTitle}>Daily Progress</Text>
                <Text style={styles.progressSubtitle}>
                  {completedTasksCount} of {tasks.length} tasks completed
                </Text>
              </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <StatsCard 
                icon="flame" 
                value={streak} 
                label="Day Streak" 
                color="#f59e0b" 
              />
              <StatsCard 
                icon="trophy" 
                value={userStats.level} 
                label="Level" 
                color="#8b5cf6" 
              />
              <StatsCard 
                icon="star" 
                value={totalPoints} 
                label="Points" 
                color="#10b981" 
              />
            </View>
          </View>
        </LinearGradient>

        {/* Tasks Section */}
        <View style={styles.tasksSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Quests</Text>
            <TouchableOpacity style={styles.sectionAction}>
              <Text style={styles.sectionActionText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#6366f1" />
            </TouchableOpacity>
          </View>

          <View style={styles.tasksList}>
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleTaskComplete}
                index={index}
              />
            ))}
          </View>
        </View>

        {/* Weekly Overview */}
        <View style={styles.weeklySection}>
          <GlassCard style={styles.weeklyCard}>
            <View style={styles.weeklyHeader}>
              <Text style={styles.weeklyTitle}>Weekly Overview</Text>
              <View style={styles.weeklyProgress}>
                <Text style={styles.weeklyPercentage}>{userStats.weeklyGoal}%</Text>
              </View>
            </View>
            
            <View style={styles.weeklyChart}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <View key={day} style={styles.chartBar}>
                  <View style={[
                    styles.chartBarFill,
                    { height: `${Math.random() * 80 + 20}%` }
                  ]} />
                  <Text style={styles.chartLabel}>{day}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </View>

        {/* Achievements Preview */}
        <View style={styles.achievementsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Achievements</Text>
            <TouchableOpacity style={styles.sectionAction}>
              <Text style={styles.sectionActionText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#6366f1" />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsList}>
            {[
              { icon: 'medal', title: 'First Week', color: '#f59e0b' },
              { icon: 'flame', title: 'Streak Master', color: '#ef4444' },
              { icon: 'star', title: 'Point Collector', color: '#8b5cf6' },
            ].map((achievement, index) => (
              <GlassCard key={index} style={styles.achievementCard}>
                <View style={[styles.achievementIcon, { backgroundColor: achievement.color + '20' }]}>
                  <Ionicons name={achievement.icon as any} size={24} color={achievement.color} />
                </View>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
              </GlassCard>
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1000,
    justifyContent: 'flex-end',
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroSection: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  heroContent: {
    alignItems: 'center',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    color: 'white',
    fontWeight: '700',
    marginTop: 4,
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  progressRing: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressRingContainer: {
    position: 'absolute',
  },
  progressRingGradient: {
    position: 'absolute',
  },
  progressRingInner: {
    backgroundColor: '#6366f1',
    position: 'absolute',
    top: 12,
    left: 12,
  },
  progressRingText: {
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
  },
  progressLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  progressDetails: {
    alignItems: 'center',
    marginTop: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  progressSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  statsCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  statsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  tasksSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionActionText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  tasksList: {
    gap: 12,
  },
  taskCardContainer: {
    marginBottom: 4,
  },
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  taskCard: {
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  taskCardCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  taskCardCompleting: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  taskIconCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.6)',
  },
  taskDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  taskPoints: {
    marginLeft: 12,
  },
  pointsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  taskCompleteButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -20,
  },
  completeButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rippleEffect: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
  },
  weeklySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  weeklyCard: {
    padding: 20,
  },
  weeklyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  weeklyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  weeklyProgress: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  weeklyPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
  },
  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
  },
  chartBarFill: {
    width: '80%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  achievementsSection: {
    paddingHorizontal: 20,
  },
  achievementsList: {
    paddingVertical: 8,
  },
  achievementCard: {
    width: 120,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
});