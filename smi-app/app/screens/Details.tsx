import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Dimensions, Alert, TextStyle, ViewStyle } from 'react-native';
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

interface TodayData {
  water: number;
  meals: Meal[];
  sleep: Sleep;
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

// Icon Components (simplified for React Native)
const CalendarIcon = () => <Text style={{ fontSize: 16 }}>📅</Text>;
const TrendingUpIcon = () => <Text style={{ fontSize: 16 }}>📈</Text>;
const DropletsIcon = () => <Text style={{ fontSize: 16 }}>💧</Text>;
const UtensilsIcon = () => <Text style={{ fontSize: 16 }}>🍽️</Text>;
const MoonIcon = () => <Text style={{ fontSize: 16 }}>🌙</Text>;
const PlusIcon = () => <Text style={{ fontSize: 16, color: 'white' }}>+</Text>;
const MinusIcon = () => <Text style={{ fontSize: 16, color: 'white' }}>-</Text>;
const BarChart3Icon = () => <Text style={{ fontSize: 16 }}>📊</Text>;
const ActivityIcon = () => <Text style={{ fontSize: 16 }}>⚡</Text>;

const EnhancedActivityTracker: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month'>('today');
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
    sleep: { bedtime: '', wakeup: '', duration: 0 }
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

      // Calculate water goal achievement as average intake percentage
      const totalWater = data.reduce((sum, day) => sum + (day.waterIntake || 0), 0);
      const avgWater = totalWater / data.length;
      let waterGoalAchievement = Math.round((avgWater / 8) * 100);
      if (waterGoalAchievement > 100) waterGoalAchievement = 100;

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

      const response = await fetch(`http://192.168.7.10:3000/daily-activity?uid=${user.uid}`);
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
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const dataToSend = {
        uid: user.uid,
        waterIntake: todayData.water,
        meals: todayData.meals,
        sleepTime: todayData.sleep.bedtime,
        wakeTime: todayData.sleep.wakeup,
        sleepDuration: todayData.sleep.duration,
        date: selectedDate.toISOString().split('T')[0],
      };

      console.log('Sending data:', dataToSend);

      const response = await fetch('http://192.168.7.10:3000/daily-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.error || 'Failed to save data');
      }

      const data = await response.json();
      console.log('Data saved successfully:', data);
      
      // Refresh the activities list after saving
      await fetchDailyActivities();
      
      Alert.alert('Success', data.message || 'Activity saved successfully!');
    } catch (error) {
      console.error('Error saving data:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save data. Please try again.');
    }
  };

  // Prepare chart data for Victory
  const waterChartData = weeklyData.map((d, index) => ({ x: index + 1, y: d.water, label: d.day }));
  const mealsChartData = weeklyData.map((d, index) => ({ x: index + 1, y: d.meals, label: d.day }));
  const sleepChartData = weeklyData.map((d, index) => ({ x: index + 1, y: d.sleep, label: d.day }));

  const progressPieData = [
    { x: 'Goals Met', y: 0 },
    { x: 'Missed', y: 0 }
  ];

  const styles = {
    container: {
      flex: 1,
      backgroundColor: '#F9FAFB',
    } as ViewStyle,
    scrollContainer: {
      paddingBottom: 100,
    } as ViewStyle,
    header: {
      backgroundColor: 'white',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
      padding: 24,
      margin: 16,
      marginBottom: 24,
    } as ViewStyle,
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      color: '#1F2937',
      marginBottom: 16,
    } as TextStyle,
    dateText: {
      fontSize: 14,
      color: '#6B7280',
      textAlign: 'center' as const,
    } as TextStyle,
    tabContainer: {
      flexDirection: 'row' as const,
      backgroundColor: '#F3F4F6',
      borderRadius: 12,
      padding: 4,
    } as ViewStyle,
    tab: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center' as const,
    } as ViewStyle,
    activeTab: {
      backgroundColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    } as ViewStyle,
    tabText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: '#6B7280',
    } as TextStyle,
    activeTabText: {
      color: '#2563EB',
    } as TextStyle,
    card: {
      backgroundColor: 'white',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
      padding: 24,
      margin: 16,
    } as ViewStyle,
    cardTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: '#1F2937',
      marginBottom: 16,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    } as TextStyle,
    statsGrid: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between',
      marginHorizontal: 16,
      marginBottom: 24,
    } as ViewStyle,
    statCard: {
      backgroundColor: 'white',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
      padding: 16,
      flex: 1,
      marginHorizontal: 4,
    } as ViewStyle,
    statNumber: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      textAlign: 'center' as const,
      marginBottom: 4,
    } as TextStyle,
    statLabel: {
      fontSize: 12,
      color: '#6B7280',
      textAlign: 'center' as const,
    } as TextStyle,
    waterControls: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginVertical: 16,
    } as ViewStyle,
    waterButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginHorizontal: 16,
    } as ViewStyle,
    waterCount: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      color: '#2563EB',
      minWidth: 48,
      textAlign: 'center' as const,
    } as TextStyle,
    waterGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'space-between',
      marginTop: 16,
    } as ViewStyle,
    waterGlass: {
      width: '11%',
      aspectRatio: 1,
      borderRadius: 8,
      borderWidth: 2,
      marginBottom: 8,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    } as ViewStyle,
    waterGlassFilled: {
      backgroundColor: '#3B82F6',
      borderColor: '#3B82F6',
    } as ViewStyle,
    waterGlassEmpty: {
      backgroundColor: '#F9FAFB',
      borderColor: '#E5E7EB',
    } as ViewStyle,
    mealItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    } as ViewStyle,
    mealTime: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: '#6B7280',
      minWidth: 80,
    } as TextStyle,
    mealInput: {
      flex: 1,
      marginLeft: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 6,
      backgroundColor: 'white',
    } as ViewStyle,
    addButton: {
      backgroundColor: '#10B981',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      alignSelf: 'flex-end' as const,
    } as ViewStyle,
    addButtonText: {
      color: 'white',
      fontWeight: '500' as const,
    } as TextStyle,
    sleepInputContainer: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between',
      marginBottom: 16,
    } as ViewStyle,
    sleepInputGroup: {
      flex: 1,
      marginHorizontal: 8,
    } as ViewStyle,
    sleepLabel: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: '#374151',
      marginBottom: 8,
    } as TextStyle,
    sleepInput: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 6,
      padding: 12,
      backgroundColor: 'white',
    } as ViewStyle,
    sleepSummary: {
      backgroundColor: '#F3E8FF',
      borderRadius: 8,
      padding: 16,
      flexDirection: 'row' as const,
      justifyContent: 'space-between',
      alignItems: 'center' as const,
    } as ViewStyle,
    sleepSummaryText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: '#7C3AED',
    } as TextStyle,
    sleepDuration: {
      fontSize: 18,
      fontWeight: 'bold' as const,
      color: '#7C3AED',
    } as TextStyle,
    saveButton: {
      position: 'absolute' as const,
      bottom: 24,
      right: 24,
      backgroundColor: '#3B82F6',
      borderRadius: 28,
      paddingHorizontal: 24,
      paddingVertical: 12,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
    } as ViewStyle,
    saveButtonText: {
      color: 'white',
      fontWeight: '600' as const,
      marginLeft: 8,
    } as TextStyle,
    chartContainer: {
      alignItems: 'center' as const,
      marginVertical: 16,
    } as ViewStyle,
    chartTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      marginBottom: 8,
      textAlign: 'center' as const,
    } as TextStyle,
    weeklyStatsContainer: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between',
      marginTop: 16,
    } as ViewStyle,
    weeklyStatCard: {
      flex: 1,
      padding: 16,
      borderRadius: 8,
      marginHorizontal: 4,
      alignItems: 'center' as const,
    } as ViewStyle,
    weeklyStatNumber: {
      fontSize: 20,
      fontWeight: 'bold' as const,
      marginBottom: 4,
    } as TextStyle,
    weeklyStatLabel: {
      fontSize: 12,
      textAlign: 'center' as const,
    } as TextStyle,
    monthlyStatsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
    } as ViewStyle,
    monthlyStatCard: {
      width: '48%',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 12,
    } as ViewStyle,
    monthlyStatNumber: {
      fontSize: 20,
      fontWeight: 'bold',
      marginVertical: 8,
    } as TextStyle,
    monthlyStatLabel: {
      fontSize: 12,
      textAlign: 'center',
    } as TextStyle,
  };

  const tabBackgrounds = {
    today: '#e3f6fd',
    week: '#f9fbe7',
    month: '#ede7f6',
  };

  return (
    <View style={[styles.container, { backgroundColor: tabBackgrounds[activeTab] }]}>
      <ScrollView style={styles.scrollContainer}>
        {/* Header */}
        <View style={[styles.header, {backgroundColor: '#E9967A'}]}>
          <Text style={styles.headerTitle}>Daily Activity Tracker</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <CalendarIcon />
            <Text style={[styles.dateText,{color: '#fff'}, { marginLeft: 8 }]}>{formatDate(selectedDate)}</Text>
          </View>
          
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            {['today', 'week', 'month'].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab as 'today' | 'week' | 'month')}
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
            <View style={[styles.statCard, {backgroundColor: '#fadbd8'}]}>
                <DropletsIcon />
                <Text style={[styles.statNumber, { color: '#2563EB' }]}>{todayData.water}</Text>
                <Text style={styles.statLabel}>glasses / 8 goal</Text>
              </View>
              
              <View style={[styles.statCard, {backgroundColor: '#fcf3cf'}]}>
                <UtensilsIcon />
                <Text style={[styles.statNumber, { color: '#10B981' }]}>{todayData.meals.length}</Text>
                <Text style={styles.statLabel}>meals logged</Text>
              </View>
              
              <View style={[styles.statCard, {backgroundColor: '#d6eaf8'}]}>
                <MoonIcon />
                <Text style={[styles.statNumber, { color: '#7C3AED' }]}>{todayData.sleep.duration}h</Text>
                <Text style={styles.statLabel}>last night</Text>
              </View>
            </View>

            {/* Water Intake */}
            <View style={[styles.card, { backgroundColor: '#ebdef0' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <DropletsIcon />
                  <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0 }]}>Water Intake</Text>
                </View>
                <View style={styles.waterControls}>
                  <TouchableOpacity
                    onPress={() => updateWater(-1)}
                    style={[styles.waterButton, { backgroundColor: '#85c1e9' }]}
                  >
                    <MinusIcon />
                  </TouchableOpacity>
                  <Text style={styles.waterCount}>{todayData.water}</Text>
                  <TouchableOpacity
                    onPress={() => updateWater(1)}
                    style={[styles.waterButton, { backgroundColor: '#85c1e9' }]}
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
                    <DropletsIcon />
                  </View>
                ))}
              </View>
            </View>

            {/* Meal Tracking */}
            <View style={[styles.card, { backgroundColor: '#fcf3cf' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <UtensilsIcon />
                  <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0 }]}>Meals</Text>
                </View>
                <TouchableOpacity onPress={addMeal} style={styles.addButton}>
                  <Text style={styles.addButtonText}>Add Meal</Text>
                </TouchableOpacity>
              </View>
              
              {todayData.meals.map((meal, index) => (
                <View key={index} style={styles.mealItem}>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                  <TextInput
                    value={meal.description}
                    onChangeText={(text) => updateMealDescription(index, text)}
                    placeholder="Meal description..."
                    style={styles.mealInput}
                  />
                </View>
              ))}
              
              {todayData.meals.length === 0 && (
                <Text style={{ textAlign: 'center', color: '#6B7280', paddingVertical: 32 }}>
                  No meals logged yet. Add your first meal!
                </Text>
              )}
            </View>

            {/* Sleep Pattern */}
            <View style={[styles.card, { backgroundColor: '#d6eaf8' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <MoonIcon />
                <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0 }]}>Sleep Pattern</Text>
              </View>
              
              <View style={styles.sleepInputContainer}>
                <View style={styles.sleepInputGroup}>
                  <Text style={styles.sleepLabel}>Bedtime</Text>
                  <TextInput
                    value={todayData.sleep.bedtime}
                    onChangeText={(value) => handleSleepChange('bedtime', value)}
                    placeholder="22:00"
                    style={styles.sleepInput}
                  />
                </View>
                <View style={styles.sleepInputGroup}>
                  <Text style={styles.sleepLabel}>Wake up time</Text>
                  <TextInput
                    value={todayData.sleep.wakeup}
                    onChangeText={(value) => handleSleepChange('wakeup', value)}
                    placeholder="06:00"
                    style={styles.sleepInput}
                  />
                </View>
              </View>
              
              <TouchableOpacity 
                onPress={handleSleepSubmit} 
                style={[styles.addButton, { marginBottom: 16 }]}
              >
                <Text style={styles.addButtonText}>Update Sleep Duration</Text>
              </TouchableOpacity>
              
              <View style={styles.sleepSummary}>
                <Text style={styles.sleepSummaryText}>Sleep Duration</Text>
                <Text style={styles.sleepDuration}>{todayData.sleep.duration} hours</Text>
              </View>
            </View>
          </>
        )}

        {/* Week View */}
        {activeTab === 'week' && (
          <View style={[styles.card, { backgroundColor: '#fffde7' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
              <BarChart3Icon />
              <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0 }]}>Weekly Overview</Text>
            </View>
            
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Water Intake (Glasses)</Text>
              <VictoryChart
                theme={VictoryTheme.material}
                width={screenWidth - 80}
                height={200}
                domainPadding={20}
                padding={{ left: 50, top: 20, right: 20, bottom: 50 }}
              >
                <VictoryAxis 
                  dependentAxis
                  tickFormat={(t: number) => `${t}`}
                  style={{
                    tickLabels: { fontSize: 12, fill: '#6B7280' },
                    grid: { stroke: '#E5E7EB', strokeWidth: 1 }
                  }}
                />
                <VictoryAxis 
                  tickFormat={weeklyData.map(d => d.day)}
                  style={{
                    tickLabels: { fontSize: 12, fill: '#6B7280' }
                  }}
                />
                <VictoryBar
                  data={waterChartData}
                  style={{
                    data: { fill: '#3B82F6' }
                  }}
                  labelComponent={<VictoryLabel dy={-10} style={{ fontSize: 12, fill: '#374151' }} />}
                />
              </VictoryChart>
            </View>

            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Daily Meals</Text>
              <VictoryChart
                theme={VictoryTheme.material}
                width={screenWidth - 80}
                height={200}
                domainPadding={20}
                padding={{ left: 50, top: 20, right: 20, bottom: 50 }}
              >
                <VictoryAxis 
                  dependentAxis
                  tickFormat={(t: number) => `${t}`}
                  style={{
                    tickLabels: { fontSize: 12, fill: '#6B7280' },
                    grid: { stroke: '#E5E7EB', strokeWidth: 1 }
                  }}
                />
                <VictoryAxis 
                  tickFormat={weeklyData.map(d => d.day)}
                  style={{
                    tickLabels: { fontSize: 12, fill: '#6B7280' }
                  }}
                />
                <VictoryBar
                  data={mealsChartData}
                  style={{
                    data: { fill: '#10B981' }
                  }}
                  labelComponent={<VictoryLabel dy={-10} style={{ fontSize: 12, fill: '#374151' }} />}
                />
              </VictoryChart>
            </View>

            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Sleep Hours</Text>
              <VictoryChart
                theme={VictoryTheme.material}
                width={screenWidth - 80}
                height={200}
                padding={{ left: 50, top: 20, right: 20, bottom: 50 }}
              >
                <VictoryAxis 
                  dependentAxis
                  tickFormat={(t: any) => `${t}h`}
                  style={{
                    tickLabels: { fontSize: 12, fill: '#6B7280' },
                    grid: { stroke: '#E5E7EB', strokeWidth: 1 }
                  }}
                />
                <VictoryAxis 
                  tickFormat={weeklyData.map(d => d.day)}
                  style={{
                    tickLabels: { fontSize: 12, fill: '#6B7280' }
                  }}
                />
                <VictoryLine
                  data={sleepChartData}
                  style={{
                    data: { stroke: '#7C3AED', strokeWidth: 3 }
                  }}
                  animate={{
                    duration: 1000,
                    onLoad: { duration: 500 }
                  }}
                />
              </VictoryChart>
            </View>

            <View style={styles.weeklyStatsContainer}>
              <View style={[styles.weeklyStatCard, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.weeklyStatNumber, { color: '#2563EB' }]}>
                  {weeklyData.reduce((sum, day) => sum + day.water, 0)}
                </Text>
                <Text style={[styles.weeklyStatLabel, { color: '#1D4ED8' }]}>Total Glasses</Text>
              </View>
              <View style={[styles.weeklyStatCard, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[styles.weeklyStatNumber, { color: '#10B981' }]}>
                  {weeklyData.reduce((sum, day) => sum + day.meals, 0)}
                </Text>
                <Text style={[styles.weeklyStatLabel, { color: '#059669' }]}>Total Meals</Text>
              </View>
              <View style={[styles.weeklyStatCard, { backgroundColor: '#F3E8FF' }]}>
                <Text style={[styles.weeklyStatNumber, { color: '#7C3AED' }]}>
                  {(weeklyData.reduce((sum, day) => sum + day.sleep, 0) / 7).toFixed(1)}h
                </Text>
                <Text style={[styles.weeklyStatLabel, { color: '#6D28D9' }]}>Avg Sleep</Text>
              </View>
            </View>
          </View>
        )}

        {/* Monthly View */}
        {activeTab === 'month' && (
          <View style={[styles.card, { backgroundColor: '#f3e5f5' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
              <TrendingUpIcon />
              <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0 }]}>Monthly Progress</Text>
            </View>

            <View style={styles.monthlyStatsContainer}>
              {/* Water Goal Achievement */}
              <View style={[styles.monthlyStatCard, { backgroundColor: '#EFF6FF' }]}>
                <Text style={{ fontSize: 24 }}>💧</Text>
                <Text style={[styles.monthlyStatNumber, { color: '#2563EB' }]}>
                  {monthlyStats.waterGoalAchievement}%
                </Text>
                <Text style={[styles.monthlyStatLabel, { color: '#1D4ED8' }]}>Water Goal Achievement</Text>
              </View>

              {/* Current Streak */}
              <View style={[styles.monthlyStatCard, { backgroundColor: '#FEF3C7' }]}>
                <Text style={{ fontSize: 24 }}>🔥</Text>
                <Text style={[styles.monthlyStatNumber, { color: '#D97706' }]}>
                  {monthlyStats.currentStreak}
                </Text>
                <Text style={[styles.monthlyStatLabel, { color: '#B45309' }]}>Current Streak</Text>
              </View>

              {/* Average Sleep */}
              <View style={[styles.monthlyStatCard, { backgroundColor: '#F3E8FF' }]}>
                <Text style={{ fontSize: 24 }}>🌙</Text>
                <Text style={[styles.monthlyStatNumber, { color: '#7C3AED' }]}>
                  {monthlyStats.averageSleep > 0
                    ? `${Math.floor(monthlyStats.averageSleep)}h ${Math.round((monthlyStats.averageSleep % 1) * 60)}m`
                    : '0h'}
                </Text>
                <Text style={[styles.monthlyStatLabel, { color: '#6D28D9' }]}>Avg Sleep</Text>
              </View>

              {/* Best Day */}
              <View style={[styles.monthlyStatCard, { backgroundColor: '#ECFDF5' }]}>
                <Text style={{ fontSize: 24 }}>🏆</Text>
                <Text style={[styles.monthlyStatNumber, { color: '#10B981' }]}>
                  {monthlyStats.bestDay}
                </Text>
                <Text style={[styles.monthlyStatLabel, { color: '#059669' }]}>Best Day</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
      <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
        <ActivityIcon />
        <Text style={styles.saveButtonText}>Save Activity</Text>
      </TouchableOpacity>
    </View>
  );
}

export default EnhancedActivityTracker;