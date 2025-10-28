import React, { useState,useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal, 
  FlatList,
  DeviceEventEmitter 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db, auth } from '../../../config/firebase-config';
import moment from 'moment';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useMealUpdate } from '../../context/MealUpdateContext';
import ShowStreakAnimation from './ShowStreakScreen';
import { getAuth } from "firebase/auth";
export default function MealsScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('Breakfast');
  const [userMeals, setUserMeals] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState('weekly');
  const [isCompactView, setIsCompactView] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showStreakAnimation, setShowStreakAnimation] = useState(false);
  const { triggerMealUpdate } = useMealUpdate();
  const tabs = ['Breakfast', 'Lunch', 'Dinner'];
  const [streakCount, setStreakCount] = useState(0);
  const [orderedMeals, setOrderedMeals] = useState([]);
  const [showOrderedModal, setShowOrderedModal] = useState(false);

  const getMealTypeByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Breakfast';
    if (hour >= 11 && hour < 17) return 'Lunch';
    return 'Dinner';
  };

  const getWeekRange = (date) => {
    const start = moment(date).startOf('week');
    const end = moment(date).endOf('week');
    return [start, end];
  };

  const groupMealsByDay = (meals) => {
    const grouped = {};
    meals.forEach((meal) => {
      const day = moment(meal.createdAt).format('dddd, MMM D');
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(meal);
    });
    return grouped;
  };

  const onRefresh = async () => {
  setRefreshing(true);
  try {
    await loadLocalMeals();
  } catch (err) {
    console.error('Refresh failed:', err);
  } finally {
    setRefreshing(false);
  }
};

useEffect(() => {
  const defaultMealType = getMealTypeByTime();
  setActiveTab(defaultMealType);
}, []);

useEffect(() => {
  if (userMeals.some((m) => moment(m.createdAt).isSame(moment(), 'day'))) {
    checkAndUpdateStreak();
  }
}, [userMeals]);


const checkAndUpdateStreak = async () => {
  try {
    const uid = auth?.currentUser?.uid;
    if (!uid) return null;

    const streakKey = `${uid}_streakData`;
    const today = moment().startOf('day');

    const stored = await AsyncStorage.getItem(streakKey);
    let streakData = stored ? JSON.parse(stored) : { lastDate: null, count: 0 };

    const lastDate = moment(streakData.lastDate);
    let updated = false;
    let continued = false;

    // Already counted today
    if (lastDate.isValid() && today.isSame(lastDate, 'day')) {
      return { updated: false, continued: false, count: streakData.count };
    }

    if (!lastDate.isValid() || today.diff(lastDate, 'days') > 1) {
      // First log or reset streak
      streakData.count = 1;
    } else if (today.diff(lastDate, 'days') === 1) {
      // Continue streak
      streakData.count += 1;
      continued = true;
    }

    streakData.lastDate = today.toISOString();
    await AsyncStorage.setItem(streakKey, JSON.stringify(streakData));
    updated = true;

    return {
      updated,
      continued,
      count: streakData.count,
    };
  } catch (error) {
    console.error('Error updating streak:', error);
    return null;
  }
};


useFocusEffect(
  React.useCallback(() => {
    const run = async () => {
      await loadLocalMeals();

      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const allTabs = ['Breakfast', 'Lunch', 'Dinner'];
      let hasTodayMeal = false;

      // 🟢 1️⃣ Check manually logged meals
      for (const tab of allTabs) {
        const key = `${uid}_loggedMeals_${tab}`;
        const stored = await AsyncStorage.getItem(key);
        const meals = stored ? JSON.parse(stored) : [];

        if (meals.some((m) => moment(m.createdAt).isSame(moment(), 'day'))) {
          hasTodayMeal = true;
          break;
        }
      }

      // 🟢 2️⃣ If any logged meal exists today, update streak
      if (hasTodayMeal) {
        const result = await checkAndUpdateStreak();
        if (result?.updated) {
          setStreakCount(result.count);
          setShowStreakAnimation(true);
          console.log(
            `🔥 Streak ${result.continued ? 'continued' : 'started'}: ${result.count} days`
          );
        }
      }
    };

    run();
  }, [])
);

// 🔹 Separate effect for locally saved ordered meals
useEffect(() => {
  const updateStreakFromOrderedMeals = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const orderedKey = `${uid}_orderedMeals`;
    const orderedData = await AsyncStorage.getItem(orderedKey);
    if (!orderedData) return;

    // We can still load the data if needed, but don't trigger streak updates
    const orderedMeals = JSON.parse(orderedData);
    const hasTodayOrdered = orderedMeals.some(
      (m) => m.date === moment().format('YYYY-MM-DD')
    );

    // ❌ Removed streak update logic
    console.log('Ordered meals found for today:', hasTodayOrdered);
  };

  updateStreakFromOrderedMeals();
}, []);


useEffect(() => {
  const fetchOrderedMeals = async () => {
    try {
      const user = getAuth().currentUser;
      if (!user) return;

      const key = `${user.uid}_orderedMeals`;
      const stored = await AsyncStorage.getItem(key);

      if (stored) {
        const parsed = JSON.parse(stored);
        setOrderedMeals(parsed); // ✅ Save to state
      } else {
        setOrderedMeals([]); // No data
      }
    } catch (error) {
      console.error("❌ Error fetching ordered meals:", error);
    }
  };

  fetchOrderedMeals();
}, []);

useEffect(() => {
  const handleOrderedMealsChange = async () => {
    const user = getAuth().currentUser;
    if (!user) return;

    const key = `${user.uid}_orderedMeals`;
    const stored = await AsyncStorage.getItem(key);
    setOrderedMeals(stored ? JSON.parse(stored) : []);
  };

  // 🟢 Listen using DeviceEventEmitter
  const subscription = DeviceEventEmitter.addListener('orderedMealsUpdated', handleOrderedMealsChange);

  // 🧹 Cleanup
  return () => {
    subscription.remove();
  };
}, []);

  
const loadLocalMeals = async () => {
  try {
    const uid = auth?.currentUser?.uid;
    if (!uid) return;

    const key = `${uid}_loggedMeals_${activeTab}`;
    const stored = await AsyncStorage.getItem(key);
    const meals = stored ? JSON.parse(stored) : [];

    let filtered = [];

    if (viewMode === 'weekly') {
      const [start, end] = getWeekRange(selectedDate);
      filtered = meals.filter((m) => {
        const createdAt = moment(m.createdAt);
        return createdAt.isBetween(start, end, 'day', '[]'); // inclusive
      });
    } else {
      filtered = meals.filter((m) =>
        moment(m.createdAt).isSame(moment(selectedDate), 'day')
      );
    }

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

  useFocusEffect(
    React.useCallback(() => {
      loadLocalMeals();
    }, [activeTab, selectedDate, viewMode])
  );

  const handleEditMeal = (meal) => {
    navigation.navigate('LogFoodModal', { mealToEdit: meal, mealType: activeTab });
  };

  const uploadImageToImgBB = async (imageUri) => {
  try {
    const apiKey = '5d3311f90ffc71914620a8d5c008eb9a'; // replace with your actual ImgBB API key

    // Read the image as base64
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];

        const formData = new FormData();
        formData.append('image', base64);

        const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (data.success) {
          resolve(data.data.url);
        } else {
          reject(new Error('Upload failed'));
        }
      };

      reader.onerror = () => {
        reject(new Error('File reading failed'));
      };

      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('uploadImageToImgBB error:', error);
    throw error;
  }
};


  
const handleSaveToFirebase = async () => {
  try {
    setIsSaving(true); // Start loading

    const uid = auth?.currentUser?.uid;
    if (!uid) {
      Alert.alert("Not logged in", "Please sign in to sync your meals.");
      return;
    }

    const localMeals = [];

    for (const tab of tabs) {
      const key = `${uid}_loggedMeals_${tab}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const meals = JSON.parse(stored);
        meals.forEach((meal) => localMeals.push(meal));
      }
    }

    const syncedIdsKey = `${uid}_syncedMealIds`;
    const prevSyncedStr = await AsyncStorage.getItem(syncedIdsKey);
    const prevSyncedIds = prevSyncedStr ? JSON.parse(prevSyncedStr) : [];
    const localIds = localMeals.map((m) => m.id);
    const deletedIds = prevSyncedIds.filter((id) => !localIds.includes(id));

    for (const id of deletedIds) {
      await deleteDoc(doc(db, "users", uid, "meals", id));
    }

    for (const meal of localMeals) {
      const updatedMeal = { ...meal };

      // Upload image if it's a local file path
      if (meal.image && !meal.image.startsWith("http")) {
        try {
          updatedMeal.image = await uploadImageToImgBB(meal.image);
        } catch (imgErr) {
          console.error("Image upload failed:", imgErr);
        }
      }

      await setDoc(doc(db, "users", uid, "meals", meal.id), {
        ...updatedMeal,
        uid,
        mealType: meal.mealType || activeTab,
        syncedAt: Date.now(),
      });
    }

    await AsyncStorage.setItem(syncedIdsKey, JSON.stringify(localIds));
    triggerMealUpdate();
    Alert.alert("Success", "Meals Saved!");
  } catch (err) {
    console.error("Sync Error:", err);
    Alert.alert("Error", "Failed to save meals. Check internet connection!");
  } finally {
    setIsSaving(false); // End loading
  }
};


const handleDeleteMeal = async (meal) => {
  try {
    const uid = auth.currentUser?.uid;
    const key = `${uid}_loggedMeals_${activeTab}`;
    const stored = await AsyncStorage.getItem(key);
    const meals = stored ? JSON.parse(stored) : [];

    // Remove the selected meal
    const filtered = meals.filter((m) => m.id !== meal.id);
    await AsyncStorage.setItem(key, JSON.stringify(filtered));

    triggerMealUpdate();
    await loadLocalMeals();

    // ⏪ Check if any meals remain for today (across all tabs)
    const allTabs = ['Breakfast', 'Lunch', 'Dinner'];
    let mealsLeftToday = [];

    for (const tab of allTabs) {
      const tabKey = `${uid}_loggedMeals_${tab}`;
      const tabStored = await AsyncStorage.getItem(tabKey);
      const tabMeals = tabStored ? JSON.parse(tabStored) : [];

      const todayMeals = tabMeals.filter((m) =>
        moment(m.createdAt).isSame(moment(), 'day')
      );

      mealsLeftToday.push(...todayMeals);
    }

  } catch (err) {
    console.error('Delete Error:', err);
    Alert.alert('Error', 'Failed to delete meal.');
  }
};


  const groupedMeals = groupMealsByDay(userMeals);

  return (
    <View style={styles.container} >
      <View style={styles.headerRow}>
        <Text style={styles.header}>Meals Overview</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveToFirebase} disabled={isSaving}>
        {isSaving ? (
          <ActivityIndicator size="small" color="#22c55e" />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={18} color="#22c55e" style={{ marginRight: 6 }} />
            <Text style={styles.saveText}>Save</Text>
          </>
        )}
      </TouchableOpacity>

      </View>



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

<View style={styles.calendarRow}>
  <TouchableOpacity style={styles.calendarButton} onPress={() => setShowDatePicker(true)}>
    <Ionicons name="calendar-outline" size={20} color="#555555" />
    <Text style={styles.calendarText}>
      {viewMode === 'weekly'
        ? `Week ${moment(selectedDate).week()}` // <-- changed to show week number
        : moment(selectedDate).format('MMMM D, YYYY')}
    </Text>
  </TouchableOpacity>

  <View style={{ flexDirection: 'row', gap: 8 }}>
    <TouchableOpacity
      onPress={() => setViewMode(viewMode === 'weekly' ? 'daily' : 'weekly')}
      style={styles.viewToggleButton}
    >
      <Ionicons name="repeat-outline" size={16} color="#555555" />
      <Text style={styles.viewToggleText}>
        {viewMode === 'weekly' ? 'Daily' : 'Weekly'}
      </Text>
    </TouchableOpacity>
  </View>
</View>


      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {userMeals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No meals logged yet</Text>
        </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}
            refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
        >
          {(viewMode === 'weekly' ? Object.entries(groupedMeals) : [['', userMeals]]).map(
            ([day, meals]) => (
              <View key={day}>
                {viewMode === 'weekly' && <Text style={styles.dayHeader}>{day}</Text>}
                {meals.map((meal) => (
                  <View key={meal.id} style={[styles.card, isCompactView && styles.compactCard]}>
                    <View style={[styles.cardRow, isCompactView && { flexDirection: 'row' }]}>
                     {meal.image && (
                        <Image
                          source={{ uri: meal.image }}
                          style={isCompactView ? styles.compactImage : styles.fullImage}
                          onError={() => console.warn("Image failed to load:", meal.image)}
                        />
                      )}
                      <View style={[styles.cardContent, isCompactView && styles.compactCardContent]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={styles.mealName}>{meal.name}</Text>
                          <Text style={styles.kcal}>{meal.calories} kcal</Text>
                        </View>
                        <Text style={styles.description}>{meal.recipe || meal.description}</Text>
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
                  </View>
                ))}
              </View>
            )
          )}
        </ScrollView>
      )}

      {showStreakAnimation && (
        <ShowStreakAnimation onFinish={() => setShowStreakAnimation(false)} />
      )}




      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate('LogFoodModal')}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.floatingText}>Log Food</Text>
      </TouchableOpacity>

      {orderedMeals.length > 0 && (
        <TouchableOpacity
          style={styles.orderedBanner}
          onPress={() => setShowOrderedModal(true)}
        >
          <Ionicons name="restaurant-outline" size={18} color="#555555" />
          <Text style={styles.orderedBannerText}>
            You have {orderedMeals.length} ordered meal{orderedMeals.length > 1 ? 's' : ''}!
          </Text>
        </TouchableOpacity>
      )}


<Modal
  visible={showOrderedModal}
  animationType="fade"
  transparent={true}
  onRequestClose={() => setShowOrderedModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Ordered Meals</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setShowOrderedModal(false)}
        >
          <Ionicons name="close" size={18} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {orderedMeals.length === 0 ? (
        <Text style={styles.emptyText}>No ordered meals found.</Text>
      ) : (
        <FlatList
          data={orderedMeals}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ paddingBottom: 10 }}
renderItem={({ item, index }) => (
  <TouchableOpacity
    onPress={() => {
      navigation.navigate('LogFoodModal', {
        mealData: {
          name: item.mealName,
          calories: item.calories,
          macros: {
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
          },
          mealType: item.mealType || 'Lunch',
        },
        mealIndex: index, // ✅ still pass index for removal later
      });
      setShowOrderedModal(false);
    }}
  >
    <View style={styles.orderedCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.orderedName}>
          {item.mealName || 'Unnamed Meal'}
        </Text>
        <Text style={styles.orderedCalories}>{item.calories} kcal</Text>
        <View style={styles.macroRow}>
          <Text style={styles.macroText}>Protein: {item.protein}g</Text>
          <Text style={styles.macroText}>Carbs: {item.carbs}g</Text>
          <Text style={styles.macroText}>Fat: {item.fat}g</Text>
        </View>
        <Text style={styles.orderedDate}>
          {item.date} {item.time ? `• ${item.time}` : ''}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
)}

        />

      )}
    </View>
  </View>
</Modal>



    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#555555',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#22c55e',
  },
  tabText: {
    fontSize: 15,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#22c55e',
    fontWeight: '600',
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
  },
  calendarText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#555555',
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  viewToggleText: {
    marginLeft: 6,
    color: '#555555',
    fontSize: 14,
    fontWeight: '500',
  },
  dayHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
    marginTop: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardRow: {
    flexDirection: 'column',
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactImage: {
    width: 80,
    height: 80,
    borderRadius: 50,
  },
  cardContent: {
    paddingTop: 8,
  },
  compactCardContent: {
    paddingLeft: 12,
    flex: 1,
  },
  mealName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555555',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginVertical: 6,
  },
  kcal: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  macros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  macroText: {
    fontSize: 13,
    color: '#6b7280',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#22c55e',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    shadowColor: '#22c55e',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9ca3af',
    marginTop: 12,
  },
headerRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center', // ensures vertical alignment
  marginBottom: 16,
},

header: {
  fontSize: 24,
  fontWeight: '700',
  color: '#555555',
},
saveButton: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 6,
  paddingHorizontal: 12,
  height: 38, // make height match header text roughly
},

saveText: {
  fontSize: 15,
  fontWeight: '600',
  color: '#22c55e',
},
fullImage: {
  width: '100%',
  height: 160,
  borderRadius: 10,
  marginBottom: 10,
},
streakContainer: {
  position: 'absolute',
  top: 80,
  alignSelf: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.4)',
  padding: 16,
  borderRadius: 16,
  zIndex: 999,
},
streakText: {
  marginTop: 8,
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
},
orderedBanner: {
  position: 'absolute',
  bottom: 90,
  left: 24,
  right: 24,
  backgroundColor: '#fef9c3',
  borderColor: '#fde047',
  borderWidth: 1,
  borderRadius: 14,
  paddingVertical: 10,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.15,
  shadowRadius: 6,
  elevation: 5,
},
orderedBannerText: {
  color: '#555555',
  fontWeight: '600',
  marginLeft: 6,
  fontSize: 14,
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.4)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalContainer: {
  width: '90%',
  maxHeight: '80%',
  backgroundColor: '#f9fafb',
  borderRadius: 4,
  padding: 16,
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 10,
  elevation: 6,
},
modalHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
},
modalTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#111827',
},
closeButton: {
  backgroundColor: '#e5e7eb',
  width: 30,
  height: 30,
  borderRadius: 15,
  alignItems: 'center',
  justifyContent: 'center',
},
orderedCard: {
  backgroundColor: '#fff',
  borderRadius: 4,
  padding: 12,
  marginBottom: 10,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 3,
  borderWidth: 1,
  borderColor: '#f3f4f6',
},

orderedName: {
  fontSize: 16,
  fontWeight: '600',
  color: '#111827',
  marginBottom: 2,
},
orderedCalories: {
  fontSize: 14,
  color: '#ef4444',
  marginBottom: 4,
},
macroRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
  marginVertical: 2,
},
macroText: {
  fontSize: 12,
  color: '#374151',
},
orderedDate: {
  fontSize: 12,
  color: '#6b7280',
  marginTop: 2,
},
emptyText: {
  textAlign: 'center',
  color: '#6b7280',
  marginTop: 30,
  fontSize: 14,
},

});
