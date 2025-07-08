import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import JourneyScreen from './screens/JourneyScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import TasksScreen from './screens/tasks';
import BadgesScreen from './screens/badges';
import ProfileScreen from './screens/profile';

const Tab = createBottomTabNavigator();

export default function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: any = 'ellipse-outline';
          switch (route.name) {
            case 'Journey':
              iconName = 'compass-outline';
              break;
            case 'MyTasks':
              iconName = 'checkmark-done-circle-outline';
              break;
            case 'Leaderboard':
              iconName = 'trophy-outline';
              break;
            case 'Badges':
              iconName = 'ribbon-outline';
              break;
            case 'Profile':
              iconName = 'person-outline';
              break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Journey" component={JourneyScreen} />
      <Tab.Screen name="MyTasks" component={TasksScreen} options={{ title: 'My Tasks' }} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Badges" component={BadgesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
} 