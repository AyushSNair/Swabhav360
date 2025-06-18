import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Dimensions, Alert, TextStyle, ViewStyle, Animated, Platform, SafeAreaView, StyleSheet } from 'react-native';
import { FIREBASE_AUTH } from '../../FirebaseConfig';
import { 
  VictoryChart, 
  VictoryBar, 
  VictoryLine, 
  VictoryPie, 
  VictoryTheme,
  VictoryAxis,
  VictoryLabel,
  VictoryContainer,
} from 'victory-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

// Get screen dimensions
const screenWidth = Dimensions.get('window').width;

// Define TypeScript interfaces
interface Meal {
  time: string;
  description: string;
}

interface Sleep {
  bedtime: string;
  wakeup: string;
  duration: number;
}

interface Attendance {
  status: 'present' | 'absent' | 'late';
  reason?: string;
}

interface SportsActivity {
  sport: string;
  duration: number;
  intensity: 'low' | 'medium' | 'high';
  notes?: string;
}

interface TodayData {
  water: number;
  meals: Meal[];
  sleep: Sleep;
  attendance: Attendance;
  sports: SportsActivity[];
}

interface WeeklyDataPoint {
  day: string;
  water: number;
  meals: number;
  sleep: number;
}

interface MonthlyStats {
  waterGoalAchievement: number;
  currentStreak: number;
  averageSleep: number;
  bestDay: string;
}

interface DailyActivity {
  _id: string;
  uid: string;
  date: string;
  waterIntake: number;
  meals: any[];
  sleep: {
    duration: number;
  };
  weeklyStats: any;
  activity: any[];
  __v: number;
}

// Enhanced Icon Components
const CalendarIcon = () => <Ionicons name="calendar" size={20} color="#6C4AB6" />;
const TrendingUpIcon = () => <Ionicons name="trending-up" size={20} color="#6C4AB6" />;
const DropletsIcon = () => <FontAwesome5 name="tint" size={20} color="#3B82F6" />;
const UtensilsIcon = () => <Ionicons name="restaurant" size={20} color="#10B981" />;
const MoonIcon = () => <Ionicons name="moon" size={20} color="#7C3AED" />;
const PlusIcon = () => <Ionicons name="add" size={20} color="white" />;
const MinusIcon = () => <Ionicons name="remove" size={20} color="white" />;
const BarChart3Icon = () => <Ionicons name="bar-chart" size={20} color="#6C4AB6" />;
const ActivityIcon = () => <Ionicons name="flash" size={20} color="#6C4AB6" />;
const CheckCircleIcon = () => <Ionicons name="checkmark-circle" size={20} color="#10B981" />;
const CloseCircleIcon = () => <Ionicons name="close-circle" size={20} color="#EF4444" />;
const TimeIcon = () => <Ionicons name="time" size={20} color="#F59E0B" />;
const SportsIcon = () => <Ionicons name="basketball" size={20} color="#8B5CF6" />;

const EnhancedActivityTracker: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<string>('today');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const auth = FIREBASE_AUTH;
  const [bestDay, setBestDay] = useState<string>('-');
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [averageSleep, setAverageSleep] = useState<number>(0);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    waterGoalAchievement: 0,
    currentStreak: 0,
    averageSleep: 0,
    bestDay: '-'
  });
  
  const [todayData, setTodayData] = useState<TodayData>({
    water: 0,
    meals: [],
    sleep: { bedtime: '', wakeup: '', duration: 0 },
    attendance: { status: 'present' },
    sports: []
  });

  // Weekly data for charts
  const [weeklyData, setWeeklyData] = useState<WeeklyDataPoint[]>([
    { day: 'Mon', water: 0, meals: 0, sleep: 0 },
    { day: 'Tue', water: 0, meals: 0, sleep: 0 },
    { day: 'Wed', water: 0, meals: 0, sleep: 0 },
    { day: 'Thu', water: 0, meals: 0, sleep: 0 },
    { day: 'Fri', water: 0, meals: 0, sleep: 0 },
    { day: 'Sat', water: 0, meals: 0, sleep: 0 },
    { day: 'Sun', water: 0, meals: 0, sleep: 0 }
  ]);

  const generateMonthlyStats = (data: DailyActivity[]): MonthlyStats => {
    try {
      if (!data || data.length === 0) {
        return {
          waterGoalAchievement: 0,
          currentStreak: 0,
          averageSleep: 0,
          bestDay: '-'
        };
      }

      // Calculate water goal achievement
      const daysWithGoalMet = data.filter(day => day.waterIntake >= 8).length;
      const waterGoalAchievement = Math.round((daysWithGoalMet / data.length) * 100);

      // Calculate current streak
      let streak = 0;
      const sortedData = [...data].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      for (const day of sortedData) {
        if (day.waterIntake >= 8) {
          streak++;
        } else {
          break;
        }
      }

      // Calculate average sleep
      const totalSleep = data.reduce((sum, day) => sum + (day.sleep?.duration || 0), 0);
      const averageSleep = totalSleep / data.length;

      // Find best day
      const bestDayData = data.reduce((max, day) => 
        day.waterIntake > max.waterIntake ? day : max
      , data[0]);
      const bestDay = bestDayData ? new Date(bestDayData.date).toLocaleDateString() : '-';

      return {
        waterGoalAchievement,
        currentStreak: streak,
        averageSleep,
        bestDay
      };
    } catch (error) {
      console.error('Error generating monthly stats:', error);
      return {
        waterGoalAchievement: 0,
        currentStreak: 0,
        averageSleep: 0,
        bestDay: '-'
      };
    }
  };

  // Update fetchDailyActivities to calculate monthly stats
  const fetchDailyActivities = async () => {
    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`http://192.168.7.14:3000/daily-activity?uid=${user.uid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      const activities = await response.json();
      console.log('Fetched activities:', activities);
      
      // Update weekly data
      if (activities && activities.length > 0) {
        const weeklyDataFromDB = activities.slice(0, 7).map((activity: any) => ({
          day: new Date(activity.date).toLocaleDateString('en-US', { weekday: 'short' }),
          water: activity.waterIntake || 0,
          meals: activity.meals?.length || 0,
          sleep: activity.sleep?.duration || 0
        }));
        setWeeklyData(weeklyDataFromDB);

        // Calculate and set monthly stats
        const stats = generateMonthlyStats(activities);
        setMonthlyStats(stats);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to fetch activities');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch activities when component mounts
  useEffect(() => {
    fetchDailyActivities();
  }, []);

  const updateWater = (increment: number): void => {
    setTodayData(prev => ({
      ...prev,
      water: Math.max(0, prev.water + increment)
    }));
  };

  const addMeal = (): void => {
    const time = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    setTodayData(prev => ({
      ...prev,
      meals: [...prev.meals, { time, description: '' }]
    }));
  };

  const updateMealDescription = (index: number, description: string): void => {
    setTodayData(prev => ({
      ...prev,
      meals: prev.meals.map((meal, i) => 
        i === index ? { ...meal, description } : meal
      )
    }));
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleSleepChange = (field: 'bedtime' | 'wakeup', value: string): void => {
    setTodayData(prev => ({
      ...prev,
      sleep: { ...prev.sleep, [field]: value }
    }));
  };

  const handleSleepSubmit = (): void => {
    // Calculate sleep duration if both times are provided
    if (todayData.sleep.bedtime && todayData.sleep.wakeup) {
      try {
        // Convert times to 24-hour format if needed
        const convertTo24Hour = (time: string) => {
          const [timePart, period] = time.split(' ');
          let [hours, minutes] = timePart.split(':').map(Number);
          
          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }
          
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        };

        // Convert times to 24-hour format if they contain AM/PM
        const bedtime24 = todayData.sleep.bedtime.includes(' ') ? 
          convertTo24Hour(todayData.sleep.bedtime) : todayData.sleep.bedtime;
        const wakeup24 = todayData.sleep.wakeup.includes(' ') ? 
          convertTo24Hour(todayData.sleep.wakeup) : todayData.sleep.wakeup;

        // Create Date objects for calculation
        const [bedHours, bedMinutes] = bedtime24.split(':').map(Number);
        const [wakeHours, wakeMinutes] = wakeup24.split(':').map(Number);
        
        let duration = (wakeHours - bedHours) + (wakeMinutes - bedMinutes) / 60;
        
        // Handle overnight sleep (wakeup time is next day)
        if (duration < 0) {
          duration += 24;
        }

        // Update the state with the calculated duration
        setTodayData(prev => ({
          ...prev,
          sleep: { 
            ...prev.sleep, 
            duration: Math.round(duration * 10) / 10,
            bedtime: bedtime24,
            wakeup: wakeup24
          }
        }));

        // Show success message
        Alert.alert('Success', 'Sleep duration updated successfully!');
      } catch (error) {
        Alert.alert('Error', 'Please enter valid time formats (e.g., "22:00" or "10:00 PM")');
      }
    } else {
      Alert.alert('Error', 'Please enter both bedtime and wakeup time');
    }
  };

  const handleSave = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const activityData = {
        uid: user.uid,
        date: selectedDate.toISOString().split('T')[0],
        waterIntake: todayData.water,
        meals: todayData.meals,
        sleep: {
          duration: todayData.sleep.duration,
          bedtime: todayData.sleep.bedtime,
          wakeup: todayData.sleep.wakeup
        },
        attendance: todayData.attendance,
        sports: todayData.sports,
        weeklyStats: {
          water: weeklyData.reduce((sum, day) => sum + day.water, 0),
          meals: weeklyData.reduce((sum, day) => sum + day.meals, 0),
          sleep: weeklyData.reduce((sum, day) => sum + day.sleep, 0) / 7
        }
      };

      const response = await fetch('http://192.168.7.14:3000/daily-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) {
        throw new Error('Failed to save activity');
      }

      Alert.alert('Success', 'Activity saved successfully');
      fetchDailyActivities();
    } catch (error) {
      console.error('Error saving activity:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save activity');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttendanceChange = (status: 'present' | 'absent' | 'late', reason?: string) => {
    setTodayData(prev => ({
      ...prev,
      attendance: { status, reason }
    }));
  };

  const addSportsActivity = () => {
    setTodayData(prev => ({
      ...prev,
      sports: [...prev.sports, { sport: '', duration: 0, intensity: 'medium' }]
    }));
  };

  const updateSportsActivity = (index: number, field: keyof SportsActivity, value: any) => {
    setTodayData(prev => ({
      ...prev,
      sports: prev.sports.map((activity, i) => 
        i === index ? { ...activity, [field]: value } : activity
      )
    }));
  };

  const removeSportsActivity = (index: number) => {
    setTodayData(prev => ({
      ...prev,
      sports: prev.sports.filter((_, i) => i !== index)
    }));
  };

  // Prepare chart data for Victory
  const waterChartData = weeklyData.map((d, index) => ({ x: index + 1, y: d.water, label: d.day }));
  const mealsChartData = weeklyData.map((d, index) => ({ x: index + 1, y: d.meals, label: d.day }));
  const sleepChartData = weeklyData.map((d, index) => ({ x: index + 1, y: d.sleep, label: d.day }));

  const progressPieData = [
    { x: 'Goals Met', y: 0 },
    { x: 'Missed', y: 0 }
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8F6FF',
    },
    scrollContainer: {
      paddingBottom: 100,
    },
    header: {
      backgroundColor: 'white',
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      padding: 24,
      margin: 16,
      marginBottom: 24,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: '#6C4AB6',
      marginBottom: 16,
    },
    dateText: {
      fontSize: 16,
      color: '#6C4AB6',
      textAlign: 'center',
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: '#F0E6FF',
      borderRadius: 16,
      padding: 4,
      marginTop: 16,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    activeTab: {
      backgroundColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    tabText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#6C4AB6',
    },
    activeTabText: {
      color: '#6C4AB6',
    },
    card: {
      backgroundColor: 'white',
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      padding: 24,
      margin: 16,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#6C4AB6',
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: 16,
      marginBottom: 24,
    },
    statCard: {
      backgroundColor: 'white',
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      padding: 20,
      flex: 1,
      marginHorizontal: 4,
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 28,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 14,
      color: '#6C4AB6',
      textAlign: 'center',
      fontWeight: '500',
    },
    waterControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 16,
    },
    waterButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    waterCount: {
      fontSize: 32,
      fontWeight: '700',
      color: '#3B82F6',
      minWidth: 60,
      textAlign: 'center',
    },
    waterGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    waterGlass: {
      width: '11%',
      aspectRatio: 1,
      borderRadius: 12,
      borderWidth: 2,
      marginBottom: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    waterGlassFilled: {
      backgroundColor: '#3B82F6',
      borderColor: '#3B82F6',
    },
    waterGlassEmpty: {
      backgroundColor: '#F8F6FF',
      borderColor: '#E5E7EB',
    },
    mealItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F8F6FF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    mealTime: {
      fontSize: 16,
      fontWeight: '600',
      color: '#6C4AB6',
      minWidth: 80,
    },
    mealInput: {
      flex: 1,
      marginLeft: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      backgroundColor: 'white',
      fontSize: 16,
    },
    addButton: {
      backgroundColor: '#6C4AB6',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      alignSelf: 'flex-end',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    addButtonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 16,
    },
    sleepInputContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    sleepInputGroup: {
      flex: 1,
      marginHorizontal: 8,
    },
    sleepLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: '#6C4AB6',
      marginBottom: 8,
    },
    sleepInput: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      padding: 16,
      backgroundColor: 'white',
      fontSize: 16,
    },
    sleepSummary: {
      backgroundColor: '#F0E6FF',
      borderRadius: 16,
      padding: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sleepSummaryText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#6C4AB6',
    },
    sleepDuration: {
      fontSize: 24,
      fontWeight: '700',
      color: '#6C4AB6',
    },
    saveButton: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      backgroundColor: '#6C4AB6',
      borderRadius: 30,
      paddingHorizontal: 32,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    saveButtonText: {
      color: 'white',
      fontWeight: '700',
      fontSize: 18,
      marginLeft: 8,
    },
    chartContainer: {
      alignItems: 'center',
      marginVertical: 20,
    },
    chartTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#6C4AB6',
      marginBottom: 12,
      textAlign: 'center',
    },
    weeklyStatsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    weeklyStatCard: {
      flex: 1,
      padding: 20,
      borderRadius: 16,
      marginHorizontal: 4,
      alignItems: 'center',
      backgroundColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    weeklyStatNumber: {
      fontSize: 24,
      fontWeight: '700',
      color: '#6C4AB6',
      marginBottom: 4,
    },
    weeklyStatLabel: {
      fontSize: 14,
      color: '#6C4AB6',
      textAlign: 'center',
      fontWeight: '500',
    },
    monthlyStatsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 16,
    },
    monthlyStatCard: {
      width: '48%',
      padding: 20,
      borderRadius: 20,
      alignItems: 'center',
      marginBottom: 16,
      backgroundColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    monthlyStatNumber: {
      fontSize: 24,
      fontWeight: '700',
      color: '#6C4AB6',
      marginVertical: 8,
    },
    monthlyStatLabel: {
      fontSize: 14,
      color: '#6C4AB6',
      textAlign: 'center',
      fontWeight: '500',
    },
    attendanceContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    attendanceButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: '#F8F6FF',
      marginHorizontal: 4,
    },
    attendanceButtonActive: {
      backgroundColor: '#6C4AB6',
    },
    attendanceButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#6C4AB6',
      marginLeft: 8,
    },
    attendanceButtonTextActive: {
      color: 'white',
    },
    attendanceReasonInput: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      padding: 16,
      backgroundColor: 'white',
      fontSize: 16,
    },
    sportsActivityItem: {
      backgroundColor: '#F8F6FF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    sportsActivityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    sportsActivityInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      padding: 12,
      backgroundColor: 'white',
      fontSize: 16,
    },
    removeButton: {
      marginLeft: 8,
    },
    sportsActivityDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sportsActivityField: {
      flex: 1,
      marginHorizontal: 4,
    },
    sportsActivityLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#6C4AB6',
      marginBottom: 8,
    },
    intensityButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    intensityButton: {
      flex: 1,
      padding: 8,
      borderRadius: 8,
      backgroundColor: '#F8F6FF',
      marginHorizontal: 2,
      alignItems: 'center',
    },
    intensityButtonActive: {
      backgroundColor: '#6C4AB6',
    },
    intensityButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#6C4AB6',
    },
    intensityButtonTextActive: {
      color: 'white',
    },
    sportsActivityNotes: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      padding: 12,
      backgroundColor: 'white',
      fontSize: 16,
      minHeight: 80,
      textAlignVertical: 'top',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Daily Activity Tracker</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <CalendarIcon />
            <Text style={[styles.dateText, { marginLeft: 8 }]}>{formatDate(selectedDate)}</Text>
          </View>
          
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            {['today', 'week', 'month'].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Today View */}
        {activeTab === 'today' && (
          <>
            {/* Quick Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <DropletsIcon />
                <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{todayData.water}</Text>
                <Text style={styles.statLabel}>glasses / 8 goal</Text>
              </View>
              
              <View style={styles.statCard}>
                <UtensilsIcon />
                <Text style={[styles.statNumber, { color: '#10B981' }]}>{todayData.meals.length}</Text>
                <Text style={styles.statLabel}>meals logged</Text>
              </View>
              
              <View style={styles.statCard}>
                <MoonIcon />
                <Text style={[styles.statNumber, { color: '#7C3AED' }]}>{todayData.sleep.duration}h</Text>
                <Text style={styles.statLabel}>last night</Text>
              </View>

              {/* Attendance Stat Card */}
              <View style={styles.statCard}>
                {todayData.attendance.status === 'present' && <CheckCircleIcon />}
                {todayData.attendance.status === 'late' && <TimeIcon />}
                {todayData.attendance.status === 'absent' && <CloseCircleIcon />}
                <Text style={[
                  styles.statNumber,
                  todayData.attendance.status === 'present' && { color: '#10B981' },
                  todayData.attendance.status === 'late' && { color: '#F59E0B' },
                  todayData.attendance.status === 'absent' && { color: '#EF4444' },
                ]}>
                  {todayData.attendance.status.charAt(0).toUpperCase() + todayData.attendance.status.slice(1)}
                </Text>
                <Text style={styles.statLabel}>attendance</Text>
              </View>

              {/* Sports Stat Card */}
              <View style={styles.statCard}>
                <SportsIcon />
                <Text style={[styles.statNumber, { color: '#8B5CF6' }]}>{todayData.sports.length}</Text>
                <Text style={styles.statLabel}>sports</Text>
              </View>
            </View>

            {/* Water Intake */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <DropletsIcon />
                  <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0 }]}>Water Intake</Text>
                </View>
                <View style={styles.waterControls}>
                  <TouchableOpacity
                    onPress={() => updateWater(-1)}
                    style={[styles.waterButton, { backgroundColor: '#FEE2E2' }]}
                  >
                    <MinusIcon />
                  </TouchableOpacity>
                  <Text style={styles.waterCount}>{todayData.water}</Text>
                  <TouchableOpacity
                    onPress={() => updateWater(1)}
                    style={[styles.waterButton, { backgroundColor: '#DBEAFE' }]}
                  >
                    <PlusIcon />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.waterGrid}>
                {[...Array(8)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waterGlass,
                      i < todayData.water ? styles.waterGlassFilled : styles.waterGlassEmpty
                    ]}
                  >
                    <Text style={{ color: i < todayData.water ? 'white' : '#6B7280' }}>
                      {i + 1}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Meals Section */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <UtensilsIcon />
                  <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0 }]}>Meals</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={addMeal}>
                  <Text style={styles.addButtonText}>Add Meal</Text>
                </TouchableOpacity>
              </View>
              
              {todayData.meals.map((meal, index) => (
                <View key={index} style={styles.mealItem}>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                  <TextInput
                    style={styles.mealInput}
                    value={meal.description}
                    onChangeText={(text) => updateMealDescription(index, text)}
                    placeholder="What did you eat?"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              ))}
            </View>

            {/* Attendance Section */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <CheckCircleIcon />
                <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0 }]}>Attendance</Text>
              </View>

              <View style={styles.attendanceContainer}>
                <TouchableOpacity
                  style={[
                    styles.attendanceButton,
                    todayData.attendance.status === 'present' && styles.attendanceButtonActive
                  ]}
                  onPress={() => handleAttendanceChange('present')}
                >
                  <CheckCircleIcon />
                  <Text style={[
                    styles.attendanceButtonText,
                    todayData.attendance.status === 'present' && styles.attendanceButtonTextActive
                  ]}>Present</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.attendanceButton,
                    todayData.attendance.status === 'late' && styles.attendanceButtonActive
                  ]}
                  onPress={() => handleAttendanceChange('late')}
                >
                  <TimeIcon />
                  <Text style={[
                    styles.attendanceButtonText,
                    todayData.attendance.status === 'late' && styles.attendanceButtonTextActive
                  ]}>Late</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.attendanceButton,
                    todayData.attendance.status === 'absent' && styles.attendanceButtonActive
                  ]}
                  onPress={() => handleAttendanceChange('absent')}
                >
                  <CloseCircleIcon />
                  <Text style={[
                    styles.attendanceButtonText,
                    todayData.attendance.status === 'absent' && styles.attendanceButtonTextActive
                  ]}>Absent</Text>
                </TouchableOpacity>
              </View>

              {todayData.attendance.status !== 'present' && (
                <TextInput
                  style={styles.attendanceReasonInput}
                  placeholder="Enter reason..."
                  value={todayData.attendance.reason}
                  onChangeText={(text) => handleAttendanceChange(todayData.attendance.status, text)}
                  placeholderTextColor="#9CA3AF"
                />
              )}
            </View>

            {/* Sports Section */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <SportsIcon />
                  <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0 }]}>Sports Activities</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={addSportsActivity}>
                  <Text style={styles.addButtonText}>Add Activity</Text>
                </TouchableOpacity>
              </View>

              {todayData.sports.map((activity, index) => (
                <View key={index} style={styles.sportsActivityItem}>
                  <View style={styles.sportsActivityHeader}>
                    <TextInput
                      style={styles.sportsActivityInput}
                      placeholder="Sport name"
                      value={activity.sport}
                      onChangeText={(text) => updateSportsActivity(index, 'sport', text)}
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeSportsActivity(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.sportsActivityDetails}>
                    <View style={styles.sportsActivityField}>
                      <Text style={styles.sportsActivityLabel}>Duration (minutes)</Text>
                      <TextInput
                        style={styles.sportsActivityInput}
                        keyboardType="numeric"
                        value={activity.duration.toString()}
                        onChangeText={(text) => updateSportsActivity(index, 'duration', parseInt(text) || 0)}
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>

                    <View style={styles.sportsActivityField}>
                      <Text style={styles.sportsActivityLabel}>Intensity</Text>
                      <View style={styles.intensityButtons}>
                        {(['low', 'medium', 'high'] as const).map((intensity) => (
                          <TouchableOpacity
                            key={intensity}
                            style={[
                              styles.intensityButton,
                              activity.intensity === intensity && styles.intensityButtonActive
                            ]}
                            onPress={() => updateSportsActivity(index, 'intensity', intensity)}
                          >
                            <Text style={[
                              styles.intensityButtonText,
                              activity.intensity === intensity && styles.intensityButtonTextActive
                            ]}>
                              {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <TextInput
                    style={styles.sportsActivityNotes}
                    placeholder="Add notes (optional)"
                    value={activity.notes}
                    onChangeText={(text) => updateSportsActivity(index, 'notes', text)}
                    placeholderTextColor="#9CA3AF"
                    multiline
                  />
                </View>
              ))}
            </View>

            {/* Sleep Section */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <MoonIcon />
                <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0 }]}>Sleep</Text>
              </View>
              
              <View style={styles.sleepInputContainer}>
                <View style={styles.sleepInputGroup}>
                  <Text style={styles.sleepLabel}>Bedtime</Text>
                  <TextInput
                    style={styles.sleepInput}
                    value={todayData.sleep.bedtime}
                    onChangeText={(text) => handleSleepChange('bedtime', text)}
                    placeholder="e.g., 22:00"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.sleepInputGroup}>
                  <Text style={styles.sleepLabel}>Wake-up</Text>
                  <TextInput
                    style={styles.sleepInput}
                    value={todayData.sleep.wakeup}
                    onChangeText={(text) => handleSleepChange('wakeup', text)}
                    placeholder="e.g., 07:00"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              
              {todayData.sleep.duration > 0 && (
              <View style={styles.sleepSummary}>
                <Text style={styles.sleepSummaryText}>Sleep Duration</Text>
                <Text style={styles.sleepDuration}>{todayData.sleep.duration} hours</Text>
              </View>
              )}
            </View>
          </>
        )}

        {/* Week View */}
        {activeTab === 'week' && (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <BarChart3Icon />
              <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0 }]}>Weekly Overview</Text>
            </View>
            
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Water Intake</Text>
              <VictoryChart
                width={screenWidth - 64}
                height={200}
                theme={VictoryTheme.material}
              >
                <VictoryBar
                  data={waterChartData}
                  style={{
                    data: {
                      fill: '#3B82F6',
                      width: 20,
                    },
                  }}
                  animate={{
                    duration: 500,
                    onLoad: { duration: 500 },
                  }}
                />
                <VictoryAxis 
                  tickFormat={(t) => weeklyData[t - 1]?.day || ''}
                  style={{
                    axis: { stroke: '#E5E7EB' },
                    ticks: { stroke: '#E5E7EB' },
                    tickLabels: { fill: '#6B7280', fontSize: 12 },
                  }}
                />
                <VictoryAxis 
                  dependentAxis
                  tickFormat={(t) => `${t}`}
                  style={{
                    axis: { stroke: '#E5E7EB' },
                    ticks: { stroke: '#E5E7EB' },
                    tickLabels: { fill: '#6B7280', fontSize: 12 },
                  }}
                />
              </VictoryChart>
            </View>
          </View>
        )}

        {/* Month View */}
        {activeTab === 'month' && (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TrendingUpIcon />
              <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0 }]}>Monthly Stats</Text>
            </View>

            <View style={styles.monthlyStatsContainer}>
              <View style={[styles.monthlyStatCard, { backgroundColor: '#F0E6FF' }]}>
                <Text style={styles.monthlyStatLabel}>Water Goal Achievement</Text>
                <Text style={styles.monthlyStatNumber}>{monthlyStats.waterGoalAchievement}%</Text>
              </View>
              <View style={[styles.monthlyStatCard, { backgroundColor: '#F0E6FF' }]}>
                <Text style={styles.monthlyStatLabel}>Current Streak</Text>
                <Text style={styles.monthlyStatNumber}>{monthlyStats.currentStreak} days</Text>
              </View>
              <View style={[styles.monthlyStatCard, { backgroundColor: '#F0E6FF' }]}>
                <Text style={styles.monthlyStatLabel}>Average Sleep</Text>
                <Text style={styles.monthlyStatNumber}>{monthlyStats.averageSleep.toFixed(1)}h</Text>
              </View>
              <View style={[styles.monthlyStatCard, { backgroundColor: '#F0E6FF' }]}>
                <Text style={styles.monthlyStatLabel}>Best Day</Text>
                <Text style={styles.monthlyStatNumber}>{monthlyStats.bestDay}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Ionicons name="save" size={24} color="white" />
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default EnhancedActivityTracker;