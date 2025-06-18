import React from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Dimensions, ImageBackground } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { FIREBASE_AUTH } from '../../FirebaseConfig';

interface RouterProps {
  navigation: NavigationProp<any, any>;
}

const CARD_DATA = [
  {
    key: 'details',
    title: 'Activity Details',
    subtitle: 'View/Enter your activity',
    color: '#F8BBD0',
    icon: '📅',
    onPress: (navigation: any) => navigation.navigate('Attendance details'),
  },
  {
    key: 'mood',
    title: 'Track Mood',
    subtitle: 'Log your mood',
    color: '#CE93D8',
    icon: '😊',
    onPress: (navigation: any) => navigation.navigate('MoodTracker'),
  },
  {
    key: 'nutrition',
    title: 'Nutrition Tracker',
    subtitle: 'Log meals & growth',
    color: '#FFD180',
    icon: '🍎',
    onPress: (navigation: any) => navigation.navigate('NutritionTracker'),
  },
  {
    key: 'sports',
    title: 'Sports Performance',
    subtitle: 'Track skills & progress',
    color: '#B2DFDB',
    icon: '🏃‍♂️',
    onPress: (navigation: any) => navigation.navigate('SportsPerformance'),
  },
];

const numColumns = 2;
const cardWidth = (Dimensions.get('window').width - 48) / numColumns;

const List = ({ navigation }: RouterProps) => {
  const renderItem = ({ item }: any) => (
    <Pressable
      style={[styles.card, { backgroundColor: item.color, width: cardWidth }]}
      onPress={() => item.onPress(navigation)}
      android_ripple={{ color: '#ececec' }}
    >
      <Text style={styles.cardIcon}>{item.icon}</Text>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
    </Pressable>
  );

  return (
    <ImageBackground
      source={require('../../assets/bg-rw.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Activity List</Text>
      </View>
      <FlatList
        data={CARD_DATA}
        renderItem={renderItem}
        keyExtractor={item => item.key}
        numColumns={numColumns}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />
      <Pressable style={styles.logoutButton} onPress={() => FIREBASE_AUTH.signOut()}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 32,
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4B2996',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 18,
    margin: 12,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    minWidth: 280,
    maxWidth: 400,
    flex: 1,
  },
  cardIcon: {
    fontSize: 44,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#444',
    textAlign: 'center',
    opacity: 0.85,
  },
  logoutButton: {
    backgroundColor: '#b71c1c',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 48,
    marginBottom: 36,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default List;
