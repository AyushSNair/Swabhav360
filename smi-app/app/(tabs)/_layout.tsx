import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import Journey from './index';
import Leaderboard from './leaderboard';
import Tasks from './tasks';
import Badges from './badges';
import Profile from './profile';

import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export default function TabLayout() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: any;
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
            default:
              iconName = 'ellipse-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Journey"
        component={Journey}
        options={{
          title: 'Journey',
          tabBarLabel: 'Journey',
        }}
      />
      <Tab.Screen
        name="MyTasks"
        component={Tasks}
        options={{
          title: 'My Tasks',
          tabBarLabel: 'My Tasks',
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={Leaderboard}
        options={{
          title: 'Leaderboard',
          tabBarLabel: 'Leaderboard',
        }}
      />
      <Tab.Screen
        name="Badges"
        component={Badges}
        options={{
          title: 'Badges',
          tabBarLabel: 'Badges',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}