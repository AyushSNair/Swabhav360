import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from './app/screens/Login';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { View, ActivityIndicator, Text, StyleSheet, LogBox } from 'react-native';
import ProfileSetupScreen from './app/screens/profile-creation/ProfileSetupScreen';
import { QuestProvider } from './app/QuestContext';
import { LanguageProvider } from './contexts/LanguageContext';
const Stack = createNativeStackNavigator();
const InsideStack = createNativeStackNavigator();

// Import the tabs layout
import TabLayout from './app/(tabs)/_layout';

function InsideLayout() {
  console.log('InsideLayout - Rendering TabLayout');
  return <TabLayout />;
}

function AppContent() {
  const { user, hasProfile, loading } = useAuth();

  // Debug logging
  console.log('AppContent - Auth State:', { 
    hasUser: !!user, 
    hasProfile, 
    loading,
    userUid: user?.uid
  });

  // Show loading indicator while checking auth state
  if (loading) {
    console.log('AppContent - Showing loading indicator');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  // Log navigation state
  console.log('AppContent - Rendering navigation. Current state:', {
    isLoggedIn: !!user,
    hasProfile,
    showingScreen: !user ? 'Login' : !hasProfile ? 'ProfileSetup' : 'Inside'
  });

  console.log('AppContent - Rendering navigation. Current state:', {
    isLoggedIn: !!user,
    hasProfile,
    showingScreen: !user ? 'Login' : !hasProfile ? 'ProfileSetup' : 'Inside'
  });

  return (
    <NavigationContainer 
      onStateChange={(state) => {
        console.log('Navigation state changed:', state);
      }}
    >
      <Stack.Navigator>
        {!user ? (
          <Stack.Screen
            name="Login"
            component={Login}
            options={{ headerShown: false }}
          />
        ) : !hasProfile ? (
          <Stack.Screen
            name="ProfileSetup"
            component={ProfileSetupScreen}
            options={{
              header: () => (
                <View style={styles.headerContainer}>
                  <Text style={styles.headerTitle}>Complete Your Profile</Text>
                  <View style={styles.progressBar}>
                    <View style={styles.progressFill} />
                  </View>
                </View>
              ),
              headerBackVisible: false,
            }}
          />
        ) : (
          <Stack.Screen
            name="Inside"
            component={InsideLayout}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
      <Toast />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    width: '100%',
    backgroundColor: '#E5E7EB',
    marginTop: 12,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '60%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
});

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <QuestProvider>
          <AppContent />
        </QuestProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
