import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image
  
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "@/config/firebase-config";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 100;
const STROKE_WIDTH = 4;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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
  <Circle
    stroke="#e5e7eb"
    fill="none"
    cx={SIZE / 2}
    cy={SIZE / 2}
    r={RADIUS}
    strokeWidth={STROKE_WIDTH}
  />
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
  const [greeting, setGreeting] = useState("Hello");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [tdee, setTdee] = useState(null);
  const isToday = new Date().toDateString() === selectedDate.toDateString();

  const caloriesTarget = tdee ;
  const caloriesEaten = isToday ? 1350 : 1200;
  const caloriesBurned = isToday ? 300 : 250;
  const caloriesLeft = caloriesTarget - caloriesEaten;

  const macros = isToday
    ? { carbs: 60, protein: 50, fat: 30 }
    : { carbs: 50, protein: 45, fat: 35 };

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
          setUserName(data.Name || "User");
          setTdee(data.TDEE || 2000);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchSuggestions = async () => {
      try {
        const snapshot = await getDocs(collection(db, "meals"));
        const allMeals = snapshot.docs.map((doc) => doc.data());
        const validMeals = allMeals.filter(
          (meal) => meal.calories && meal.calories <= caloriesLeft
        );
        const shuffled = validMeals.sort(() => 0.5 - Math.random());
        setSuggestions(shuffled.slice(0, 3));
      } catch (err) {
        console.error("Failed to fetch meals:", err);
      }
    };

    fetchUserData();
    fetchSuggestions();
  }, [selectedDate]);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileCircle}>
            <Text style={styles.profileInitial}>{userName?.charAt(0) || "U"}</Text>
          </View>
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
        <TouchableOpacity onPress={goToPreviousDay}>
          <Ionicons name="chevron-back" size={30} color="#14532d" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowPicker(true)}>
          <Text style={styles.dateText}>
            {isToday ? "Today" : selectedDate.toDateString()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToNextDay} disabled={isToday}>
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
        <View style={styles.circleRow}>
          <CircleProgress percent={(caloriesEaten / caloriesTarget) * 100} value={caloriesEaten} target={caloriesTarget} color="#22c55e" label="Eaten" />
          <CircleProgress percent={(caloriesLeft / caloriesTarget) * 100} value={caloriesLeft} target={caloriesTarget} color="#eab308" label="Left" />
          <CircleProgress percent={(caloriesBurned / caloriesTarget) * 100} value={caloriesBurned} target={caloriesTarget} color="#ef4444" label="Burned" />
        </View>

        {/* Macros */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Macros</Text>
          {[{ label: "Carbs", value: macros.carbs, color: "#facc15" },
            { label: "Protein", value: macros.protein, color: "#34d399" },
            { label: "Fat", value: macros.fat, color: "#f87171" }
          ].map((item) => (
            <View style={styles.macroRow} key={item.label}>
              <Text style={styles.macroLabel}>{item.label}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {
                  width: `${item.value}%`,
                  backgroundColor: item.color,
                }]} />
              </View>
              <Text style={styles.percent}>{item.value}%</Text>
            </View>
          ))}
        </View>

      
      {suggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meal Suggestions</Text>
          {suggestions.map((meal, index) => {
            const isExpanded = expandedIndex === index;

            return (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                activeOpacity={0.9}
                onPress={() =>
                  setExpandedIndex(expandedIndex === index ? null : index)
                }
              >
                {meal.image && (
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: meal.image }} style={styles.suggestionImage} />
                  </View>
                )}
                <View style={styles.suggestionText}>
                  <View style={styles.suggestionTopRow}>
                    <Text style={styles.suggestionName}>{meal.mealName}</Text>
                    <TouchableOpacity
                      onPress={() => console.log("Favorite tapped:", meal.mealName)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="star-outline" size={20} color="#facc15" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.suggestionCalories}>{meal.calories} kcal</Text>

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

                  <TouchableOpacity
                    onPress={() => console.log("Add to log:", meal.mealName)}
                    style={styles.logButton}
                  >
                    <Text style={styles.logButtonText}>Add Meal</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

        {/* Add Meal Button */}
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addButtonText}>Log New Meal</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 24, paddingTop: 48, paddingBottom: 100 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  profileCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#bbf7d0", justifyContent: "center", alignItems: "center", marginRight: 16,
  },
  profileInitial: { fontSize: 20, color: "#14532d", fontWeight: "bold" },
  greetingBox: { flex: 1 },
  greeting: { fontSize: 16, color: "#6b7280" },
  name: { fontSize: 20, fontWeight: "bold", color: "#14532d" },
  dateNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginTop: 10, marginBottom: 30,
  },
  dateText: {
    fontSize: 20, fontWeight: "bold", color: "#14532d",
    marginHorizontal: 20,
  },
  circleRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  circleItem: { alignItems: "center", flex: 1, backgroundColor: "transparent" },
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

  circleLabel: { marginTop: 10, fontSize: 14, color: "#374151" },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#14532d", marginBottom: 16 },
  macroRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  macroLabel: { width: 70, fontSize: 14, color: "#4b5563" },
  progressBar: {
    flex: 1, height: 10, backgroundColor: "#e5e7eb",
    borderRadius: 5, overflow: "hidden", marginHorizontal: 10,
  },
  progressFill: { height: "100%", borderRadius: 5 },
  percent: { width: 40, textAlign: "right", fontSize: 14, color: "#374151" },
  addButton: {
    flexDirection: "row", backgroundColor: "#22c55e",
    paddingVertical: 14, borderRadius: 12, justifyContent: "center", alignItems: "center",
    shadowColor: "#22c55e", shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  addButtonText: { color: "#fff", fontWeight: "600", fontSize: 16, marginLeft: 8 }, suggestionItem: {
    backgroundColor: "#ecfdf5",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
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
suggestionTopRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 4,
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

});
