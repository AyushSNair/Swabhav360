import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from './app/screens/Login';
import List from './app/screens/List';
import Details from './app/screens/Details';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { FIREBASE_AUTH } from './FirebaseConfig';
import MoodTracker from './app/screens/MoodTracker';
import Toast from 'react-native-toast-message';
import NutritionTracker from './app/screens/NutritionTracker';
import SportsPerformance from './app/screens/SportsPerformance';
const Stack = createNativeStackNavigator();
const InsideStack = createNativeStackNavigator();

function InsideLayout() {
  return (
    <InsideStack.Navigator>
      <InsideStack.Screen name="Activity List" component={List} />
      <InsideStack.Screen name="Attendance details" component={Details} />
      <InsideStack.Screen name="MoodTracker" component={MoodTracker} />
      <InsideStack.Screen name="NutritionTracker" component={NutritionTracker} />
      <InsideStack.Screen name="SportsPerformance" component={SportsPerformance} />
    </InsideStack.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, (user) => {
      console.log('user', user);
      setUser(user);
    });

    return unsubscribe; // cleanup on unmount
  }, []);

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          {user ? (
            <Stack.Screen
              name="Inside"
              component={InsideLayout}
              options={{ headerShown: false }}
            />
          ) : (
            <Stack.Screen
              name="Login"
              component={Login}
              options={{ headerShown: false }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </>
  );
}
