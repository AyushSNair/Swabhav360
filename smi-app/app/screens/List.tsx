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
    color: '#b39ddb',
    icon: '📅',
    onPress: (navigation: any) => navigation.navigate('Attendance details'),
  },
  {
    key: 'mood',
    title: 'Track Mood',
    subtitle: 'Log your mood',
    color: '#81d4fa',
    icon: '😊',
    onPress: (navigation: any) => navigation.navigate('MoodTracker'),
  },
];

const numColumns = 2;
const cardWidth = (Dimensions.get('window').width - 48) / numColumns;

const List = ({ navigation }: RouterProps) => {
  const renderItem = ({ item }: any) => (
    <Pressable
      style={[styles.card, { backgroundColor: item.color, width: cardWidth }]}
      onPress={() => item.onPress(navigation)}
    >
      <Text style={styles.cardIcon}>{item.icon}</Text>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
    </Pressable>
  );

  return (
    <ImageBackground
      source={require('../../assets/bg-rw.jpg')}
      style={styles.container}
      resizeMode="cover"
    >
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
  container: {
    flex: 1,
    paddingTop: 32,
  },
  grid: {
    paddingHorizontal: 12,
    paddingBottom: 80,
  },
  card: {
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 10,
    margin: 8,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  cardIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#444',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#b71c1c',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 32,
    marginBottom: 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default List;
