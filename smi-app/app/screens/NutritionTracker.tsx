import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, FlatList } from 'react-native';
import { VictoryChart, VictoryLine, VictoryTheme, VictoryAxis } from 'victory-native';

// Static food database (for demo)
const FOOD_DB = {
  'Apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  'Banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  'Rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  'Egg': { calories: 68, protein: 5.5, carbs: 0.6, fat: 4.8 },
  'Chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  'Milk': { calories: 42, protein: 3.4, carbs: 5, fat: 1 },
};

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

type Meal = {
  type: string;
  food: string;
  portion: number;
  time: string;
};

type GrowthLog = {
  date: string;
  value: number;
};

const NutritionTracker = () => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealType, setMealType] = useState('Breakfast');
  const [food, setFood] = useState('');
  const [portion, setPortion] = useState('');
  const [heightLogs, setHeightLogs] = useState<GrowthLog[]>([]);
  const [weightLogs, setWeightLogs] = useState<GrowthLog[]>([]);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // Add meal
  const addMeal = () => {
    if (!food || !portion) return;
    setMeals(prev => [...prev, { type: mealType, food, portion: parseFloat(portion), time: new Date().toLocaleTimeString() }]);
    setFood('');
    setPortion('');
  };

  // Nutrition calculation
  const nutritionTotals = meals.reduce((totals, meal) => {
    if (meal.food in FOOD_DB) {
      const foodInfo = FOOD_DB[meal.food as keyof typeof FOOD_DB];
      const multiplier = meal.portion / 100; // assume portion is in grams
      totals.calories += foodInfo.calories * multiplier;
      totals.protein += foodInfo.protein * multiplier;
      totals.carbs += foodInfo.carbs * multiplier;
      totals.fat += foodInfo.fat * multiplier;
    }
    return totals;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Add height/weight log
  const addGrowthLog = () => {
    if (!height || !weight) return;
    setHeightLogs(prev => [...prev, { date: new Date().toLocaleDateString(), value: parseFloat(height) }]);
    setWeightLogs(prev => [...prev, { date: new Date().toLocaleDateString(), value: parseFloat(weight) }]);
    setHeight('');
    setWeight('');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Nutrition Tracker</Text>

      {/* Meal Logging */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Log a Meal</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Type:</Text>
          <FlatList
            data={MEAL_TYPES}
            horizontal
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.mealTypeButton, mealType === item && styles.mealTypeButtonActive]}
                onPress={() => setMealType(item)}
              >
                <Text style={mealType === item ? styles.mealTypeTextActive : styles.mealTypeText}>{item}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={item => item}
            showsHorizontalScrollIndicator={false}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Food (e.g., Apple)"
          value={food}
          onChangeText={setFood}
        />
        <TextInput
          style={styles.input}
          placeholder="Portion (grams)"
          value={portion}
          onChangeText={setPortion}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.addButton} onPress={addMeal}>
          <Text style={styles.addButtonText}>Add Meal</Text>
        </TouchableOpacity>
        {meals.length > 0 && (
          <View style={{ marginTop: 12 }}>
            {meals.map((meal, idx) => (
              <View key={idx} style={styles.mealItem}>
                <Text style={styles.mealText}>{meal.type}: {meal.food} ({meal.portion}g) at {meal.time}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Nutrition Summary */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nutrition Summary</Text>
        <Text style={styles.nutritionText}>Calories: {nutritionTotals.calories.toFixed(0)} kcal</Text>
        <Text style={styles.nutritionText}>Protein: {nutritionTotals.protein.toFixed(1)} g</Text>
        <Text style={styles.nutritionText}>Carbs: {nutritionTotals.carbs.toFixed(1)} g</Text>
        <Text style={styles.nutritionText}>Fat: {nutritionTotals.fat.toFixed(1)} g</Text>
      </View>

      {/* Growth Chart */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Growth Chart</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="Height (cm)"
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]} 
            placeholder="Weight (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.addButton} onPress={addGrowthLog}>
            <Text style={styles.addButtonText}>Log</Text>
          </TouchableOpacity>
        </View>
        {(heightLogs.length > 0 || weightLogs.length > 0) && (
          <VictoryChart theme={VictoryTheme.material} domainPadding={10} height={220}>
            <VictoryAxis dependentAxis tickFormat={(x) => `${x}`} />
            <VictoryAxis tickFormat={(x) => x} />
            {heightLogs.length > 0 && (
              <VictoryLine
                data={heightLogs}
                x="date"
                y="value"
                style={{ data: { stroke: '#4F46E5', strokeWidth: 2 } }}
              />
            )}
            {weightLogs.length > 0 && (
              <VictoryLine
                data={weightLogs}
                x="date"
                y="value"
                style={{ data: { stroke: '#F59E42', strokeWidth: 2 } }}
              />
            )}
          </VictoryChart>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F6FF', padding: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#6C4AB6', marginBottom: 16, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#6C4AB6', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 16, color: '#6C4AB6', marginRight: 8 },
  mealTypeButton: { padding: 8, borderRadius: 8, backgroundColor: '#F3F4F6', marginRight: 8 },
  mealTypeButtonActive: { backgroundColor: '#6C4AB6' },
  mealTypeText: { color: '#6C4AB6', fontWeight: '600' },
  mealTypeTextActive: { color: '#fff', fontWeight: '700' },
  input: { backgroundColor: '#f8f6ff', borderRadius: 12, padding: 12, fontSize: 16, color: '#333', marginBottom: 8 },
  addButton: { padding: 12, borderRadius: 12, backgroundColor: '#6C4AB6', alignItems: 'center', marginLeft: 8 },
  addButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  mealItem: { backgroundColor: '#F8F6FF', borderRadius: 12, padding: 10, marginBottom: 6 },
  mealText: { fontSize: 15, color: '#333' },
  nutritionText: { fontSize: 16, color: '#6C4AB6', marginBottom: 4 },
});

export default NutritionTracker; 