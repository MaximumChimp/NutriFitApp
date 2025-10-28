import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { getAuth } from "firebase/auth";
const screenWidth = Dimensions.get("window").width;

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dateType, setDateType] = useState("Today"); // Today, Week, Month, Year
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [accountCreatedAt, setAccountCreatedAt] = useState(new Date(2025, 10, 24)); // fallback

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );


useEffect(() => {
  const fetchUserProfile = async () => {
    try {
      const profileCache = await AsyncStorage.getItem("userProfile");

      let created = null;

      if (profileCache) {
        const profileData = JSON.parse(profileCache);
        console.log("Raw profileData from AsyncStorage:", profileData);

        // 🔹 Check createdAt
        if (profileData.createdAt) {
          console.log("createdAt raw:", profileData.createdAt);
          created = profileData.createdAt.toDate?.() ?? new Date(profileData.createdAt);
        } 
        // 🔹 Check dateCreated
        else if (profileData.dateCreated) {
          console.log("dateCreated raw:", profileData.dateCreated);
          created = profileData.dateCreated.toDate?.() ?? new Date(profileData.dateCreated);
        }

        if (!(created instanceof Date) || isNaN(created)) {
          console.warn("Invalid date from profileCache:", created);
          created = null;
        }
      } else {
        console.log("No userProfile found in AsyncStorage");
      }

      // 🔹 Fallback to Firebase Auth metadata if no valid date yet
      if (!created) {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user?.metadata?.creationTime) {
          console.log("Fallback to Firebase Auth metadata.creationTime");
          created = new Date(user.metadata.creationTime);
        } else {
          console.warn("No valid created date found, using today as fallback");
          created = new Date();
        }
      }

      console.log("Final accountCreatedAt:", created);
      setAccountCreatedAt(created);
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      setAccountCreatedAt(new Date()); // fallback on error
    }
  };

  fetchUserProfile();
}, []);




const loadHistory = async () => {
  try {
    setLoading(true);

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      console.warn("No user logged in, skipping history load");
      setHistory([]);
      return;
    }

    const uid = user.uid;
    const allKeys = await AsyncStorage.getAllKeys();

    // ✅ Only load keys for the current user
    const userMealKeys = allKeys.filter((k) => k.startsWith(`${uid}_loggedMeals_`));

    let allMeals = [];
    for (const key of userMealKeys) {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const meals = JSON.parse(stored);
        // ensure it's an array
        if (Array.isArray(meals)) allMeals = [...allMeals, ...meals];
      }
    }

    // Sort newest first
    allMeals.sort(
      (a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)
    );

    setHistory(allMeals);
  } catch (error) {
    console.error("Error loading history:", error);
    setHistory([]);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => { loadHistory(); }, []);

const filterMealsByDate = () => {
  return history.filter((meal) => {
    const mealDate = new Date(meal.createdAt || meal.timestamp);
    if (isNaN(mealDate)) return false;

    if (dateType === "Today") {
      return mealDate.getDate() === currentDate.getDate() &&
             mealDate.getMonth() === currentDate.getMonth() &&
             mealDate.getFullYear() === currentDate.getFullYear();
    }

    if (dateType === "Week") {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23,59,59,999);
      return mealDate >= start && mealDate <= end;
    }

    if (dateType === "Month") {
      return mealDate.getMonth() === currentDate.getMonth() &&
             mealDate.getFullYear() === currentDate.getFullYear();
    }

    if (dateType === "Year") {
      return mealDate.getFullYear() === currentDate.getFullYear();
    }

    return true;
  });
};


  const filteredMeals = filterMealsByDate();

// Compute whether the previous button should be disabled
const isPrevDisabled = () => {
  const newDate = new Date(currentDate);
  if (dateType === "Today") newDate.setDate(currentDate.getDate() - 1);
  if (dateType === "Week") newDate.setDate(currentDate.getDate() - 7);
  if (dateType === "Month") newDate.setMonth(currentDate.getMonth() - 1);
  if (dateType === "Year") newDate.setFullYear(currentDate.getFullYear() - 1);

  return newDate < accountCreatedAt;
};

const normalizeDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const incrementDate = (dir) => {
  const newDate = new Date(currentDate);
  if (dateType === "Today") newDate.setDate(currentDate.getDate() + dir);
  if (dateType === "Week") newDate.setDate(currentDate.getDate() + dir * 7);
  if (dateType === "Month") newDate.setMonth(currentDate.getMonth() + dir);
  if (dateType === "Year") newDate.setFullYear(currentDate.getFullYear() + dir);

  const today = normalizeDate(new Date());
  const minDate = normalizeDate(accountCreatedAt);
  const proposedDate = normalizeDate(newDate);

  if (proposedDate < minDate || proposedDate > today) return;

  setCurrentDate(newDate);
};

const isNextDisabled = () => {
  const newDate = new Date(currentDate);
  if (dateType === "Today") newDate.setDate(currentDate.getDate() + 1);
  if (dateType === "Week") newDate.setDate(currentDate.getDate() + 7);
  if (dateType === "Month") newDate.setMonth(currentDate.getMonth() + 1);
  if (dateType === "Year") newDate.setFullYear(currentDate.getFullYear() + 1);

  return normalizeDate(newDate) > normalizeDate(new Date());
};

  const onDateChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === "ios");
    if (selectedDate) setCurrentDate(selectedDate);
  };

  const formatDateDisplay = () => {
    if (dateType === "Today") return currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    if (dateType === "Week") {
      const firstDayOfYear = new Date(currentDate.getFullYear(),0,1);
      const pastDaysOfYear = (currentDate - firstDayOfYear)/86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay()+1)/7);
      return `Week ${weekNumber}`;
    }
    if (dateType === "Month") return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (dateType === "Year") return `${currentDate.getFullYear()}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Meals Summary</Text>
      </View>

      {/* Date navigation */}
      
      <View style={styles.dateNavigator}>
       <TouchableOpacity
          style={styles.leftArrow}
          onPress={() => incrementDate(-1)}
          disabled={isPrevDisabled()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={isPrevDisabled() ? "#ccc" : "#555555"}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowPicker(true)}>
          <Text style={styles.currentDate}>{formatDateDisplay()}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rightArrow}
          onPress={() => incrementDate(1)}
          disabled={isNextDisabled()}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isNextDisabled() ? "#ccc" : "#555555"}
          />
        </TouchableOpacity>
      </View>


{showPicker && (
  <DateTimePicker
    value={currentDate}
    mode="date"
    display="default"
    onChange={onDateChange}
    minimumDate={accountCreatedAt} // restricts selection to profile creation date
    maximumDate={new Date()} // restrict to today
  />
)}
      {/* Date type tabs */}
      <View style={styles.dateTabs}>
        {["Today","Week","Month","Year"].map((dt) => (
          <TouchableOpacity key={dt} onPress={() => setDateType(dt)} style={[styles.dateTab, dateType===dt && styles.activeDateTab]}>
            <Text style={[styles.dateTabText, dateType===dt && styles.activeDateTabText]}>{dt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Meal list */}
      {filteredMeals.length === 0 ? (
        <Text style={styles.emptyText}>No meals found</Text>
      ) : (
        <FlatList
          data={filteredMeals}
          keyExtractor={(item, index) => `${item.id || index}`}
          renderItem={({ item }) => {
            const date = new Date(item.createdAt || item.timestamp);
            const formattedDate = !isNaN(date)
              ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
              : "Unknown";
            return (
              <View style={styles.mealRow}>
                <Text style={styles.mealName}>{item.name}</Text>
                <Text style={styles.details}>{item.calories} kcal • {item.mealType} • {formattedDate}</Text>
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", paddingTop: 50 },
  header: { paddingHorizontal: 20, marginBottom: 10 },
  pageTitle: { fontSize: 24, fontWeight: "700", color: "#555555",marginBottom:20 },
dateNavigator: { 
  flexDirection: "row", 
  justifyContent: "center", 
  alignItems: "center", 
  marginBottom: 20,
  position: "relative",
},
leftArrow: {
  position: "absolute",
  left: 30,
  color:"#22c55e"
},
rightArrow: {
  position: "absolute",
  right: 30,
  color:"#22c55e"
},
currentDate: { 
  fontSize: 16, 
  fontWeight: "600", 
  color: "#555555",
},

  dateTabs: { flexDirection:"row", justifyContent:"space-around", borderBottomWidth:1, borderBottomColor:"#e5e7eb", marginBottom:12 },
  dateTab: { paddingVertical:6, paddingHorizontal:12 },
  activeDateTab: { borderBottomWidth:2, borderBottomColor:"#22c55e" },
  dateTabText: { fontSize:14, color:"#6b7280", fontWeight:"600" },
  activeDateTabText: { color:"#22c55e" },
  mealRow: { paddingVertical:14, paddingHorizontal:20, borderBottomWidth:1, borderBottomColor:"#e5e7eb" },
  mealName: { fontSize:17, fontWeight:"600", color:"#111827" },
  details: { fontSize:14, color:"#6b7280", marginTop:4 },
  emptyText: { fontSize:16, color:"#6b7280", textAlign:"center", marginTop:40 },
});
