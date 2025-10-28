import React, { useEffect, useState,useCallback,useMemo,useRef } from "react";
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
  RefreshControl,
   SectionList,
   Dimensions
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
import { doc, getDoc, collection,query,orderBy, where,Timestamp, getDocs,addDoc,onSnapshot,setDoc,deleteDoc } from "firebase/firestore";

const screenWidth = Dimensions.get("window").width;
const CARD_WIDTH = screenWidth - 48;
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getAuth,signOut  } from 'firebase/auth';
import { Alert } from 'react-native';
import moment from 'moment';
import { useMealUpdate } from "../../context/MealUpdateContext";
import NetInfo from '@react-native-community/netinfo';
// import LostStreakScreen from "./LostStreakScreen";
import { getSmartSuggestions } from "../../Helper/Suggestions";
import { ref, set, serverTimestamp } from "firebase/database"
import { auth,db, rtdb } from "../../../config/firebase-config"
import { LinearGradient } from 'expo-linear-gradient';
const SCREEN_WIDTH = Dimensions.get('window').width;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 100;
const STROKE_WIDTH = 4;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIDEBAR_WIDTH = 280;

const getInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0) || "";
  const last = lastName?.charAt(0) || "";
  return (first + last).toUpperCase();
};

const AnimatedBar = ({ value, color }) => {
  const fill = useSharedValue(0);

  // Animate fill whenever value changes
  useEffect(() => {
    fill.value = withTiming(Math.min(value, 100), { duration: 500 });
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${fill.value}%`,
    backgroundColor: color,
  }));

  return <Animated.View style={[styles.barFill, animatedStyle]} entering={FadeIn} />;
};


function CircleProgress({ percent = 0, color = "#22c55e", value, target, label }) {

  const animatedProgress = useSharedValue(0);

  // Clamp percent between 0 and 100 for visual
  const safePercent = useMemo(() => Math.max(0, Math.min(percent, 100)), [percent]);

  // Animate on load and whenever value changes
  useEffect(() => {
    animatedProgress.value = 0; // reset to 0 first
    animatedProgress.value = withTiming(safePercent, { duration: 1000 });
  }, [safePercent]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE - (CIRCUMFERENCE * animatedProgress.value) / 100,
  }));

  return (
    <View style={styles.circleItem}>
      <Svg width={SIZE} height={SIZE}>
        <Circle stroke="#d1fae5" fill="none" cx={SIZE/2} cy={SIZE/2} r={RADIUS+2} strokeWidth={2} />
        <Circle stroke="#e5e7eb" fill="none" cx={SIZE/2} cy={SIZE/2} r={RADIUS} strokeWidth={STROKE_WIDTH} />
        <AnimatedCircle
          stroke={color}
          fill="none"
          cx={SIZE/2}
          cy={SIZE/2}
          r={RADIUS}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={`${CIRCUMFERENCE}, ${CIRCUMFERENCE}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE/2} ${SIZE/2})`}
        />
      </Svg>
      <View style={styles.circleValueContainer}>
        {/* Show actual value including negative sign */}
        <Text style={styles.circleValue}>{value}/{target}</Text>
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
  // const [lostStreakVisible, setLostStreakVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [userData, setUserData] = useState(null);
  const safeCaloriesTarget = tdee || 0;
  const safeCaloriesEaten = caloriesEaten || 0;
  const safeCaloriesBurned = caloriesBurned || 0;
  const [favorites, setFavorites] = useState({});
  const [isOnline, setIsOnline] = useState(false);
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const safeCaloriesLeft = caloriesLeft || 0;
  const [accountCreatedAt, setAccountCreatedAt] = useState(null);
  const [mealRatings, setMealRatings] = useState({});
  const [userPhoto, setUserPhoto] = useState(null);
  const [mealsByType, setMealsByType] = useState({
    Breakfast: [],
    Lunch: [],
    Dinner: [],
  });

    const [loadingImages, setLoadingImages] = useState({}); // 👈 track loading per meal ID

  const handleImageLoadStart = (mealId) => {
    setLoadingImages((prev) => ({ ...prev, [mealId]: true }));
  };

  const handleImageLoadEnd = (mealId) => {
    setLoadingImages((prev) => ({ ...prev, [mealId]: false }));
  };
  const [selectedSuggestion, setSelectedSuggestion] = useState("Breakfast");
  const scrollViewRef = useRef(null);
  const sectionRefs = useRef({});
  const percentEaten = safeCaloriesTarget > 0
    ? (safeCaloriesEaten / safeCaloriesTarget) * 100
    : 0;

const percentLeft = safeCaloriesTarget > 0
  ? Math.max(0, (safeCaloriesLeft / safeCaloriesTarget) * 100)
  : 0;


const percentBurned = safeCaloriesTarget > 0
  ? (safeCaloriesBurned / safeCaloriesTarget) * 100
  : 0;


const macros = macrosPercent;

useEffect(() => {
  const hour = new Date().getHours();
  setGreeting(
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  );

  let unsubscribe; // will store Firestore listener

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const cacheKey = `userData_${user.uid}`;

      // 🔹 Always load cached meals first
      await loadLocalMealsForDate(selectedDate);

      // 🔹 Load createdAt from userProfile key specifically
      const profileCache = await AsyncStorage.getItem("userProfile");
      if (profileCache) {
        const profileData = JSON.parse(profileCache);
        if (profileData.createdAt) {
          const created =
            profileData.createdAt.toDate?.() ?? new Date(profileData.createdAt);
          setAccountCreatedAt(created);
        } else if (profileData.dateCreated) {
          const created =
            profileData.dateCreated.toDate?.() ?? new Date(profileData.dateCreated);
          setAccountCreatedAt(created);
        }
      }

      // 🔹 Always load cached user profile first (for name, photo, tdee)
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const data = JSON.parse(cachedData);
        setUserName(data.firstName || data.Name || "User");
        setTdee(data?.calorieBreakdown?.tdee ?? 2000);
        setUserData(data);

        // ✅ Load cached profile picture if exists
        if (data.photoURL) {
          setUserPhoto(data.photoURL);
        }
      } else {
        // fallback if no cache exists yet
        setUserName("User");
        setTdee(2000);
        if (user.metadata?.creationTime) {
          setAccountCreatedAt(new Date(user.metadata.creationTime));
        }
      }

      // 🔹 If online, fetch fresh data + start real-time listener
      if (isConnected) {
        const docRef = doc(db, "users", user.uid);

        // 🔹 Realtime listener for profile updates (photoURL, name, etc.)
        unsubscribe = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const tdeeValue = data?.calorieBreakdown?.tdee ?? 2000;

            setUserName(data.firstName || data.Name || "User");
            setTdee(tdeeValue);
            setUserData(data);

            // ✅ Realtime photo update
            if (data.photoURL) {
              // Add cache-buster to force reload when updated
              setUserPhoto(`${data.photoURL}?t=${Date.now()}`);
            }

            // ✅ Handle createdAt updates
            if (data.createdAt) {
              const created =
                data.createdAt.toDate?.() ?? new Date(data.createdAt);
              setAccountCreatedAt(created);
            } else if (data.dateCreated) {
              const created =
                data.dateCreated.toDate?.() ?? new Date(data.dateCreated);
              setAccountCreatedAt(created);
            } else if (user.metadata?.creationTime) {
              setAccountCreatedAt(new Date(user.metadata.creationTime));
            }

            // ✅ Update local cache (so offline stays in sync)
            await AsyncStorage.setItem(cacheKey, JSON.stringify(data));

            // Refresh dependent features
            fetchMealsByType(data);
            await loadLocalMealsForDate(selectedDate);
          } else {
            console.warn("⚠️ User document not found in Firestore");
          }
        });
      }
    } catch (err) {
      console.error("❌ Error fetching user data:", err);
    } finally {
      setLoading(false);
      setMealsLoading(false);
    }
  };

  fetchUserData();

  // 🔹 Clean up real-time listener when component unmounts
  return () => {
    if (unsubscribe) unsubscribe();
  };
}, [isConnected, selectedDate]);



useEffect(() => {
  if (suggestions.length === 0) return;

  const interval = setInterval(() => {
    const nextIndex = (currentIndex + 1) % suggestions.length;
    setCurrentIndex(nextIndex);

    scrollRef.current?.scrollTo({
      x: nextIndex * (CARD_WIDTH + 16), // same snap interval
      animated: true,
    });
  }, 3000); // slide every 3 seconds

  return () => clearInterval(interval);
}, [currentIndex, suggestions.length]);

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    setIsOnline(state.isConnected && state.isInternetReachable);
  });
  return () => unsubscribe();
}, []);

useEffect(() => {
  const autoRefresh = async () => {
    try {
      await fetchMealsByType(tdee);
      await loadLocalMealsForDate(selectedDate);
    } catch (err) {
      console.error("Auto refresh failed", err);
    }
  };

  if (tdee && selectedDate) {
    autoRefresh(); // only run when both are defined
  }
}, [tdee, selectedDate]); // run when these change


useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    const connected = state.isConnected && state.isInternetReachable !== false;
    setIsConnected(connected);

    if (connected) {
      // ✅ Fetch suggestions when connection is restored
      fetchMealsByType(tdee);
    }
  });

  return () => unsubscribe();
}, [tdee]);

const onRefresh = async () => {
  setRefreshing(true);

  try {
    await fetchMealsByType(tdee);      // reload meals
    await loadLocalMealsForDate(selectedDate); // refresh local calories/macros
  } catch (err) {
    console.error("Refresh failed", err);
  } finally {
    setRefreshing(false);
  }
};


useEffect(() => {
  const fetchFavorites = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const favSnapshot = await getDocs(
      collection(db, "users", user.uid, "favorites")
    );
    const favs = {};
    favSnapshot.forEach((doc) => {
      favs[doc.id] = true;
    });
    setFavorites(favs);
  };

  fetchFavorites();
}, []);


const toggleFavorite = async (meal) => {
  const user = auth.currentUser;
  if (!user) return;

  // Determine current favorite state (use current favorites state, not relying on setState)
  const currentlyFav = !!favorites[meal.id];

  // Optimistically update local favorites state
  setFavorites((prev) => ({
    ...prev,
    [meal.id]: !currentlyFav,
  }));

  try {
    const favRef = doc(db, "users", user.uid, "favorites", meal.id);

    if (!currentlyFav) {
      // add favorite
      await setDoc(favRef, {
        mealId: meal.id,
        mealName: meal.mealName,
        image: meal.image || null,
        calories: meal.calories || 0,
        timestamp: new Date(),
      });
    } else {
      // remove favorite
      await deleteDoc(favRef);
    }

    // Optional: update mealsByType so meal objects also carry isFavorite
    setMealsByType((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach((type) => {
        copy[type] = copy[type].map((m) =>
          m.id === meal.id ? { ...m, isFavorite: !currentlyFav } : m
        );
      });
      return copy;
    });
  } catch (err) {
    console.error("Error updating favorite:", err);
    // revert optimistic update on failure
    setFavorites((prev) => ({
      ...prev,
      [meal.id]: currentlyFav,
    }));
    // optional: alert user
    // Alert.alert("Error", "Could not update favorite. Please try again.");
  }
};





// Function to check and show health warnings
const checkHealthWarnings = ({ caloriesEaten, caloriesLeft, caloriesBurned }) => {
  const warnings = [];

  if (caloriesLeft < 0) {
    warnings.push(
      "You’ve exceeded your daily calorie goal. Regular overeating can slow progress and affect balance."
    );
  }

  if (caloriesBurned < 0) {
    warnings.push(
      "Inconsistent burned-calorie data detected. Verify your activity records to maintain accurate tracking."
    );
  }

  if (caloriesEaten < 0) {
    warnings.push(
      "Calorie data appears inconsistent. Review your meal records to ensure accurate tracking."
    );
  }

  if (warnings.length > 0) {
    Alert.alert(
      "⚠️ Health Advisory",
      `${warnings.join(
        "\n\n"
      )}\n\nMaintain balance for best results. Consult a licensed nutrition expert if needed.`,
      [{ text: "Understood", style: "default" }]
    );

    console.warn("Health Advisory:", { caloriesEaten, caloriesLeft, caloriesBurned });
  }

  return warnings;
};

// Updated loadLocalMealsForDate (no warnings)
const loadLocalMealsForDate = async (date) => {
  const user = auth.currentUser;
  if (!user || !tdee) return;

  const uid = user.uid;

  let totalCalories = 0;
  let totalCarbs = 0;
  let totalProtein = 0;
  let totalFat = 0;

  for (const tab of ["Breakfast", "Lunch", "Dinner"]) {
    const key = `${uid}_loggedMeals_${tab}`;
    const stored = await AsyncStorage.getItem(key);
    const meals = stored ? JSON.parse(stored) : [];

    const filtered = meals.filter((m) =>
      moment(m.createdAt).isSame(moment(date), "day")
    );

    for (const meal of filtered) {
      const c = Number(meal.calories) || 0;
      totalCalories += c;
      if (meal.macros) {
        totalCarbs += Number(meal.macros.carbs) || 0;
        totalProtein += Number(meal.macros.protein) || 0;
        totalFat += Number(meal.macros.fat) || 0;
      }
    }
  }

  const rawCaloriesEaten = totalCalories;
  const rawCaloriesBurned = Math.round(totalCalories * 0.1);
  const rawCaloriesLeft = (tdee || 0) - rawCaloriesEaten;

  setCaloriesEaten(rawCaloriesEaten);
  setCaloriesBurned(rawCaloriesBurned);
  setCaloriesLeft(rawCaloriesLeft);

  setMacrosPercent({
    carbs: Math.round(totalCarbs),
    protein: Math.round(totalProtein),
    fat: Math.round(totalFat),
  });

  // Return values for external usage (like checking warnings)
  return {
    caloriesEaten: rawCaloriesEaten,
    caloriesBurned: rawCaloriesBurned,
    caloriesLeft: rawCaloriesLeft,
    carbs: totalCarbs,
    protein: totalProtein,
    fat: totalFat,
  };
};

useEffect(() => {
  const fetchAndCheck = async () => {
    // Only show warning if selectedDate is today
    const today = new Date();
    const selected = new Date(selectedDate);

    const isToday =
      selected.getFullYear() === today.getFullYear() &&
      selected.getMonth() === today.getMonth() &&
      selected.getDate() === today.getDate();

    if (!isToday) return; // skip if not today

    const dayData = await loadLocalMealsForDate(selectedDate);
    checkHealthWarnings({
      caloriesEaten: dayData.caloriesEaten,
      caloriesLeft: dayData.caloriesLeft,
      caloriesBurned: dayData.caloriesBurned,
    });
  };

  fetchAndCheck();
}, [selectedDate, updateFlag, tdee]);




useEffect(() => {
  if (selectedDate) {
    loadLocalMealsForDate(selectedDate);
  }
}, [selectedDate, updateFlag]);

useEffect(() => {
  const loadUserData = async () => {
    try {
      // ✅ Load from local storage first (offline-safe)
        const cachedProfile = await AsyncStorage.getItem("userProfile");
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          console.log(parsed.createdAt)
          if (parsed.createdAt) {
            setAccountCreatedAt(new Date(parsed.createdAt));
          }
        }


      // ✅ Then, optionally refresh from Firestore if online
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.createdAt) {
            const created =
              data.createdAt.toDate?.() ?? new Date(data.createdAt);
            setAccountCreatedAt(created);

            // Update local copy if newer
            await AsyncStorage.mergeItem(
              "userProfile",
              JSON.stringify({ createdAt: created.toISOString() })
            );
          }
        }
      }
    } catch (err) {
      console.error("Error loading user data:", err);
    }
  };

  loadUserData();
}, []);





const listenToMealRatings = (setMealRatings) => {
  const feedbackRef = collection(db, "mealFeedback");

  const unsubscribe = onSnapshot(
    feedbackRef,
    (snapshot) => {
      const ratingsMap = {}; // mealId -> { total, count }

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.mealId && typeof data.rating === "number") {
          if (!ratingsMap[data.mealId]) {
            ratingsMap[data.mealId] = { total: 0, count: 0 };
          }
          ratingsMap[data.mealId].total += data.rating;
          ratingsMap[data.mealId].count += 1;
        }
      });

      const computedRatings = {};
      Object.keys(ratingsMap).forEach((mealId) => {
        const { total, count } = ratingsMap[mealId];
        computedRatings[mealId] = {
          avg: total / count,
          count,
        };
      });

      setMealRatings(computedRatings);
    },
    (error) => {
      console.error("Error listening to mealFeedback updates:", error);
    }
  );

  return unsubscribe;
};


useEffect(() => {
  const unsubscribe = listenToMealRatings(setMealRatings);
  return () => unsubscribe(); // cleanup when unmounting
}, []);

const getRecommendedMeals = (allMeals = [], userData) => {
  if (!userData || !Array.isArray(allMeals) || allMeals.length === 0) return [];

  const userAllergies = Array.isArray(userData.Allergies) ? userData.Allergies : [];
  const userGoal = (userData.Goal || "").toLowerCase();
  const userHealthConditions = Array.isArray(userData.HealthConditions)
    ? userData.HealthConditions.filter(Boolean).map(c => c.toLowerCase())
    : [];
  const maxCalories = Number(userData.requiredCalories) || 2000;

  const today = new Date().toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();

  return allMeals.filter((meal) => {
    const mealCalories = Number(meal.calories) || 0;
    if (mealCalories > maxCalories) return false;

    const ingredientsText = (meal.ingredients || []).join(" ").toLowerCase();
    if (userAllergies.some(a => a && ingredientsText.includes(a.toLowerCase()))) return false;

    if (meal.goal && meal.goal.toLowerCase() !== userGoal) return false;

    const mealGoodFor = (meal.goodFor || []).map(c => c.toLowerCase());
    const healthSafe =
      userHealthConditions.length === 0 ||
      userHealthConditions.includes("none") ||
      mealGoodFor.some(condition => userHealthConditions.includes(condition));
    if (!healthSafe) return false;

    const availability = (meal.availability || []).map(d => d.toLowerCase());
    if (!availability.some(d => d.startsWith(today))) return false;

    return true;
  });
};


// 🔹 Realtime meal listener grouped by type
const fetchMealsByType = useCallback((userData) => {
  if (!userData?.uid) return () => {};

  const q = query(collection(db, "meals"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const allMeals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const recommendedMeals = getRecommendedMeals(allMeals, userData);

      // Group by type
      const grouped = { Breakfast: [], Lunch: [], Dinner: [] };
      recommendedMeals.forEach(meal => {
        const type = meal.category || "Breakfast";
        if (grouped[type]) grouped[type].push(meal);
      });

      setMealsByType(grouped);
      setMealsLoading(false);
    },
    (error) => {
      console.error("Error fetching meals:", error);
      setMealsLoading(false);
    }
  );

  return unsubscribe;
}, []);






useEffect(() => {
  if (!userData?.uid) return;
  const unsubscribe = fetchMealsByType(userData);
  return () => unsubscribe && unsubscribe();
}, [userData]);




useEffect(() => {
  if (showSidebar) {
    sidebarAnim.value = withTiming(0, { duration: 300 }); // slide in
    overlayOpacity.value = withTiming(1, { duration: 300 });
  } else {
    sidebarAnim.value = withTiming(-SIDEBAR_WIDTH, { duration: 300 }); // slide out left
    overlayOpacity.value = withTiming(0, { duration: 300 });
  }
}, [showSidebar]);


  


const animatedSidebarStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: sidebarAnim.value }],
}));

const animatedOverlayStyle = useAnimatedStyle(() => ({
  backgroundColor: `rgba(0,0,0,${overlayOpacity.value * 0.4})`,
}));

/// Normalize date to midnight
const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Go to previous day
const goToPreviousDay = useCallback(() => {
  if (!accountCreatedAt) return;
  const createdDate = normalizeDate(accountCreatedAt);
  const newDate = normalizeDate(selectedDate);
  newDate.setDate(newDate.getDate() - 1);

  if (newDate < createdDate) {
    setSelectedDate(createdDate);
    return;
  }

  setSelectedDate(newDate);
}, [selectedDate, accountCreatedAt]);

// Go to next day
const goToNextDay = useCallback(() => {
  const today = normalizeDate(new Date());
  const newDate = normalizeDate(selectedDate);
  newDate.setDate(newDate.getDate() + 1);

  if (newDate > today) return;
  setSelectedDate(newDate);
}, [selectedDate]);

// Disable state based purely on offline accountCreatedAt
const isPreviousDisabled = useMemo(() => {
  if (!accountCreatedAt) return true;
  const created = normalizeDate(accountCreatedAt);
  const current = normalizeDate(selectedDate);
  return current.getTime() <= created.getTime();
}, [selectedDate, accountCreatedAt]);

const isNextDisabled = useMemo(() => {
  const today = normalizeDate(new Date());
  const current = normalizeDate(selectedDate);
  return current.getTime() >= today.getTime();
}, [selectedDate]);



  const onDateChange = (event, date) => {
    setShowPicker(Platform.OS === "ios");
    if (date) setSelectedDate(date);
  };
const handleLogout = async () => {
  try {
    const uid = auth.currentUser?.uid
    if (uid) {
      const userStatusRef = ref(rtdb, `/availability/${uid}`)
      await set(userStatusRef, {
        state: "offline",
        lastChanged: serverTimestamp(),
      })
    }

    await signOut(auth)
    // App.js will show Login automatically
  } catch (e) {
    console.log("Logout error:", e)
  }
}

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

  // ✅ Check internet before syncing
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    Alert.alert("Error syncing", "No internet connection. Please try again later.");
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

    Alert.alert("Success", "Your meal tracking is now synced.");
  } catch (error) {
    console.error("handleSync Error:", error);
    Alert.alert("Sync Failed", "Unable to sync meals.");
  }
}




return (
    <View style={styles.container} ref={scrollViewRef}>
    {/* Fixed Header / Greetings */}
    <View
      style={{
        width: '100%',
        backgroundColor: '#22c55e',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 5,
      }}
    >
      <TouchableOpacity onPress={() => setShowSidebar(true)}>
        {userData?.photoURL ? (
          <Image
            source={{ uri: userData.photoURL }}
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              borderWidth: 2,
              borderColor: '#fff',
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: '#ffffff50',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>
              {(userData?.firstName?.charAt(0) || 'U') +
                (userData?.lastName?.charAt(0) || '')}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={{ flex: 1, marginLeft: 16 }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>
          {greeting}
        </Text>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 2 }}>
          {userData?.firstName || 'User'}
        </Text>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('NotificationsScreen')}>
        <Ionicons name="notifications-outline" size={28} color="#fff" />
      </TouchableOpacity>
    </View>


    {/* Scrollable Content */}
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
    {accountCreatedAt && (
  <View style={styles.dateNav}>
    <TouchableOpacity
      style={styles.dateArrow}
      onPress={goToPreviousDay}
      disabled={isPreviousDisabled}
    >
      <Ionicons
        name="chevron-back"
        size={30}
        color={isPreviousDisabled ? "#d1d5db" : "#555555"}
      />
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.dateTextWrapper}
      onPress={() => setShowPicker(true)}
    >
      <Text style={styles.dateText}>
        {isToday ? "Today" : selectedDate.toDateString()}
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.dateArrow}
      onPress={goToNextDay}
      disabled={isNextDisabled}
    >
      <Ionicons
        name="chevron-forward"
        size={30}
        color={isNextDisabled ? "#d1d5db" : "#555555"}
      />
    </TouchableOpacity>
  </View>
)}

      {showPicker && (
       <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
          minimumDate={accountCreatedAt ? new Date(accountCreatedAt) : undefined}
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

      {/* Macros Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Macros</Text>
        {mealsLoading ? (
          <>
            <MacroSkeleton />
            <MacroSkeleton />
            <MacroSkeleton />
          </>
        ) : (
          <View style={styles.barGraphContainer}>
            {[
              { label: "Carbs", value: macros.carbs, color: "#6495ED" },
              { label: "Protein", value: macros.protein, color: "#C9CC3F" },
              { label: "Fat", value: macros.fat, color: "#CC5500" },
            ].map((item) => (
              <View style={styles.barColumn} key={item.label}>
                <View style={[styles.barTrack, { justifyContent: "flex-end" }]}>
                  <AnimatedBar value={item.value} color={item.color} />
                </View>
                <Text style={styles.barLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={styles.barValue}>{item.value}g</Text>
              </View>
            ))}
          </View>
        )}
      </View>

<View style={{ marginTop: 16 }}>
  <Text style={styles.sectionTitle}>Meal Suggestions</Text>

  {!isConnected ? (
    <Text style={{ color: "#6b7280", marginTop: 8 }}>
      Unable to fetch meal suggestions. Please check your internet connection.
    </Text>
  ) : (
    ["Breakfast", "Lunch", "Dinner"].map((type) => {
      const meals = mealsByType[type] || [];

      return (
        <View
          key={type}
          ref={(el) => (sectionRefs.current[type] = el)}
          style={{ marginBottom: 24 }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#9ca3af",
              marginBottom: 8,
            }}
          >
            {type}
          </Text>

          {meals.length === 0 ? (
            <Text style={{ color: "#6b7280", marginTop: 8 }}>
              No {type.toLowerCase()} meals available.
            </Text>
          ) : (
            meals.map((meal) => {
              const isAvailable = meal.mealStatus === "Available";
              const isLoading = loadingImages[meal.id];

              return (
                <View
                  key={meal.id}
                  style={[styles.mealCardContainer, { position: "relative" }]}
                >
                  {/* Heart Icon */}
                  <TouchableOpacity
                    onPress={() => toggleFavorite(meal)}
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 10,
                      zIndex: 2,
                    }}
                  >
                    <Ionicons
                      name={favorites[meal.id] ? "heart" : "heart-outline"}
                      size={22}
                      color={favorites[meal.id] ? "#22c55e" : "#9ca3af"}
                    />
                  </TouchableOpacity>

                  {/* Meal Image */}
                  <View style={{ position: "relative" }}>
                    {meal.image ? (
                      <>
                        <Image
                          source={{ uri: meal.image }}
                          style={styles.mealCardImage}
                          onLoadStart={() => handleImageLoadStart(meal.id)}
                          onLoadEnd={() => handleImageLoadEnd(meal.id)}
                        />
                        {isLoading && (
                          <View
                            style={[
                              styles.mealCardImage,
                              {
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundColor: "rgba(0,0,0,0.05)",
                              },
                            ]}
                          >
                            <ActivityIndicator size="small" color="#22c55e" />
                          </View>
                        )}
                      </>
                    ) : (
                      <View
                        style={[
                          styles.mealCardImage,
                          { backgroundColor: "#e0e0e0" },
                        ]}
                      />
                    )}
                  </View>

                  {/* Meal Details */}
                  <View style={styles.mealCardDetails}>
                    <Text
                      style={styles.mealCardName}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {meal.mealName.length > 20
                        ? `${meal.mealName.substring(0, 15)}...`
                        : meal.mealName}
                    </Text>

                    {meal.description && (
                      <Text
                        style={styles.mealCardDescription}
                        numberOfLines={2}
                      >
                        {meal.description}
                      </Text>
                    )}

                    {/* Calories + Price + Rating */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 6,
                      }}
                    >
                      {/* Left: Calories */}
                      <Text style={{ color: "#555555", fontWeight: "500" }}>
                        {meal.calories ?? 0} kcal
                      </Text>

                      {/* Right: Price + Rating */}
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text
                          style={[styles.mealCardPrice, { color: "#22c55e", marginRight: 8 }]}
                        >
                          {meal.price ?? 0} PHP
                        </Text>
                        <Ionicons name="star" size={16} color="#fbbf24" />
                        <Text style={{ marginLeft: 4, color: "#555555" }}>
                          {mealRatings[meal.id]
                            ? `${mealRatings[meal.id].avg.toFixed(1)} (${mealRatings[meal.id].count})`
                            : "0.0"}
                        </Text>
                      </View>
                    </View>

                    {/* Order / Unavailable Button */}
                    <TouchableOpacity
                      disabled={!isAvailable}
                      style={[
                        styles.orderButton,
                        {
                          alignSelf: "flex-end",
                          marginTop: 10,
                          backgroundColor: isAvailable ? "#22c55e" : "#9ca3af",
                        },
                      ]}
                      onPress={() => {
                        if (isAvailable) nav.navigate("MealDetail", { meal });
                      }}
                    >
                      <Text style={styles.orderButtonText}>
                        {isAvailable ? "Order Now" : "Unavailable"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      );
    })
  )}
</View>




    </ScrollView>

  {/* Sidebar */}
  {showSidebar && (
      <Animated.View style={[styles.sidebarOverlay, animatedOverlayStyle]}>
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

        <Animated.View style={[styles.sidebar, animatedSidebarStyle]}>
          <View style={styles.sidebarHeaderModern}>
            {userData?.photoURL ? (
              <Image
                source={{ uri: userData.photoURL }}
                style={styles.sidebarUserImageModern}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.sidebarUserImageModern,
                  {
                    backgroundColor: "#d1fae5",
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    color: "#555555",
                  }}
                >
                  {(userData?.firstName?.charAt(0) || "U") +
                    (userData?.lastName?.charAt(0) || "")}
                </Text>
              </View>
            )}

            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text
                style={styles.sidebarUserNameModern}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {`${userData?.firstName || ""}`.trim() || "User"}
              </Text>
              <View style={styles.availabilityContainer}>
                <View
                  style={[
                    styles.availabilityDot,
                    { backgroundColor: isOnline ? "#22c55e" : "#9ca3af" },
                  ]}
                />
                <Text style={styles.availabilityText}>
                  {isOnline ? "Online" : "Offline"}
                </Text>
              </View>
            </View>
          </View>

          {/* Sidebar Options */}
          {[
            { icon: "person-outline", label: "Account", action: () => navigation.navigate("Account") },
            { icon: "settings-outline", label: "Settings", action: () => navigation.navigate("Settings") },
            { icon: "sync-outline", label: "Sync", action: handleSync },
            { icon: "chatbox-outline", label: "Need Help?", action: () => navigation.navigate("Help") },
            { icon: "log-out-outline", label: "Logout", action: handleLogout },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.sidebarItemModern}
              onPress={item.action}
            >
              <Ionicons name={item.icon} size={22} color="#555555" />
              <Text style={styles.sidebarItemTextModern}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Animated.View>
    )}

  </View>
);
    
}

const styles = StyleSheet.create({
  // Containers
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 24, paddingTop: 48, paddingBottom: 120 },

  // Header
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24,backgroundColor:"#22c55e",paddingVertical:50 },
  profileCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#555555",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  profileInitial: { fontSize: 20, color: "#ffffff", fontWeight: "bold" },
  greetingBox: { flex: 1 },
  greeting: { fontSize: 16, color: "#ffffff" },
  name: { fontSize: 20, fontWeight: "700", color: "#ffffff" },

  // Sidebar
  sidebarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 999,
  },
  sidebarBackdrop: { flex: 1 },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: "#ffffff",
    padding: 24,
    paddingTop: 48,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 10,
    zIndex: 1000,
  },
  sidebarHeaderModern: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  sidebarUserImageModern: { width: 50, height: 50, borderRadius: 25 },
  sidebarUserNameModern: {
  fontSize: 18,
  fontWeight: "700",
  color: "#555555",
  flexShrink: 1,          // allows the text to shrink
  flexWrap: "nowrap",     // prevent wrapping
  numberOfLines: 1,       // ensures single line
  ellipsizeMode: "tail",  // adds "..." if text is too long
},
  availabilityContainer: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  availabilityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  availabilityText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },

sidebarItemModern: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 16,
  backgroundColor: "#ffffff", // flat white
  marginBottom: 0,            // remove spacing between items if desired
  borderRadius: 0,            // no rounding
  shadowColor: "transparent", // remove shadow
  elevation: 0,               // remove Android shadow
},

sidebarItemTextModern: {
  marginLeft: 12,
  fontSize: 16,
  fontWeight: "600",
  color: "#555555",
},
  // Date Navigation
  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 20, width: "100%" },
  dateArrow: { flex: 1, alignItems: "center" },
  dateTextWrapper: { flex: 2, alignItems: "center" },
  dateText: { fontSize: 18, fontWeight: "700", color: "#555555" },

  // Circle Progress
  circleRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  circleItem: { alignItems: "center", flex: 1, backgroundColor: "transparent" },
  circleValueContainer: { position: "absolute", top: SIZE / 2 - 18, left: 0, right: 0, alignItems: "center" },
  circleValue: { fontSize: 14, fontWeight: "700", color: "#111827" },
  unit: { fontSize: 15, color: "#6b7280", marginTop: 2 },
  circleLabel: { marginTop: 10, fontSize: 14, color: "#374151" },

  // Sections
  section: { marginBottom: 26 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#555555", marginBottom: 12 },

  // Macros
  macroRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  macroLabel: { width: 70, fontSize: 14, color: "#4b5563" },
  progressBar: { flex: 1, height: 10, backgroundColor: "#e5e7eb", borderRadius: 5, overflow: "hidden", marginHorizontal: 10 },
  progressFill: { height: "100%", borderRadius: 5 },
  percent: { width: 40, textAlign: "right", fontSize: 14, color: "#374151" },

  // Buttons
  addButton: { flexDirection: "row", backgroundColor: "#22c55e", paddingVertical: 14, borderRadius: 16, justifyContent: "center", alignItems: "center", shadowColor: "#22c55e", shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 16, marginLeft: 8 },
  logButton: { marginTop: 10, backgroundColor: "#22c55e", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, alignSelf: "flex-end" },
  logButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Suggestions / Cards
  suggestionItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 16, borderRadius: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 3 },
  suggestionItemHorizontal: { width: CARD_WIDTH, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 20, padding: 16, marginRight: 16, flexShrink: 0, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 3, minHeight: 100 },
  imageContainer: { width: 80, height: 80, borderRadius: 16, overflow: "hidden", marginRight: 16, backgroundColor: "#f3f4f6", justifyContent: "flex-start", alignItems: "center", alignSelf: "flex-start" },
  suggestionImage: { width: "100%", height: "100%", resizeMode: "cover" },
  suggestionText: { flex: 1, justifyContent: "flex-start", alignItems: "flex-start", flexShrink: 1 },
  suggestionTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, flexShrink: 0 },
  suggestionName: { fontSize: 16, fontWeight: "600", color: "#111827", flex: 1, flexWrap: "wrap", marginRight: 8, minWidth: 0 },
  suggestionCalories: { fontSize: 14, color: "#16a34a", fontWeight: "500" },
  suggestionDescription: { fontSize: 13, color: "#6b7280", marginTop: 4 },

  // Carousel
  carouselContent: { paddingHorizontal: 24 },
  suggestionSection: { width: "100%", marginBottom: 32 },

  // Skeletons
  circleSkeleton: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: "#e5e7eb", justifyContent: "center", alignItems: "center" },
  skeletonText: { fontSize: 14, fontWeight: "700", color: "#9ca3af" },
  macroSkeletonRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  macroSkeletonLabel: { width: 70, height: 14, borderRadius: 4, backgroundColor: "#e5e7eb", marginRight: 10 },
  macroSkeletonBar: { flex: 1, height: 10, borderRadius: 5, backgroundColor: "#e5e7eb", marginRight: 10 },
  macroSkeletonValue: { width: 40, height: 14, borderRadius: 4, backgroundColor: "#e5e7eb" },

  // Unavailable state
  unavailableCard: { backgroundColor: "#e5e7eb", opacity: 0.6 },
  unavailableText: { color: "#9ca3af" },
  unavailableLabelContainer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", zIndex: 2 },
unavailableOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "rgba(0,0,0,0.35)",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 16,
  zIndex: 5,
},
unavailableLabel: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "bold",
  backgroundColor: "rgba(0,0,0,0.9)", // red
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 8,
},
suggestionItemVertical: {
  width: "100%",
  borderRadius: 16,
  backgroundColor: "#ffffff",
  marginBottom: 16,
  overflow: "hidden",
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
  flexDirection: "row",
  padding: 12,
},
imageContainerVertical: {
  width: 100,
  height: 100,
  borderRadius: 12,
  overflow: "hidden",
  marginRight: 12,
},
suggestionImageVertical: {
  width: "100%",
  height: "100%",
  borderRadius: 12,
},
suggestionTextVertical: {
  flex: 1,
  justifyContent: "space-between",
},
sectionSubtitle: {
  fontSize: 18,
  fontWeight: "600",
  color: "#111827",
},


barGraphContainer: {
    flexDirection: "row",
    justifyContent: "space-around", // you can use "space-between" if you want more space
    alignItems: "flex-end",
    paddingVertical: 8,
  },
  barColumn: {
    alignItems: "center",
    width: 100,       // increased width for wider bars
  },
  barTrack: {
    width: "100%",
    height: 80,      // keep it short and modern
    backgroundColor: "#e5e7eb",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: "hidden",
    marginBottom: 6,
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  barLabel: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
  },
  barValue: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  mealCardContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mealCardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: "cover",
  },
  mealCardDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  mealCardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  mealCardDescription: {
    fontSize: 13,
    color: "#6b7280",
    marginVertical: 4,
  },
  mealCardPrice: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111",
  },
  orderButton: {
    marginTop: 6,
    backgroundColor: "#4CAF50",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  orderButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  stickySuggestions: {
  position: "absolute",
  top: 110, // Adjust based on your header height
  left: 0,
  right: 0,
  zIndex: 50,
  backgroundColor: "#fff",
  paddingHorizontal: 20,
  paddingBottom: 8,
  borderBottomWidth: 1,
  borderColor: "#e5e7eb",
},

suggestionChip: {
  backgroundColor: "#f3f4f6",
  paddingVertical: 8,
  paddingHorizontal: 16,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "#d1d5db",
},

suggestionChipActive: {
  backgroundColor: "#2563eb",
  borderColor: "#2563eb",
},

suggestionChipText: {
  color: "#374151",
  fontWeight: "600",
},

suggestionChipTextActive: {
  color: "#fff",
},

});
