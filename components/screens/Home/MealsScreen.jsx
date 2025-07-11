import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { auth, db } from '../../../config/firebase-config';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';

export default function MealsScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('Breakfast');
  const [userMeals, setUserMeals] = useState([]);
  const [synced, setSynced] = useState(false);

  const defaultMeals = {
    Breakfast: [],
    Lunch: [],
    Dinner: [],
  };

  const loadLocalMeals = async () => {
    try {
      const key = `loggedMeals_${activeTab}`;
      const stored = await AsyncStorage.getItem(key);
      const meals = stored ? JSON.parse(stored) : [];

      const filtered = meals.filter(m => m.image && m.name && m.id);
      const uniqueMeals = Object.values(
        filtered.reduce((acc, meal) => {
          acc[meal.id] = meal;
          return acc;
        }, {})
      );
      setUserMeals(uniqueMeals);
    } catch (error) {
      console.error('Failed to load user meals:', error);
    }
  };

  const syncWithFirebase = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userMealsRef = collection(db, 'users', user.uid, 'meals');
      const snapshot = await getDocs(query(userMealsRef, where('mealType', '==', activeTab)));

      const syncedMeals = snapshot.docs.map((doc) => doc.data());

      const uniqueSynced = Object.values(
        syncedMeals.reduce((acc, meal) => {
          acc[meal.id] = meal;
          return acc;
        }, {})
      );

      setUserMeals(uniqueSynced);
      setSynced(true); // ✅ disable button
    } catch (err) {
      console.error('Sync error:', err);
      Alert.alert('Error', 'Failed to sync with database.');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadLocalMeals();
      setSynced(false); // ✅ re-enable sync when changing tabs
    }, [activeTab])
  );

  const handleEditMeal = (meal) => {
    navigation.navigate('LogFoodModal', { mealToEdit: meal, mealType: activeTab });
  };

  const handleDeleteMeal = async (meal) => {
    try {
      const key = `loggedMeals_${activeTab}`;
      const stored = await AsyncStorage.getItem(key);
      const meals = stored ? JSON.parse(stored) : [];
      const filtered = meals.filter((m) => m.id !== meal.id);
      await AsyncStorage.setItem(key, JSON.stringify(filtered));

      if (auth.currentUser) {
        const userMealsRef = collection(db, 'users', auth.currentUser.uid, 'meals');
        const q = query(userMealsRef, where('id', '==', meal.id));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (docSnap) => {
          await deleteDoc(docSnap.ref);
        });
      }

      Alert.alert('Deleted', `${meal.name} has been removed.`);
      synced ? syncWithFirebase() : loadLocalMeals(); // auto refresh view
    } catch (err) {
      console.error('Delete Error:', err);
      Alert.alert('Error', 'Failed to delete meal.');
    }
  };

  const combinedMeals = [...defaultMeals[activeTab], ...userMeals];
  const totalKcal = combinedMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const tabs = Object.keys(defaultMeals);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🍽 {activeTab}</Text>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Meals */}
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {combinedMeals.map((meal) => (
          <View key={meal.id} style={styles.card}>
            <Image source={{ uri: meal.image }} style={styles.image} />
            <View style={styles.cardContent}>
              <Text style={styles.mealName}>{meal.name}</Text>
              <Text style={styles.description}>{meal.recipe || meal.description}</Text>
              <Text style={styles.kcal}>{meal.calories} kcal</Text>
              <View style={styles.macros}>
                <Text style={styles.macroText}>Carbs: {meal.macros?.carbs || 0}g</Text>
                <Text style={styles.macroText}>Protein: {meal.macros?.protein || 0}g</Text>
                <Text style={styles.macroText}>Fat: {meal.macros?.fat || 0}g</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                <TouchableOpacity onPress={() => handleEditMeal(meal)}>
                  <Ionicons name="create-outline" size={20} color="#22c55e" style={{ marginRight: 16 }} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteMeal(meal)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
        <Text style={styles.totalCalories}>Total: {totalKcal} kcal</Text>
      </ScrollView>

      {/* Log Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate('LogFoodModal')}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.floatingText}>Log Food</Text>
      </TouchableOpacity>

      {/* Sync Button */}
      <TouchableOpacity
        style={[styles.syncButton, synced && styles.syncDisabled]}
        onPress={!synced ? syncWithFirebase : null}
        disabled={synced}
      >
        <Ionicons name="cloud-upload-outline" size={20} color={synced ? '#9ca3af' : '#14532d'} />
        <Text style={[styles.syncText, synced && { color: '#9ca3af' }]}>
          {synced ? 'Synced' : 'Sync'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#14532d',
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#22c55e',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#14532d',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 160,
  },
  cardContent: {
    padding: 14,
  },
  mealName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#14532d',
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    marginVertical: 4,
  },
  kcal: {
    fontSize: 14,
    color: '#ef4444',
    marginBottom: 6,
    fontWeight: '500',
  },
  macros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroText: {
    fontSize: 13,
    color: '#6b7280',
  },
  totalCalories: {
    textAlign: 'right',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#22c55e',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    shadowColor: '#22c55e',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  floatingText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  syncButton: {
    position: 'absolute',
    top: 48,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  syncText: {
    marginLeft: 6,
    color: '#14532d',
    fontWeight: '500',
  },
  syncDisabled: {
    opacity: 0.6,
  },
});
