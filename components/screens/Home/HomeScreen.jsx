import React, { useEffect, useState,useCallback  } from "react";
import Loader from "./Loader";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
  TouchableWithoutFeedback,
  RefreshControl
} from "react-native";
import {useNavigation,useFocusEffect } from '@react-navigation/native';
import DateTimePicker from "@react-native-community/datetimepicker";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming, 
  useAnimatedStyle,
  runOnJS,
  FadeIn 
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "@/config/firebase-config";
import { doc, getDoc, collection,query,orderBy, getDocs,addDoc} from "firebase/firestore";
import { Dimensions } from "react-native";
const screenWidth = Dimensions.get("window").width;
const CARD_WIDTH = screenWidth - 48;
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getAuth } from 'firebase/auth';
import { Alert } from 'react-native';
import moment from 'moment';
import { useMealUpdate } from "../../context/MealUpdateContext";
import NetInfo from '@react-native-community/netinfo';
import LostStreakScreen from "./LostStreakScreen";
const AnimatedCircle = Animated.createAnimatedComponent(Circle);


const SIZE = 100;
const STROKE_WIDTH = 4;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIDEBAR_WIDTH = 280;
function CircleProgress({ percent = 0, color = "#22c55e", value,target, label }) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(percent, { duration: 1000 });
  }, [percent]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset:
      CIRCUMFERENCE - (CIRCUMFERENCE * animatedProgress.value) / 100,
  }));

  return (
    <View style={styles.circleItem}>
<Svg width={SIZE} height={SIZE}>
  {/* Outer border ring */}
  <Circle
    stroke="#d1fae5" // Light green or any border color
    fill="none"
    cx={SIZE / 2}
    cy={SIZE / 2}
    r={RADIUS + 2} // Slightly bigger than background/progress
    strokeWidth={2}
  />

  {/* Background ring */}
  <Circle
    stroke="#e5e7eb"
    fill="none"
    cx={SIZE / 2}
    cy={SIZE / 2}
    r={RADIUS}
    strokeWidth={STROKE_WIDTH}
  />

  {/* Foreground animated progress ring */}
  <AnimatedCircle
    stroke={color}
    fill="none"
    cx={SIZE / 2}
    cy={SIZE / 2}
    r={RADIUS}
    strokeWidth={STROKE_WIDTH}
    strokeDasharray={CIRCUMFERENCE}
    animatedProps={animatedProps}
    strokeLinecap="round"
    rotation="-90"
    originX={SIZE / 2}
    originY={SIZE / 2}
  />
</Svg>

     <View style={styles.circleValueContainer}>
  <Text style={styles.circleValue}>
    {value}/{target}
  </Text>
  <Text style={styles.unit}>kcal</Text>
</View>

      <Text style={styles.circleLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const nav = useNavigation();
  const { updateFlag } = useMealUpdate();
  const [greeting, setGreeting] = useState("Hello");
  const [showSidebar, setShowSidebar] = useState(false);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [tdee, setTdee] = useState(null);
  const isToday = new Date().toDateString() === selectedDate.toDateString();
  const [mealsLoading, setMealsLoading] = useState(true);
  const sidebarAnim = useSharedValue(-SIDEBAR_WIDTH);
  const overlayOpacity = useSharedValue(0);
  const [caloriesEaten, setCaloriesEaten] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [macrosPercent, setMacrosPercent] = useState({ carbs: 0, protein: 0, fat: 0 });
  const [caloriesLeft, setCaloriesLeft] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lostStreakVisible, setLostStreakVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

const safeCaloriesTarget = tdee || 0;
const safeCaloriesEaten = caloriesEaten || 0;
const safeCaloriesBurned = caloriesBurned || 0;

const safeCaloriesLeft = caloriesLeft || 0;


const percentEaten = safeCaloriesTarget > 0
  ? (safeCaloriesEaten / safeCaloriesTarget) * 100
  : 0;

const percentLeft = safeCaloriesTarget > 0
  ? (safeCaloriesLeft / safeCaloriesTarget) * 100
  : 0;

const percentBurned = safeCaloriesTarget > 0
  ? (safeCaloriesBurned / safeCaloriesTarget) * 100
  : 0;


const macros = macrosPercent;

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    const connected = state.isConnected && state.isInternetReachable !== false;
    setIsConnected(connected);

    if (connected) {
      // ✅ Fetch suggestions when connection is restored
      fetchMealSuggestions(tdee);
    }
  });

  return () => unsubscribe();
}, [tdee]);

const onRefresh = async () => {
  setRefreshing(true);

  try {
    await fetchMealSuggestions(tdee);      // reload meals
    await loadLocalMealsForDate(selectedDate); // refresh local calories/macros
  } catch (err) {
    console.error("Refresh failed", err);
  } finally {
    setRefreshing(false);
  }
};





const loadLocalMealsForDate = async (date) => {
  const user = auth.currentUser;
  if (!user) return;

  const uid = user.uid;

  let totalCalories = 0;
  let totalCarbs = 0;
  let totalProtein = 0;
  let totalFat = 0;

  for (const tab of ['Breakfast', 'Lunch', 'Dinner']) {
    const key = `${uid}_loggedMeals_${tab}`;
    const stored = await AsyncStorage.getItem(key);
    const meals = stored ? JSON.parse(stored) : [];

    const filtered = meals.filter((m) =>
      moment(m.createdAt).isSame(moment(date), 'day')
    );

    for (const meal of filtered) {
      totalCalories += meal.calories || 0;
      if (meal.macros) {
        totalCarbs += meal.macros.carbs || 0;
        totalProtein += meal.macros.protein || 0;
        totalFat += meal.macros.fat || 0;
      }
    }
  }

  const tefValue = totalCalories * 0.1;

  setCaloriesEaten(totalCalories);
  setCaloriesLeft((tdee || 0) - totalCalories);
  setCaloriesBurned(Math.round(tefValue));
  setMacrosPercent({
    carbs: Math.round(totalCarbs),
    protein: Math.round(totalProtein),
    fat: Math.round(totalFat),
  });
};



useEffect(() => {
    loadLocalMealsForDate(selectedDate);
  }, [updateFlag]);



useFocusEffect(
  useCallback(() => {
    const checkStreak = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const lastLoggedStr = await AsyncStorage.getItem('lastLoggedDate');
        const streakCountStr = await AsyncStorage.getItem('streakCount');
        const longestStreakStr = await AsyncStorage.getItem('longestStreak');

        if (!lastLoggedStr) return;

        const lastLoggedDate = moment(lastLoggedStr, 'YYYY-MM-DD').startOf('day');
        const today = moment().startOf('day');

        if (lastLoggedDate.isAfter(today)) {
          console.log('⚠️ lastLoggedDate is in the future, ignoring.');
          return;
        }

        const daysSinceLastLogged = today.diff(lastLoggedDate, 'days');
        const hasShownKey = `hasShownLostStreak_${today.format('YYYY-MM-DD')}`;
        const alreadyShown = await AsyncStorage.getItem(hasShownKey);

        let streakCount = parseInt(streakCountStr) || 0;
        let longestStreak = parseInt(longestStreakStr) || 0;

        if (daysSinceLastLogged === 1) {
          // Consecutive day
          streakCount += 1;
          await AsyncStorage.setItem('streakCount', String(streakCount));

          if (streakCount > longestStreak) {
            longestStreak = streakCount;
            await AsyncStorage.setItem('longestStreak', String(longestStreak));
            console.log('🏆 New longest streak:', longestStreak);
          }

          console.log('✅ Streak maintained. Current streak:', streakCount);
          setLostStreakVisible(false);

        } else if (daysSinceLastLogged === 0) {
          // Logged again today — keep streak as is
          console.log('📅 Already logged today. Streak count unchanged:', streakCount);
          setLostStreakVisible(false);

        } else if (daysSinceLastLogged > 1) {
          // Missed a day — streak lost
          if (!alreadyShown) {
            console.log('🔥 Missed day. Streak broken!');
            setLostStreakVisible(true);
            await AsyncStorage.setItem(hasShownKey, 'true');
          } else {
            console.log('ℹ️ Lost streak already shown today.');
          }

          // Reset current streak
          await AsyncStorage.setItem('streakCount', '0');
        }

      } catch (error) {
        console.error('🚨 Error checking streak:', error);
      }
    };

    checkStreak();
  }, [refreshKey])
);




// useEffect(() => {
//   const getLoggedDate = async () => {
//     try {
//       const loggedDate = await AsyncStorage.getItem('lastLoggedDate');
//       if (loggedDate) {
//         console.log('📝 Current lastLoggedDate:', loggedDate);
//       } else {
//         console.log('⚠️ No lastLoggedDate found.');
//       }
//     } catch (error) {
//       console.error('❌ Error fetching lastLoggedDate:', error);
//     }
//   };

//   getLoggedDate();
// }, []);


useEffect(() => {
  const hour = new Date().getHours();
  setGreeting(
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  );

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const tdeeValue = data?.calorieBreakdown?.tdee;
        setUserName(data.firstName ||data.Name ||"User");
        setTdee(tdeeValue ?? 2000);
        setMealsLoading(true);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchUserData();
}, []);



const fetchMealSuggestions = async (tdeeValue) => {
  if (!tdeeValue) return;
  try {
    setMealsLoading(true);
    const snapshot = await getDocs(collection(db, "meals"));
    const allMeals = snapshot.docs.map((doc) => doc.data());
    const validMeals = allMeals.filter(
      (meal) => meal.calories && meal.calories <= (tdeeValue - 1350)
    );
    const shuffled = validMeals.sort(() => 0.5 - Math.random());
    setSuggestions(shuffled.slice(0, 3));
  } catch (err) {
    console.error("Failed to fetch meals:", err);
  } finally {
    setMealsLoading(false);
  }
};

useEffect(() => {
  if (tdee) {
    fetchMealSuggestions(tdee);
  }
}, [selectedDate, tdee]);


useEffect(() => {
  if (showSidebar) {
    sidebarAnim.value = withTiming(0, { duration: 300 }); // slide in
    overlayOpacity.value = withTiming(1, { duration: 300 });
  } else {
    sidebarAnim.value = withTiming(-SIDEBAR_WIDTH, { duration: 300 }); // slide out left
    overlayOpacity.value = withTiming(0, { duration: 300 });
  }
}, [showSidebar]);


  
useEffect(() => {
  if (tdee) {
    loadLocalMealsForDate(selectedDate);
  }
}, [selectedDate, tdee]);


const animatedSidebarStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: sidebarAnim.value }],
}));

const animatedOverlayStyle = useAnimatedStyle(() => ({
  backgroundColor: `rgba(0,0,0,${overlayOpacity.value * 0.4})`,
}));

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    if (!isToday) {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + 1);
      setSelectedDate(newDate);
    }
  };

  const onDateChange = (event, date) => {
    setShowPicker(Platform.OS === "ios");
    if (date) setSelectedDate(date);
  };
const handleLogout = async () => {
  try {
    await auth.signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }], // Replace "Landing" with your login/landing screen name
    });
  } catch (err) {
    console.error("Logout failed", err);
  }
};

 if (loading) {
  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <Loader />
    </View>
  );
}


function CircleSkeleton() {
  return (
    <View style={styles.circleItem}>
      <View style={styles.circleSkeleton} />
      <View style={styles.circleValueContainer}>
        <Text style={styles.skeletonText}>--/--</Text>
        <Text style={styles.unit}>kcal</Text>
      </View>
      <Text style={styles.circleLabel}>Loading</Text>
    </View>
  );
}

function MacroSkeleton() {
  return (
    <View style={styles.macroSkeletonRow}>
      <View style={styles.macroSkeletonLabel} />
      <View style={styles.macroSkeletonBar} />
      <View style={styles.macroSkeletonValue} />
    </View>
  );
}


const handleSync = async () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    Alert.alert("Error", "User not logged in.");
    return;
  }

  try {
    const mealsRef = collection(db, "users", currentUser.uid, "meals");
    const q = query(mealsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const mealsByType = { Breakfast: [], Lunch: [], Dinner: [] };

    for (const docSnap of snapshot.docs) {
      const meal = docSnap.data();
      const mealId = docSnap.id;
      meal.id = mealId;

      if (!meal.createdAt) {
        meal.createdAt = new Date().toISOString();
      }

      const type = meal.mealType || "Breakfast";
      if (!mealsByType[type]) mealsByType[type] = [];
      mealsByType[type].push(meal);
    }

    // Merge Firebase meals with existing local ones
    for (const [type, firebaseMeals] of Object.entries(mealsByType)) {
      const key = `${currentUser.uid}_loggedMeals_${type}`;
      const existingRaw = await AsyncStorage.getItem(key);
      const existingMeals = existingRaw ? JSON.parse(existingRaw) : [];

      const existingIds = new Set(existingMeals.map(m => m.id));
      const newMeals = firebaseMeals.filter(m => !existingIds.has(m.id));
      const mergedMeals = [...existingMeals, ...newMeals];

      await AsyncStorage.setItem(key, JSON.stringify(mergedMeals));
    }


    // Refresh HomeScreen data using selectedDate
    await loadLocalMealsForDate(selectedDate);

    Alert.alert("Success", "New meals have been merged from Firebase.");
  } catch (error) {
    console.error("handleSync Error:", error);
    Alert.alert("Sync Failed", "Unable to sync meals.");
  }
};




return (
  <View style={styles.container}>
    <ScrollView 
      contentContainerStyle={styles.content} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }  
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowSidebar(true)}>
          <View style={styles.profileCircle}>
            <Text style={styles.profileInitial}>{userName?.charAt(0) || "U"}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.greetingBox}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{userName}</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={26} color="#14532d" />
        </TouchableOpacity>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.dateArrow} onPress={goToPreviousDay}>
          <Ionicons name="chevron-back" size={30} color="#14532d" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateTextWrapper} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateText}>
            {isToday ? "Today" : selectedDate.toDateString()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateArrow}
          onPress={goToNextDay}
          disabled={isToday}
        >
          <Ionicons
            name="chevron-forward"
            size={30}
            color={isToday ? "#d1d5db" : "#14532d"}
          />
        </TouchableOpacity>
      </View>


      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Circles */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.circleRow}>
        {mealsLoading ? (
          <>
            <CircleSkeleton />
            <CircleSkeleton />
            <CircleSkeleton />
          </>
        ) : (
          <>
            <CircleProgress
              percent={percentEaten}
              value={safeCaloriesEaten}
              target={safeCaloriesTarget}
              color="#22c55e"
              label="Eaten"
            />
            <CircleProgress
              percent={percentLeft}
              value={safeCaloriesLeft}
              target={safeCaloriesTarget}
              color="#eab308"
              label="Left"
            />
            <CircleProgress
              percent={percentBurned}
              value={safeCaloriesBurned}
              target={safeCaloriesTarget}
              color="#ef4444"
              label="Burned"
            />
          </>
        )}
      </Animated.View>

      {/* Macros */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Macros</Text>

        {mealsLoading ? (
          <>
            <MacroSkeleton />
            <MacroSkeleton />
            <MacroSkeleton />
          </>
        ) : (
          [
            { label: "Carbs", value: macros.carbs, color: "#facc15" },
            { label: "Protein", value: macros.protein, color: "#34d399" },
            { label: "Fat", value: macros.fat, color: "#f87171" }
          ].map((item) => (
            <View style={styles.macroRow} key={item.label}>
              <Text style={styles.macroLabel}>{item.label}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(item.value, 100)}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.percent}>{item.value}g</Text>
            </View>
          ))
        )}
      </View>

      {/* Meal Suggestions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meal Suggestions</Text>

        {!isConnected ? (
          <Text style={{ color: "#6b7280", marginTop: 10 }}>
            Looks like you're offline. We'll load meal suggestions as soon as you're back online.
          </Text>
        ) : mealsLoading || tdee === null ? (
          <View
            style={{
              width: CARD_WIDTH,
              height: 140,
              borderRadius: 16,
              backgroundColor: "#e5e7eb",
              alignSelf: "center",
              marginTop: 20,
            }}
          />
        ) : suggestions.length > 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 20 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + 16}
              decelerationRate="fast"
              pagingEnabled={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {suggestions.map((meal, index) => {
                const isExpanded = expandedIndex === index;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.suggestionItemHorizontal, { width: CARD_WIDTH }]}
                    activeOpacity={0.9}
                    onPress={() => setExpandedIndex(isExpanded ? null : index)}
                  >
                    {meal.image && (
                      <View style={styles.imageContainer}>
                        <Image
                          source={{ uri: meal.image }}
                          style={styles.suggestionImage}
                        />
                      </View>
                    )}
                    <View style={styles.suggestionText}>
                      <View style={styles.suggestionTopRow}>
                        <Text style={styles.suggestionName}>{meal.mealName}</Text>
                        <Ionicons name="star-outline" size={20} color="#facc15" />
                      </View>
                      <Text style={styles.suggestionCalories}>
                        {meal.calories ?? 0} kcal
                      </Text>
                      {meal.description && (
                        <Text
                          style={[
                            styles.suggestionDescription,
                            !isExpanded && styles.suggestionDescriptionCollapsed,
                          ]}
                          numberOfLines={isExpanded ? undefined : 2}
                        >
                          {meal.description}
                        </Text>
                      )}
                      <TouchableOpacity style={styles.logButton}>
                        <Text style={styles.logButtonText}>Add Meal</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <Text style={{ color: "#6b7280", marginTop: 10 }}>
            No suggestions available.
          </Text>
        )}
      </View>     
    </ScrollView>

    {/* Sidebar Modal */}
    {showSidebar && (
      <Animated.View style={[styles.sidebarOverlay, animatedOverlayStyle]}>
        {/* Backdrop for dismissing sidebar */}
        <TouchableWithoutFeedback
          onPress={() => {
            sidebarAnim.value = withTiming(-260, { duration: 300 });
            overlayOpacity.value = withTiming(0, { duration: 300 }, () => {
              runOnJS(setShowSidebar)(false);
            });
          }}
        >
          <View style={styles.sidebarBackdrop} />
        </TouchableWithoutFeedback>

        {/* Sidebar Panel */}
        <Animated.View style={[styles.sidebar, animatedSidebarStyle]}>
        <View style={styles.sidebarHeaderWithUser}>
      <View style={styles.sidebarUserInfo}>
        <Image
          source={{ uri: "https://i.pravatar.cc/150?u=" + userName }}
          style={styles.sidebarUserImage}
        />
        <Text style={styles.sidebarUserName}>{userName}</Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          sidebarAnim.value = withTiming(-260, { duration: 300 });
          overlayOpacity.value = withTiming(0, { duration: 300 }, () => {
            runOnJS(setShowSidebar)(false);
          });
        }}
        style={styles.closeButton}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={20} color="#6b7280" />
      </TouchableOpacity>
        </View>


          <TouchableOpacity style={styles.sidebarItem}>
            <Ionicons name="person-outline" size={20} color="#14532d" />
            <Text style={styles.sidebarItemText}>Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem}>
            <Ionicons name="settings-outline" size={20} color="#14532d" />
            <Text style={styles.sidebarItemText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={handleSync}>
            <Ionicons name="sync-outline" size={20} color="#14532d" />
            <Text style={styles.sidebarItemText}>Sync</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#14532d" />
            <Text style={styles.sidebarItemText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    )}
    
    {lostStreakVisible && (
      <LostStreakScreen
        onFinish={() => {
          setLostStreakVisible(false);
          setRefreshKey(prev => prev + 1); // 🔄 Triggers re-check and reload
        }}
      />
    )}

  </View>
);
  
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 24, paddingTop: 48, paddingBottom: 100 },

  // Header
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#bbf7d0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  profileInitial: { fontSize: 20, color: "#14532d", fontWeight: "bold" },
  greetingBox: { flex: 1 },
  greeting: { fontSize: 16, color: "#6b7280" },
  name: { fontSize: 20, fontWeight: "bold", color: "#14532d" },

  // Sidebar
  sidebarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.2)",
    zIndex: 999,
  },
  sidebarBackdrop: { flex: 1 },
sidebar: {
  position: "absolute",
  left: 0, // stay on left
  top: 0,
  bottom: 0,
  width: SIDEBAR_WIDTH,
  backgroundColor: "#ffffff",
  padding: 20,
  paddingTop: 40,
  shadowColor: "#000",
  shadowOffset: { width: 3, height: 0 },
  shadowOpacity: 0.1,
  shadowRadius: 10,
  elevation: 10,
  zIndex: 1000, // ensure it's on top
},

sidebarHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
  borderBottomWidth: 1,
  borderBottomColor: "#d1fae5",
  paddingBottom: 12,
},
sidebarTitle: {
  fontSize: 20,
  fontWeight: "700",
  color: "#14532d",
},
sidebarHeaderWithUser: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
  borderBottomWidth: 1,
  borderBottomColor: "#d1fae5",
  paddingBottom: 12,
},
sidebarUserInfo: {
  flexDirection: "row",
  alignItems: "center",
},
sidebarUserImage: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "#bbf7d0",
  marginRight: 12,
},
sidebarUserName: {
  fontSize: 18,
  fontWeight: "bold",
  fontWeight: "600",
  color: "#14532d",
},

closeButton: {
  backgroundColor: "#e5e7eb",       // Light green background
  borderRadius: 20,
  padding: 8,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
  color:"#ffffff"
},

sidebarItem: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 14,
  paddingHorizontal: 10,
  borderRadius: 12,
  marginBottom: 10,
  backgroundColor: "#ffffff",
  shadowColor: "#000",
  shadowOpacity: 0.03,
  shadowOffset: { width: 0, height: 1 },
  shadowRadius: 3,
  elevation: 1,
},
sidebarItemText: {
  marginLeft: 12,
  fontSize: 16,
  fontWeight: "500",
  color: "#14532d",
},

  // Date Navigation
dateNav: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: 10,
  marginBottom: 30,
  width: "100%",
},
dateArrow: {
  flex: 1,
  alignItems: "center",
},
dateTextWrapper: {
  flex: 2,
  alignItems: "center",
},
dateText: {
  fontSize: 18,
  fontWeight: "bold",
  color: "#14532d",
},  
  // Circle Progress
  circleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  circleItem: {
    alignItems: "center",
    flex: 1,
    backgroundColor: "transparent",
  },
  circleValueContainer: {
    position: "absolute",
    top: SIZE / 2 - 18,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  circleValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
  },
  unit: {
    fontSize: 15,
    color: "#6b7280",
    marginTop: 2,
  },
  circleLabel: {
    marginTop: 10,
    fontSize: 14,
    color: "#374151",
  },

  // Section Titles
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#14532d",
    marginBottom: 5,
  },

  // Macros
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  macroLabel: {
    width: 70,
    fontSize: 14,
    color: "#4b5563",
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: "#e5e7eb",
    borderRadius: 5,
    overflow: "hidden",
    marginHorizontal: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  percent: {
    width: 40,
    textAlign: "right",
    fontSize: 14,
    color: "#374151",
  },

  // Add Button
  addButton: {
    flexDirection: "row",
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#22c55e",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },

  // Suggestions
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  suggestionItemHorizontal: {
    width: screenWidth - 64,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 16,
    marginRight: 16,
    flexShrink: 0,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 14,
    backgroundColor: "#f3f4f6",
  },
  suggestionImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  suggestionText: {
    flex: 1,
    justifyContent: "center",
  },
  suggestionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  suggestionCalories: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "500",
  },
  suggestionDescription: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  logButton: {
    marginTop: 10,
    backgroundColor: "#22c55e",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  logButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  // Carousel
  carouselContent: {
    paddingHorizontal: 24,
  },
  suggestionSection: {
    width: "100%",
    marginBottom: 32,
  },
  circleSkeleton: {
  width: SIZE,
  height: SIZE,
  borderRadius: SIZE / 2,
  backgroundColor: "#e5e7eb",
  justifyContent: "center",
  alignItems: "center",
},
skeletonText: {
  fontSize: 14,
  fontWeight: "bold",
  color: "#9ca3af",
},
macroSkeletonRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 12,
},

macroSkeletonLabel: {
  width: 70,
  height: 14,
  borderRadius: 4,
  backgroundColor: "#e5e7eb",
  marginRight: 10,
},

macroSkeletonBar: {
  flex: 1,
  height: 10,
  borderRadius: 5,
  backgroundColor: "#e5e7eb",
  marginRight: 10,
},

macroSkeletonValue: {
  width: 40,
  height: 14,
  borderRadius: 4,
  backgroundColor: "#e5e7eb",
},

});
