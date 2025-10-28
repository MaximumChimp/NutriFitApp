import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  SafeAreaView,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
  RefreshControl,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, onSnapshot, query, where, getDocs,orderBy,doc} from "firebase/firestore";
import { db } from "../../../../config/firebase-config";
import { getAuth } from "firebase/auth";
import NoInternetScreen from "./NoInternetScreen";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import * as Location from "expo-location";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import NetInfo from "@react-native-community/netinfo";
import { useCart } from "../../../context/CartContext";
import CartIconWithBadge from "./utils/CartIconWithBadge";
import { LinearGradient } from "expo-linear-gradient";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const numColumns = 2;
const spacing = 16;
const cardHeight = 210;
const cardWidth = (SCREEN_WIDTH - spacing * (numColumns + 1)) / numColumns;
const BANNER_ITEM_WIDTH = SCREEN_WIDTH - 32;

export default function OrderScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const bannerRef = useRef(null);
  const filterAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fabScale = useRef(new Animated.Value(1)).current;

  const [meals, setMeals] = useState([]);
  const [filteredMeals, setFilteredMeals] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState(null);
  const [addressLoading, setAddressLoading] = useState(true);
  const [recommendedMeals, setRecommendedMeals] = useState([]);
  // 🔹 store multiple active orders
  const [activeOrders, setActiveOrders] = useState([]);

  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(1000);
  const [caloriesMin, setCaloriesMin] = useState(0);
  const [caloriesMax, setCaloriesMax] = useState(2000);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [userData, setUserData] = useState(null);
  const [allMeals, setAllMeals] = useState([]);
  const [loadingImages, setLoadingImages] = useState({});
  const { orderId, friendlyId } = route.params || {};
  const [favorites, setFavorites] = useState({});
  const [bannerMeals, setBannerMeals] = useState([]);

  const { cartItems } = useCart();


  // Called when an image starts loading
const handleImageLoadStart = (mealId) => {
  setLoadingImages((prev) => ({ ...prev, [mealId]: true }));
};

// Called when an image finishes loading
const handleImageLoadEnd = (mealId) => {
  setLoadingImages((prev) => ({ ...prev, [mealId]: false }));
};

const toggleFavorite = (meal) => {
  setFavorites((prev) => ({
    ...prev,
    [meal.id]: !prev[meal.id],
  }));
};

useEffect(() => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const unsubscribe = onSnapshot(
    doc(db, "users", user.uid),
    (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
      }
    },
    (err) => console.error("User fetch error:", err)
  );

  return () => unsubscribe();
}, []);


  // --- Internet Connection ---
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state =>
      setIsConnected(state.isConnected && state.isInternetReachable)
    );
    return unsubscribe;
  }, []);

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };




  // --- Fetch confirmed location from SelectLocation ---
useFocusEffect(
  useCallback(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      const returnedParams = route.params;

      if (returnedParams?.coords) {
        setCoords(returnedParams.coords);
        await AsyncStorage.setItem("userCoords", JSON.stringify(returnedParams.coords));
      }

      if (returnedParams?.address) {
        setAddress(returnedParams.address);
        await AsyncStorage.setItem("userAddress", returnedParams.address);
      }
    });

    return unsubscribe;
  }, [navigation, route.params])
);


useEffect(() => {
  (async () => {
    setAddressLoading(true);

    try {
      // 1️⃣ Try saved location
      const savedCoords = await AsyncStorage.getItem("userCoords");
      const savedAddress = await AsyncStorage.getItem("userAddress");
      if (savedCoords && savedAddress) {
        const coordsObj = JSON.parse(savedCoords);
        setCoords(coordsObj);
        setAddress(savedAddress);
        setAddressLoading(false);
        return;
      }

      let latitude, longitude;

      // 2️⃣ Attempt GPS (may fail on Huawei)
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
        }
      } catch (gpsErr) {
        console.warn("GPS unavailable:", gpsErr);
      }

      // 3️⃣ Fallback to IP location
      if (!latitude || !longitude) {
        try {
          const ipRes = await fetch("https://ipapi.co/json/");
          const ipData = await ipRes.json();
          latitude = ipData.latitude;
          longitude = ipData.longitude;
        } catch (ipErr) {
          console.warn("IP geolocation failed:", ipErr);
        }
      }

      // 4️⃣ Last fallback: default coordinates
      if (!latitude || !longitude) {
        latitude = 14.5995;   // Manila
        longitude = 120.9842;
        console.warn("Using default coordinates");
      }

      setCoords({ latitude, longitude });

      // 5️⃣ Reverse geocode via Nominatim
      let displayName = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
          { headers: { "User-Agent": "NutriFitApp/1.0" } }
        );
        const data = await res.json();
        if (data?.display_name) displayName = data.display_name;
      } catch {
        // ignore, fallback to coordinates
      }

      setAddress(displayName);

      // 6️⃣ Save for next time
      await AsyncStorage.setItem("userCoords", JSON.stringify({ latitude, longitude }));
      await AsyncStorage.setItem("userAddress", displayName);
    } catch (err) {
      console.error(err);
      setCoords({ latitude: 14.5995, longitude: 120.9842 });
      setAddress("14.599, 120.984");
    } finally {
      setAddressLoading(false);
    }
  })();
}, []);




// --- Check Active Orders ---
useEffect(() => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const q = query(
    collection(db, "orders"),
    where("userId", "==", user.uid)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    let orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // ✅ Keep only active orders (not done/cancelled)
    const inactiveStatuses = ["done", "cancelled"];
    orders = orders.filter(o => {
      const status = (o.status || "").toLowerCase();
      return !inactiveStatuses.includes(status);
    });

    // ✅ Keep only today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    orders = orders.filter(o => {
      if (!o.placedAt?.seconds) return false;
      const orderDate = new Date(o.placedAt.seconds * 1000);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });

    // Sort by placedAt descending
    orders.sort((a, b) => (b.placedAt?.seconds || 0) - (a.placedAt?.seconds || 0));

    setActiveOrders(orders);
  });

  return () => unsubscribe();
}, []);




// --- FAB Pulse Animation ---
  useEffect(() => {
    if (activeOrders.length === 0) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(fabScale, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(fabScale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [activeOrders]);


  // --- Refresh Meals ---
const handleRefresh = () => {
  setRefreshing(true);
  // just trigger state refresh, snapshot listener keeps meals updated
  setMeals([...meals]);
  setRefreshing(false);
};



    // --- Fetch Meals with Ratings ---
useEffect(() => {
  const mealsRef = collection(db, "meals");
  const feedbackRef = collection(db, "mealFeedback");

  let currentMeals = [];
  let currentFeedbacks = [];

  const calculateMealsWithRatings = () => {
    const feedbackCache = currentFeedbacks.reduce((acc, f) => {
      if (!acc[f.mealId]) acc[f.mealId] = [];
      acc[f.mealId].push(f.rating);
      return acc;
    }, {});

    const mealsWithRatings = currentMeals.map((doc) => {
      const data = doc.data();
      const ratings = feedbackCache[doc.id] || [];
      const totalRatings = ratings.length;
      const avg =
        totalRatings > 0
          ? ratings.reduce((a, b) => a + b, 0) / totalRatings
          : 0;

      return {
        id: doc.id,
        mealName: data.mealName ?? "Unnamed Meal",
        image: data.image ?? "https://via.placeholder.com/150",
        price: data.price ?? 0,
        mealStatus: data.mealStatus ?? "Unavailable",
        averageRating: avg,
        totalRatings,
        description:data.description ?? 'No description Available',
        calories: data.calories ?? 0,
        protein: data.protein ?? 0,
        carbs: data.carbs ?? 0,
        fat: data.fat ?? 0,
        category: data.category ?? "Others",
        availability: data.availability ?? [],
        ingredients: data.ingredients ?? [],
        goal: data.goal ?? "",
        goodFor: data.goodFor ?? [],
      };
    });

    setMeals(mealsWithRatings);
    setFilteredMeals(mealsWithRatings);
    setLoading(false);
  };

  const unsubscribeMeals = onSnapshot(mealsRef, (snapshot) => {
    currentMeals = snapshot.docs;
    calculateMealsWithRatings();
  });

  const unsubscribeFeedbacks = onSnapshot(feedbackRef, (snapshot) => {
    currentFeedbacks = snapshot.docs.map((doc) => doc.data());
    calculateMealsWithRatings();
  });

  return () => {
    unsubscribeMeals();
    unsubscribeFeedbacks();
  };
}, []);


// --- Search & Filters ---
useEffect(() => {
  // ✅ If filtering "today's meals" → keep them as is
  const isTodayFilterActive = selectedDays.includes("Today") || selectedDays.includes("today");

  if (isTodayFilterActive) {
    // Don't apply any other filters, just show today's meals
    const todaysMeals = meals.filter(meal =>
      Array.isArray(meal.availability) &&
      meal.availability.some(d => d.toLowerCase() === "today")
    );
    setFilteredMeals(todaysMeals);
    return;
  }

  // 🔽 Otherwise, normal filter logic
  let tempMeals = [...meals];

  // 🔎 Search filter
  if (search.trim() !== "") {
    const lowerSearch = search.toLowerCase();
    tempMeals = tempMeals.filter(meal =>
      (meal.mealName || "").toLowerCase().includes(lowerSearch)
    );
  }

  // 🍽 Category filter
  if (selectedCategory) {
    tempMeals = tempMeals.filter(meal => meal.category === selectedCategory);
  }

  // ✅ Available only
  if (showAvailableOnly) {
    tempMeals = tempMeals.filter(meal => meal.mealStatus === "Available");
  }

  // 💰 Price + 🔥 Calories filter
  tempMeals = tempMeals.filter(meal => {
    const price = typeof meal.price === "number" ? meal.price : 0;
    const calories = typeof meal.calories === "number" ? meal.calories : 0;
    return (
      price >= priceMin &&
      price <= priceMax &&
      calories >= caloriesMin &&
      calories <= caloriesMax
    );
  });

  // 📅 Filter by selected days
  if (selectedDays.length > 0) {
    tempMeals = tempMeals.filter(meal =>
      Array.isArray(meal.availability) &&
      meal.availability.some(d => selectedDays.includes(d))
    );
  }

  setFilteredMeals(tempMeals);
}, [
  search,
  meals,
  selectedCategory,
  showAvailableOnly,
  priceMin,
  priceMax,
  caloriesMin,
  caloriesMax,
  selectedDays,
]);




  // --- Banner Auto Slide ---
useEffect(() => {
  if (!bannerMeals.length) return;

  const interval = setInterval(() => {
    setBannerIndex(prev => {
      const nextIndex = (prev + 1) % bannerMeals.length;
      if (bannerRef.current) bannerRef.current.scrollToIndex({ index: nextIndex, animated: true });
      return nextIndex;
    });
  }, 4000);

  return () => clearInterval(interval);
}, [bannerMeals]);

  // --- Filter Panel ---
  const toggleFilter = () => {
    if (filterVisible) {
      Animated.timing(filterAnim, { toValue: SCREEN_HEIGHT, duration: 300, useNativeDriver: true }).start(() =>
        setFilterVisible(false)
      );
    } else {
      setFilterVisible(true);
      Animated.timing(filterAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  };


 // --- Recommended Meals ---
const getRecommendedMeals = (allMeals = []) => {
  if (!userData || !Array.isArray(allMeals) || allMeals.length === 0) {
    return [];
  }

  const userAllergies = Array.isArray(userData.Allergies) ? userData.Allergies : [];
  const userGoal = (userData.Goal || "").toLowerCase();
  const userHealthConditions = Array.isArray(userData.HealthConditions)
    ? userData.HealthConditions.filter(Boolean)
    : [];
  const maxCalories = Number(userData.requiredCalories) || 2000;

  // Get today's day short string, e.g., "Mon", "Tue"
  const today = new Date().toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();

  return allMeals.filter((meal) => {
    const mealCalories = Number(meal.calories) || 0;

    // 1️⃣ Skip meals over calorie limit
    if (mealCalories > maxCalories) return false;

    // 2️⃣ Skip meals with user allergies
    const ingredientsText = (meal.ingredients || []).join(" ").toLowerCase();
    if (userAllergies.some(a => a && ingredientsText.includes(a.toLowerCase()))) return false;

    // 3️⃣ Skip meals not matching goal if meal specifies
    if (meal.goal && meal.goal.toLowerCase() !== userGoal) return false;

    // 4️⃣ Skip meals not good for user's health conditions
    const mealGoodFor = (meal.goodFor || []).map(c => c.toLowerCase());
    const healthSafe =
      userHealthConditions.length === 0 ||
      userHealthConditions.includes("None") ||
      mealGoodFor.some(condition => userHealthConditions.map(c => c.toLowerCase()).includes(condition));
    if (!healthSafe) return false;

    // 5️⃣ Only include meals available today
    const availability = (meal.availability || []).map(d => d.toLowerCase());
    if (!availability.some(d => d.startsWith(today))) return false;

    return true;
  });
};




useEffect(() => {
  if (userData && meals.length > 0) {
    const rec = getRecommendedMeals(meals);
    setRecommendedMeals(rec);
  }
}, [userData, meals]);

useEffect(() => {
  const q = query(collection(db, "meals"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const meals = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setAllMeals(meals);
  });

  return () => unsubscribe();
}, []);


// ✅ Use computed meals (with live averageRating)
useEffect(() => {
  if (meals.length === 0) return;

  const bannerMealsData = meals.filter(
    (m) => m.image && m.image.startsWith("http")
  );

  // Randomly pick up to 5
  const selectedBanners = bannerMealsData
    .sort(() => 0.5 - Math.random())
    .slice(0, 5);

  setBannerMeals(selectedBanners);
}, [meals]);


  // --- Skeleton Loader ---
const MealSkeleton = ({ searchActive }) => (
  <SkeletonPlaceholder
    backgroundColor="#e5e7eb"
    highlightColor="#f3f4f6"
    borderRadius={12}
  >
    <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <View style={{ width: 120, height: 100 }} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ width: 16, height: 26, borderRadius: 13 }} />
          <View style={{ width: 26, height: 26, borderRadius: 13 }} />
        </View>
      </View>

      {/* Address row */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        <View style={{ width: 18, height: 30, borderRadius: 9 }} />
        <View style={{ width: 200, height: 14, borderRadius: 4, marginLeft: 8 }} />
      </View>

      {/* Search bar */}
      <View style={{ flexDirection: "row", marginBottom: 20 }}>
        <View style={{ flex: 1, height: 40, borderRadius: 8 }} />
        <View style={{ width: 40, height: 40, borderRadius: 8, marginLeft: 10 }} />
      </View>

      {/* Banner */}
      <View
        style={{
          width: BANNER_ITEM_WIDTH,
          height: 180,
          borderRadius: 12,
          marginBottom: 20,
          alignSelf: "center",
        }}
      />

      {/* Today's Meal title */}
      <View style={{ width: 140, height: 18, borderRadius: 4, marginBottom: 16 }} />

      {/* Grid of cards */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: searchActive ? "flex-start" : "center",
          gap: spacing,
        }}
      >
        {Array(6)
          .fill(0)
          .map((_, index) => (
            <View
              key={index}
              style={{
                width: cardWidth,
                borderRadius: 12,
                padding: 10,
                marginBottom: 10,
              }}
            >
              {/* Image */}
              <View style={{ width: "100%", height: 100, borderRadius: 10, marginBottom: 8 }} />
              {/* Meal name */}
              <View style={{ width: "80%", height: 14, borderRadius: 4, marginBottom: 6 }} />
              {/* Price */}
              <View style={{ width: "40%", height: 12, borderRadius: 4 }} />
            </View>
          ))}
      </View>
    </View>
  </SkeletonPlaceholder>
);


  
const renderMeal = ({ item }) => {
  
  if (!item || !item.id) return null;

  const isUnavailable = item.mealStatus === "Unavailable";
  const activeOrderForMeal = activeOrders.find(order => order.mealId === item.id);
  const hideBikeIcon = activeOrderForMeal
    ? ["done", "cancelled"].includes((activeOrderForMeal.status || "").toLowerCase())
    : false;

  const isLoading = loadingImages[item.id];

  // Safe conversions
  const mealName = item.mealName?.toString() ?? "Unnamed Meal";
  const priceText = typeof item.price === "number" ? item.price.toFixed(2) : 0.00;
  const averageRating = typeof item.averageRating === "number" ? item.averageRating.toFixed(1) : 0.0;
  const totalRatings = typeof item.totalRatings === "number" ? item.totalRatings.toString() : 0;
  const imageUri = item.image?.toString() || "https://via.placeholder.com/150";
  return (
    <View style={{ position: "relative" }}>
      <TouchableOpacity
        style={[styles.card, isUnavailable && { opacity: 0.6 }]}
        onPress={() => navigation.navigate("MealDetail", { meal: item })}
        activeOpacity={0.8}
      >
        <View style={{ width: "100%", height: 150, justifyContent: "center", alignItems: "center" }}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
            onLoadStart={() => handleImageLoadStart(item.id)}
            onLoadEnd={() => handleImageLoadEnd(item.id)}
            defaultSource={require("../../../../assets/meals/placeholder.png")} 
          />
          {isLoading && (
            <ActivityIndicator
              size="small"
              color="#14532d"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                marginLeft: -10,
                marginTop: -10,
              }}
            />
          )}
        </View>

        <View
          style={[
            styles.ratingContainer,
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            },
          ]}
        >
          {/* Calories with icon on the left */}
          <View style={{ flexDirection: "row", alignItems: "center",}}>
            <Ionicons name="flame" size={14} color="#f87171" />
            <Text style={{ fontSize: 12, color: "#6b7280" }}>
              {item.calories} kcal
            </Text>
          </View>

          {/* Star rating on the right */}
          <View style={{ flexDirection: "row", alignItems: "center",}}>
            <Ionicons name="star" size={14} color="#facc15" />
            <Text style={styles.ratingText}>
              {`${averageRating} (${totalRatings})`}
            </Text>
          </View>
        </View>



        <Text style={styles.name} numberOfLines={2}>{mealName}</Text>

        <View style={styles.priceRow}>
         <Text style={styles.price}>
            {`₱ ${priceText}`}
          </Text>
          {!hideBikeIcon && (
            <View style={styles.deliveryRow}>
              <Ionicons name="bicycle" size={14} color="#22c55e" style={{ marginRight: 4 }} />
              <Text style={styles.deliveryText}>Free</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {isUnavailable && (
        <View style={styles.unavailableOverlay}>
          <Text style={styles.unavailableText}>Unavailable</Text>
        </View>
      )}
    </View>
  );
};





  if (!isConnected) return <NoInternetScreen onRetry={() => {}} />;

  

return (
  <SafeAreaView style={styles.container}>
    {/* 🔹 Top Section */}
    <View style={styles.topContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Order Food</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={{ marginRight: 12 }}
            onPress={() => navigation.navigate("FavoriteScreen")}
          >
            <Ionicons name="heart-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <CartIconWithBadge
            count={cartItems.length}
            onPress={() => navigation.navigate("CartScreen")}
          />
        </View>
      </View>

      {/* Address */}
      <TouchableOpacity
        style={styles.addressContainer}
        onPress={() =>
          navigation.navigate("SelectLocationScreen", {
            coords,
            address,
            onLocationSelected: (newCoords, newAddress) => {
              setCoords(newCoords);
              setAddress(newAddress);
            },
          })
        }
        activeOpacity={0.7}
      >
        <Ionicons name="location-outline" size={18} color="#fff" />
        {addressLoading ? (
          <SkeletonPlaceholder>
            <View
              style={{
                width: SCREEN_WIDTH * 0.6,
                height: 14,
                borderRadius: 4,
                marginLeft: 8,
              }}
            />
          </SkeletonPlaceholder>
        ) : (
          <Text style={styles.addressText}>{address}</Text>
        )}
      </TouchableOpacity>
    </View>

    {/* Search + Filter */}
    <View style={styles.searchRow}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search meals..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#6b7280"
      />
      <TouchableOpacity onPress={toggleFilter} style={styles.filterBtn}>
        <Ionicons name="filter-outline" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
{/* 🔹 Dynamic Banner from Meals */}
{/* 🔹 Modern Dynamic Banner */}
<View style={styles.bannerWrapper}>
  {bannerMeals.length > 0 && (
    <>
      <FlatList
        ref={bannerRef}
        data={bannerMeals}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / SCREEN_WIDTH
          );
          setBannerIndex(index);
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate("MealDetail", { meal: item })}
            activeOpacity={0.9}
          >
            <View style={styles.bannerCard}>
              <Image
                source={{ uri: item.image }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.6)"]}
                style={styles.bannerGradient}
              >
                <View style={styles.bannerBottomRow}>
                  <Text style={styles.bannerTitle}>{item.mealName}</Text>

                  <View style={styles.bannerRatingRow}>
                    <Ionicons name="star" size={14} color="#facc15" />
                    <Text style={styles.bannerRatingText}>
                      {item.averageRating?.toFixed(1) ?? "0.0"}
                    </Text>

                    <TouchableOpacity
                      style={styles.orderNowButton}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate("MealDetail", { meal: item })}
                    >
                      <Text style={styles.orderNowText}>Order Now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {bannerMeals.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { opacity: i === bannerIndex ? 1 : 0.4, width: i === bannerIndex ? 20 : 8 },
            ]}
          />
        ))}
      </View>
    </>
  )}
</View>




{loading ? (
  <MealSkeleton searchActive={search.trim() !== ""} />
) : (
  <ScrollView
    showsVerticalScrollIndicator={false}
    refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
    }
    snapToInterval={100}
    decelerationRate="fast"
    contentContainerStyle={{ paddingBottom: 100 }}
  >
    {/* Available Meals Today */}
    <View style={{ marginVertical: 10, minHeight: 100 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 10,
          color: "#14532d",
        }}
      >
        Today's Meal
      </Text>

      {(() => {
        const today = new Date().toLocaleDateString("en-US", { weekday: "short" });
        const normalizeDay = (d) =>
          d ? d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3).toLowerCase() : "";
        const todayMeals = filteredMeals.filter(
          (meal) =>
            Array.isArray(meal.availability) &&
            meal.availability.some((d) => normalizeDay(d) === normalizeDay(today))
        );
        const isWeekend = ["Sat", "Sun"].includes(today);

        return todayMeals.length > 0 ? (
          <FlatList
            data={todayMeals}
            renderItem={renderMeal}
            keyExtractor={(item) => `today-${item.id}`}
            numColumns={numColumns}
            columnWrapperStyle={{
              justifyContent: "flex-start",
              marginBottom: 10,
              gap: spacing,
            }}
            scrollEnabled={false}
          />
        ) : (
          <Text
            style={{
              fontSize: 16,
              color: "#6b7280",
              textAlign: "center",
              lineHeight: 22,
              paddingHorizontal: 20,
              marginVertical: 30,
            }}
          >
            {isWeekend
              ? "No meals available today. Our kitchen is closed on weekends."
              : "No meals for today. Try again later or explore other days."}
          </Text>
        );
      })()}
    </View>

    {/* Recommended Meals */}
    <View style={{ marginVertical: 10, minHeight: 200 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 10,
          marginTop: 30,
          color: "#14532d",
        }}
      >
        Recommended for You
      </Text>

      {recommendedMeals.length > 0 ? (
        <FlatList
          data={recommendedMeals}
          renderItem={renderMeal}
          keyExtractor={(item) => `recommended-${item.id}`}
          numColumns={numColumns}
          columnWrapperStyle={{
            justifyContent: "flex-start",
            marginBottom: 10,
            gap: spacing,
          }}
          scrollEnabled={false}
        />
      ) : (
        <Text
          style={{
            fontSize: 16,
            color: "#6b7280",
            textAlign: "center",
            lineHeight: 22,
            paddingHorizontal: 20,
            marginVertical: 30,
          }}
        >
          No personalized recommendations yet.
        </Text>
      )}
    </View>

    {/* All Meals */}
    <View style={{ marginVertical: 10, minHeight: 200 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 10,
          marginTop: 30,
          color: "#14532d",
        }}
      >
        All Meals
      </Text>

   {filteredMeals.length > 0 ? (
  <>
    

    <FlatList
      data={filteredMeals}
      renderItem={(props) => {
        return renderMeal(props);
      }}
      keyExtractor={(item) => {
        const key = item?.id ?? Math.random().toString();
        return key;
      }}
      numColumns={numColumns}
      columnWrapperStyle={{
        justifyContent: "flex-start",
        marginBottom: 10,
        gap: spacing,
      }}
      scrollEnabled={false}
      extraData={loadingImages}
      removeClippedSubviews={false}
    />
  </>
) : (
  <>
    <Text
      style={{
        fontSize: 16,
        color: "#6b7280",
        textAlign: "center",
        lineHeight: 22,
        paddingHorizontal: 20,
        marginVertical: 30,
      }}
    >
      No meals available yet. Check back later!
    </Text>
  </>
)}
    </View>
  </ScrollView>
)}



{/* Filter Panel */}
{filterVisible && (
  <Animated.View
    style={[styles.filterPanel, { transform: [{ translateY: filterAnim }] }]}
  >
    {/* Header */}
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}
    >
      <Text style={styles.filterTitle}>Filter Options</Text>
      <TouchableOpacity
        onPress={toggleFilter}
        style={{
          padding: 6,
          backgroundColor: "#22c55e",
          borderRadius: 20,
        }}
      >
        <Ionicons name="close" size={24} color="#fff" />
      </TouchableOpacity>
    </View>

    <ScrollView showsVerticalScrollIndicator={false}>
      {/* ✅ Show Available Only */}
      <TouchableOpacity
        onPress={() => setShowAvailableOnly(!showAvailableOnly)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: "#555555",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 10,
            backgroundColor: showAvailableOnly ? "#22c55e" : "#fff",
          }}
        >
          {showAvailableOnly && (
            <Ionicons name="checkmark" size={16} color="#fff" />
          )}
        </View>
        <Text style={{ fontSize: 16, color: "#555555" }}>
          Show Available Only
        </Text>
      </TouchableOpacity>

      {/* 📅 Show Monday–Friday (Single Select) */}
      <Text style={{ marginBottom: 8, fontWeight: "600" }}>
        Show Meals Available On:
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <TouchableOpacity
            key={day}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: selectedDays === day ? "#22c55e" : "#EDEDED",
              borderRadius: 8,
            }}
            onPress={() =>
              setSelectedDays(selectedDays === day ? null : day)
            }
          >
            <Text
              style={{
                color: selectedDays === day ? "#fff" : "#000",
              }}
            >
              {day}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 🍽 Category */}
      <Text style={{ marginBottom: 8, fontWeight: "600" }}>Category:</Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {["Breakfast", "Lunch", "Dinner"].map((cat) => (
          <TouchableOpacity
            key={cat}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor:
                selectedCategory === cat ? "#22c55e" : "#EDEDED",
              borderRadius: 8,
            }}
            onPress={() =>
              setSelectedCategory(
                selectedCategory === cat ? null : cat
              )
            }
          >
            <Text
              style={{
                color: selectedCategory === cat ? "#fff" : "#000",
              }}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 💰 Price */}
      <Text style={{ marginBottom: 8, fontWeight: "600" }}>Price (₱):</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
        <TextInput
          style={styles.filterInput}
          keyboardType="numeric"
          value={priceMin.toString()}
          onChangeText={(text) => setPriceMin(Number(text))}
          placeholder="Min"
        />
        <TextInput
          style={styles.filterInput}
          keyboardType="numeric"
          value={priceMax.toString()}
          onChangeText={(text) => setPriceMax(Number(text))}
          placeholder="Max"
        />
      </View>

      {/* 🔥 Calories */}
      <Text style={{ marginBottom: 8, fontWeight: "600" }}>
        Calories (kcal):
      </Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
        <TextInput
          style={styles.filterInput}
          keyboardType="numeric"
          value={caloriesMin.toString()}
          onChangeText={(text) => setCaloriesMin(Number(text))}
          placeholder="Min"
        />
        <TextInput
          style={styles.filterInput}
          keyboardType="numeric"
          value={caloriesMax.toString()}
          onChangeText={(text) => setCaloriesMax(Number(text))}
          placeholder="Max"
        />
      </View>
    </ScrollView>
  </Animated.View>
)}


{/* 🔹 Floating Cart / Orders FAB */}
{activeOrders.length > 0 && (
  <Animated.View
    style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}
  >
    <TouchableOpacity
      style={styles.fab}
      onPress={() =>
        navigation.navigate("TrackOrderScreen", {
          orderId: activeOrders[0].id,
        })
      }
    >
      <Ionicons name="bicycle" size={24} color="#fff" />
      {activeOrders.length > 1 && (
        <View style={styles.fabBadge}>
          <Text style={styles.fabBadgeText}>{activeOrders.length}</Text>
        </View>
      )}
    </TouchableOpacity>
  </Animated.View>
)}

  </SafeAreaView>
);

}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", paddingHorizontal: 16,justifyContent:'center',alignItems:'center' },
topContainer: {
  backgroundColor: "#22c55e",     
  paddingTop: 48,                  // space inside the banner
  paddingBottom: 16,
  marginBottom:16,
  paddingHorizontal: 20,
  width: SCREEN_WIDTH,             // make it full width
  alignSelf: "center",             // ensure it spans the screen
},
  header: { marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "700", color: "#fff" },
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  searchBar: { flex: 1, backgroundColor: "#EDEDED", paddingHorizontal: 14, paddingVertical: 15, borderRadius: 8, fontSize: 14, marginRight: 10 },
  filterBtn: { backgroundColor: "#22c55e", padding: 11, borderRadius: 6 },
  addressContainer: { flexDirection: "row", color:"#A9A9A9", fontSize:12, alignItems: "flex-start", marginBottom: 12 },
  addressText: { marginLeft: 8, fontSize: 12, color: "#fff", flexShrink: 1, flex: 1, flexWrap: "wrap" },
  bannerContainer: { height: 180, marginBottom: 16, borderRadius: 12 },
  bannerItem: { marginHorizontal: 0, borderRadius: 12, overflow: "hidden", width: SCREEN_WIDTH - 32, },
  bannerImage: { width: "100%", height: 180, borderRadius: 12 },
  bannerOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: "rgba(0,0,0,0.4)", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  bannerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  bannerPrice: { color: "#fff", fontSize: 14, marginTop: 4 },
  bannerBtn: { marginTop: 6, backgroundColor: "#22c55e", paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start", paddingHorizontal: 8 },
  bannerBtnText: { color: "#fff", fontWeight: "600" },
  card: {padding: 5, width: cardWidth, height: cardHeight, justifyContent: "flex-start" },
  image: { width: "100%", height: 100, borderRadius: 10, resizeMode: "cover" },
  ratingContainer: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", marginBottom: 6 },
  ratingText: { fontSize: 11, color: "#6b7280", marginLeft: 4 },
  name: { fontSize: 13, fontWeight: "600", color: "#1f2937", textAlign: "left", marginBottom: 4, lineHeight: 18 },
priceRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
},
price: {
  fontSize: 12,
  color: "#22c55e",
  fontWeight: "600",
},
deliveryRow: {
  flexDirection: "row",
  alignItems: "center",
},
deliveryText: {
  fontSize: 12,
  color: "#22c55e",
  fontWeight: "600",
},
  unavailableOverlay: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", borderRadius: 12, zIndex: 10 },
  unavailableText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  filterPanel: { position: "absolute", bottom: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.6, backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  filterTitle: { fontSize: 20, fontWeight: "700", color: "#555555", marginBottom: 20 },
  filterInput: { flex: 1, backgroundColor: "#EDEDED", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, fontSize: 14 },
  fab: { position: "absolute", bottom: 30, right: 20, backgroundColor: "#22c55e", borderRadius: 25, padding: 16, elevation: 5, justifyContent: "center", alignItems: "center" },
  fabBadge: {
  position: "absolute",
  top: -6,
  right: -6,
  backgroundColor: "#f43f5e",
  borderRadius: 10,
  paddingHorizontal: 5,
  paddingVertical: 1,
  minWidth: 18,
  alignItems: "center",
  justifyContent: "center",
},
fabBadgeText: {
  color: "#fff",
  fontSize: 10,
  fontWeight: "700",
  textAlign: "center",
},
 bannerWrapper: {
    width: SCREEN_WIDTH, // full width of screen
    alignSelf: "center",
    marginTop: 10,
    paddingHorizontal:15,
    paddingBottom:20
  },
  bannerCard: {
    width: SCREEN_WIDTH, // make sure each banner fills screen width
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    
  },
  bannerImage: {
    width: "100%", // fill banner width
    height: "100%",
    alignSelf: "center",
  },
  bannerGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "100%",
    justifyContent: "flex-end",
    padding: 16,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  bannerRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  bannerRatingText: {
    color: "#fff",
    marginLeft: 4,
    fontSize: 13,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
    marginHorizontal: 3,
  },
  bannerFallback: {
    width: SCREEN_WIDTH,
    height: 180,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
bannerBottomRow: {
  width:'100%',
  flexDirection: "column",
  justifyContent: "flex-end",
},
bannerTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: "#fff",
  marginBottom: 4,
},
bannerRatingRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 2,
},
bannerRatingText: {
  color: "#fff",
  fontSize: 13,
  fontWeight: "500",
},
orderNowButton: {
  backgroundColor: "#22c55e",
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 20,
  marginLeft: 10,
},
orderNowText: {
  color: "#fff",
  fontWeight: "700",
},
fabContainer: {
  position: "absolute",
  bottom: 30,
  right: 20,
  zIndex: 999,           // ensures above everything
  elevation: 10,         // Android elevation
},
fabButton: {
  backgroundColor: "#22c55e",
  width: 60,
  height: 60,
  borderRadius: 30,
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#000",
  shadowOpacity: 0.3,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 6,
},
});
