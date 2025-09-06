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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, onSnapshot, query, where, getDocs,orderBy} from "firebase/firestore";
import { db } from "../../../../config/firebase-config";
import { getAuth } from "firebase/auth";
import NoInternetScreen from "./NoInternetScreen";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import * as Location from "expo-location";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import NetInfo from "@react-native-community/netinfo";

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

  const { orderId, friendlyId } = route.params || {};

  // --- Internet Connection ---
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state =>
      setIsConnected(state.isConnected && state.isInternetReachable)
    );
    return unsubscribe;
  }, []);

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

// --- Fetch User Location & Address (prioritize saved over GPS) ---
useEffect(() => {
  (async () => {
    setAddressLoading(true);
    try {
      // 1. Check if saved values exist
      const savedCoords = await AsyncStorage.getItem("userCoords");
      const savedAddress = await AsyncStorage.getItem("userAddress");

      if (savedCoords && savedAddress) {
        setCoords(JSON.parse(savedCoords));
        setAddress(savedAddress);
        setAddressLoading(false);
        return; // ✅ use saved location, skip GPS
      }

      // 2. Otherwise, get from GPS
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setAddress("Permission denied");
        setAddressLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setCoords({ latitude, longitude });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        { headers: { "User-Agent": "NutriFitApp/1.0", "Accept-Language": "en" } }
      );
      const data = await response.json();

      if (data?.display_name) {
        setAddress(data.display_name);
        await AsyncStorage.setItem("userCoords", JSON.stringify({ latitude, longitude }));
        await AsyncStorage.setItem("userAddress", data.display_name);
      } else {
        setAddress("Unable to fetch address");
      }
    } catch (err) {
      console.error("Location fetch error:", err);
      setAddress("Error fetching address");
    }
    setAddressLoading(false);
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

    // ✅ Keep only active orders
    const inactiveStatuses = ["done", "cancelled"];
    orders = orders.filter(o => {
      const status = (o.status || "").toLowerCase();
      return !inactiveStatuses.includes(status);
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
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const snapshot = collection(db, "meals");
      onSnapshot(snapshot, snapshot => {
        const updatedMeals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMeals(updatedMeals);
        setFilteredMeals(updatedMeals);
        setLoading(false);
      });
    } catch (error) {
      console.error("Refresh error:", error);
    }
    setRefreshing(false);
  };

    // --- Fetch Meals with Ratings ---
  useEffect(() => {
    const unsubscribeMeals = onSnapshot(
      collection(db, "meals"),
      async (snapshot) => {
        const updatedMeals = await Promise.all(
          snapshot.docs.map(async doc => {
            const mealData = { id: doc.id, ...doc.data() };
            const feedbackQuery = query(
              collection(db, "mealFeedback"),
              where("mealId", "==", doc.id)
            );
            const feedbackSnapshot = await getDocs(feedbackQuery);
            if (!feedbackSnapshot.empty) {
              const ratings = feedbackSnapshot.docs.map(f => f.data().rating || 0);
              const totalRatings = ratings.length;
              const averageRating = ratings.reduce((a, b) => a + b, 0) / totalRatings;
              return { ...mealData, averageRating, totalRatings };
            }
            return { ...mealData, averageRating: 0, totalRatings: 0 };
          })
        );

        setMeals(updatedMeals);
        setFilteredMeals(updatedMeals);
        setLoading(false);
      },
      error => {
        console.error("Meals fetch error:", error);
        setLoading(false);
      }
    );
    return () => unsubscribeMeals();
  }, []);


  // --- Search & Filters ---
  useEffect(() => {
    let tempMeals = [...meals];
    if (search.trim() !== "") {
      const lowerSearch = search.toLowerCase();
      tempMeals = tempMeals.filter(meal => meal.mealName.toLowerCase().includes(lowerSearch));
    }
    if (selectedCategory) tempMeals = tempMeals.filter(meal => meal.category === selectedCategory);
    if (showAvailableOnly) tempMeals = tempMeals.filter(meal => meal.available !== false);
    tempMeals = tempMeals.filter(
      meal =>
        meal.price >= priceMin &&
        meal.price <= priceMax &&
        meal.calories >= caloriesMin &&
        meal.calories <= caloriesMax
    );
    setFilteredMeals(tempMeals);
  }, [search, meals, selectedCategory, showAvailableOnly, priceMin, priceMax, caloriesMin, caloriesMax]);


  // --- Banner Auto Slide ---
  useEffect(() => {
    if (!meals.length) return;
    const bannerData = meals.slice(0, 5);
    const interval = setInterval(() => {
      setBannerIndex(prev => {
        const nextIndex = (prev + 1) % bannerData.length;
        if (bannerRef.current) bannerRef.current.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [meals]);

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


  // --- Skeleton Loader ---
  const MealSkeleton = ({ searchActive }) => (
    <SkeletonPlaceholder>
      <View style={{ width: SCREEN_WIDTH - 32, height: 180, borderRadius: 12, marginBottom: 16 }} />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: searchActive ? "flex-start" : "center",
          gap: spacing,
          paddingBottom: 200,
        }}
      >
        {Array(6).fill(0).map((_, index) => (
          <View key={index} style={{ width: cardWidth, borderRadius: 12, padding: 12, alignItems: "center", marginBottom: 10 }}>
            <View style={{ width: "100%", height: 100, borderRadius: 10, marginBottom: 8 }} />
            <View style={{ width: "100%", height: 16, marginBottom: 6, borderRadius: 4 }} />
            <View style={{ width: "60%", height: 14, borderRadius: 4 }} />
          </View>
        ))}
      </View>
    </SkeletonPlaceholder>
  );

  // --- Render Functions ---
  const renderBannerItem = ({ item }) => (
    <View style={styles.bannerItem}>
      <Image source={{ uri: item.image }} style={styles.bannerImage} />
      <View style={styles.bannerOverlay}>
        <Text style={styles.bannerTitle}>{item.mealName}</Text>
        <Text style={styles.bannerPrice}>₱{item.price?.toFixed(2) || "0.00"}</Text>
        <TouchableOpacity
          style={styles.bannerBtn}
          onPress={() => navigation.navigate("MealDetail", { meal: item })}
          activeOpacity={0.8}
        >
          <Text style={styles.bannerBtnText}>Order Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

const renderMeal = ({ item }) => {
  const isUnavailable = item.available === false;
  
  const activeOrderForMeal = activeOrders.find(order =>
    order.mealId === item.id 
  );

  const hideBikeIcon = activeOrderForMeal
    ? ["done", "cancelled"].includes((activeOrderForMeal.status || "").toLowerCase())
    : false;

  return (
    <View style={{ position: "relative" }}>
      <TouchableOpacity
        style={[styles.card, isUnavailable && { opacity: 0.6 }]}
        onPress={() => navigation.navigate("MealDetail", { meal: item })}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.image }} style={styles.image} />
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={14} color="#facc15" />
          <Text style={styles.ratingText}>
            {item.averageRating?.toFixed(1) || "0.0"} ({item.totalRatings || 0})
          </Text>
        </View>
        <Text style={styles.name} numberOfLines={2}>{item.mealName}</Text>
        <Text style={styles.price}>₱ {item.price?.toFixed(2) || "0.00"}</Text>
        {!hideBikeIcon && (
          <View style={styles.deliveryRow}>
            <Ionicons name="bicycle" size={14} color="#22c55e" />
            <Text style={styles.deliveryText}>Free</Text>
          </View>
        )}
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
    <SafeAreaView style={[styles.container, { paddingTop: 50 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Order Food</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity style={{ marginRight: 12 }}>
            <Ionicons name="heart-outline" size={26} color="#14532d" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("CartScreen")}>
            <Ionicons name="cart-outline" size={26} color="#14532d" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Address */}
      <TouchableOpacity 
        style={styles.addressContainer} 
        onPress={() => navigation.navigate("SelectLocationScreen", { coords, address, onLocationSelected: (newCoords, newAddress) => { setCoords(newCoords); setAddress(newAddress); }})}
        activeOpacity={0.7}
      >
        <Ionicons name="location-outline" size={18} color="#14532d" />
        {addressLoading ? (
          <SkeletonPlaceholder>
            <View style={{ width: SCREEN_WIDTH * 0.6, height: 14, borderRadius: 4, marginLeft: 8 }} />
          </SkeletonPlaceholder>
        ) : (
          <Text style={styles.addressText}>{address}</Text>
        )}
      </TouchableOpacity>


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

      {/* Banner */}
      {meals.length > 0 && (
        <View style={styles.bannerContainer}>
          <FlatList
            ref={bannerRef}
            data={meals.slice(0, 5)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={renderBannerItem}
            keyExtractor={item => item.id}
            getItemLayout={(data, index) => ({ length: BANNER_ITEM_WIDTH, offset: BANNER_ITEM_WIDTH * index, index })}
          />
        </View>
      )}

      {/* Meals */}
      {loading ? (
        <MealSkeleton searchActive={search.trim() !== ""} />
      ) : filteredMeals.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center" }}>
          <Ionicons name="alert-circle-outline" size={48} color="#14532d" />
          <Text style={{ marginTop: 12, fontSize: 16, color: "#14532d", textAlign: "center" }}>
            Nothing to display right now.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMeals}
          renderItem={renderMeal}
          keyExtractor={item => item.id}
          numColumns={numColumns}
          contentContainerStyle={{ paddingBottom: 200 }}
          columnWrapperStyle={{ justifyContent: "flex-start", marginBottom: 10, gap: spacing }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          initialNumToRender={10}
          windowSize={5}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
        />
      )}

      {/* Filter Panel */}
      {filterVisible && (
        <Animated.View style={[styles.filterPanel, { transform: [{ translateY: filterAnim }] }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <Text style={styles.filterTitle}>Filter Options</Text>
            <TouchableOpacity onPress={toggleFilter} style={{ padding: 6, backgroundColor: "#22c55e", borderRadius: 20 }}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {/* Category */}
            <Text style={{ marginBottom: 8, fontWeight: "600" }}>Category:</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
              {["Breakfast", "Lunch", "Dinner"].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: selectedCategory === cat ? "#22c55e" : "#EDEDED", borderRadius: 8 }}
                  onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                >
                  <Text style={{ color: selectedCategory === cat ? "#fff" : "#000" }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Availability */}
            <TouchableOpacity onPress={() => setShowAvailableOnly(!showAvailableOnly)} style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
              <View style={{ width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: "#14532d", justifyContent: "center", alignItems: "center", marginRight: 10, backgroundColor: showAvailableOnly ? "#22c55e" : "#fff" }}>
                {showAvailableOnly && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={{ fontSize: 16, color: "#14532d" }}>Show Available Only</Text>
            </TouchableOpacity>

            {/* Price & Calories */}
            <Text style={{ marginBottom: 8, fontWeight: "600" }}>Price (₱):</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              <TextInput style={styles.filterInput} keyboardType="numeric" value={priceMin.toString()} onChangeText={text => setPriceMin(Number(text))} placeholder="Min" />
              <TextInput style={styles.filterInput} keyboardType="numeric" value={priceMax.toString()} onChangeText={text => setPriceMax(Number(text))} placeholder="Max" />
            </View>
            <Text style={{ marginBottom: 8, fontWeight: "600" }}>Calories (kcal):</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              <TextInput style={styles.filterInput} keyboardType="numeric" value={caloriesMin.toString()} onChangeText={text => setCaloriesMin(Number(text))} placeholder="Min" />
              <TextInput style={styles.filterInput} keyboardType="numeric" value={caloriesMax.toString()} onChangeText={text => setCaloriesMax(Number(text))} placeholder="Max" />
            </View>
          </ScrollView>
        </Animated.View>
      )}

{/* FAB - Single Icon for Active Orders */}
{activeOrders.length > 0 && (
  <Animated.View style={{ transform: [{ scale: fabScale }] }}>
    <TouchableOpacity
      style={styles.fab}
      onPress={() =>
        navigation.navigate("TrackOrderScreen", { orderId: activeOrders[0].id })
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
  container: { flex: 1, backgroundColor: "#f9fafb", paddingHorizontal: 16 },
  header: { marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "700", color: "#14532d" },
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  searchBar: { flex: 1, backgroundColor: "#EDEDED", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, fontSize: 14, marginRight: 10 },
  filterBtn: { backgroundColor: "#22c55e", padding: 10, borderRadius: 6 },
  addressContainer: { flexDirection: "row", color:"#A9A9A9", fontSize:12, alignItems: "flex-start", marginBottom: 12 },
  addressText: { marginLeft: 8, fontSize: 12, color: "#818589", flexShrink: 1, flex: 1, flexWrap: "wrap" },
  bannerContainer: { height: 180, marginBottom: 16, borderRadius: 12 },
  bannerItem: { marginHorizontal: 0, borderRadius: 12, overflow: "hidden", width: SCREEN_WIDTH - 32 },
  bannerImage: { width: "100%", height: 180, borderRadius: 12 },
  bannerOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: "rgba(0,0,0,0.4)", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  bannerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  bannerPrice: { color: "#fff", fontSize: 14, marginTop: 4 },
  bannerBtn: { marginTop: 6, backgroundColor: "#22c55e", paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start", paddingHorizontal: 8 },
  bannerBtnText: { color: "#fff", fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 10, width: cardWidth, height: cardHeight, elevation: 3, justifyContent: "flex-start" },
  image: { width: "100%", height: 90, borderRadius: 10, marginBottom: 6, resizeMode: "cover" },
  ratingContainer: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", marginBottom: 6 },
  ratingText: { fontSize: 11, color: "#6b7280", marginLeft: 4 },
  name: { fontSize: 13, fontWeight: "600", color: "#1f2937", textAlign: "left", marginBottom: 4, lineHeight: 18 },
  price: { fontSize: 12, color: "#22c55e", fontWeight: "600", marginBottom: 6, textAlign: "left" },
  deliveryRow: { flexDirection: "row", alignItems: "center", marginTop: "auto" },
  deliveryText: { fontSize: 11, color: "#22c55e", marginLeft: 4, fontWeight: "500" },
  unavailableOverlay: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", borderRadius: 12, zIndex: 10 },
  unavailableText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  filterPanel: { position: "absolute", bottom: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.6, backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  filterTitle: { fontSize: 20, fontWeight: "700", color: "#14532d", marginBottom: 20 },
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

});
