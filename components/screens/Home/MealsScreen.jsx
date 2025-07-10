import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MealsScreen() {
  // Dummy meal data
  const meals = [
    { id: '1', name: 'Breakfast - Oatmeal & Banana', calories: 350 },
    { id: '2', name: 'Lunch - Grilled Chicken & Rice', calories: 550 },
    { id: '3', name: 'Snack - Apple', calories: 95 },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Today's Meals</Text>

      <ScrollView style={styles.mealList}>
        {meals.map((meal) => (
          <View key={meal.id} style={styles.mealCard}>
            <Text style={styles.mealName}>{meal.name}</Text>
            <Text style={styles.calories}>{meal.calories} kcal</Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Meal</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#14532d',
    marginBottom: 16,
  },
  mealList: {
    flex: 1,
    marginBottom: 80,
  },
  mealCard: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    fontSize: 16,
    color: '#111827',
  },
  calories: {
    fontSize: 14,
    color: '#6b7280',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#22c55e',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});
