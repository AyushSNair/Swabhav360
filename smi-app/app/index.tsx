import { Redirect } from 'expo-router';
import { View, Text } from 'react-native';

// This is a minimal test component to help debug the blank screen issue
export default function Index() {
  console.log('Root index.tsx - Rendering');
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>App is loading...</Text>
    </View>
  );
}