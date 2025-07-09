import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

export default function HomeScreen({ navigation }) {
  const caloriesEaten = 1350;
  const caloriesTarget = 2000;
  const caloriesBurned = 300;
  const caloriesLeft = caloriesTarget - caloriesEaten;

  const carbs = 60; // %
  const protein = 50; // %
  const fat = 30; // %

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome back 👋</Text>
        <TouchableOpacity>
          <Ionicons name="person-circle" size={36} color="#14532d" />
        </TouchableOpacity>
      </View>

      {/* Calorie Summary */}
      <View style={styles.calorieSummary}>
        <View style={styles.calorieCard}>
          <FontAwesome5 name="utensils" size={24} color="#16a34a" />
          <Text style={styles.calorieLabel}>kCal Eaten</Text>
          <Text style={styles.calorieValue}>{caloriesEaten}</Text>
        </View>
        <View style={styles.calorieCard}>
          <FontAwesome5 name="heartbeat" size={24} color="#eab308" />
          <Text style={styles.calorieLabel}>kCal Left</Text>
          <Text style={styles.calorieValue}>{caloriesLeft}</Text>
        </View>
        <View style={styles.calorieCard}>
          <FontAwesome5 name="fire" size={24} color="#ef4444" />
          <Text style={styles.calorieLabel}>kCal Burned</Text>
          <Text style={styles.calorieValue}>{caloriesBurned}</Text>
        </View>
      </View>

      {/* Macros */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Macros</Text>
        <View style={styles.macroRow}>
          <Text style={styles.macroLabel}>Carbs</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${carbs}%`, backgroundColor: "#facc15" }]} />
          </View>
          <Text style={styles.percent}>{carbs}%</Text>
        </View>
        <View style={styles.macroRow}>
          <Text style={styles.macroLabel}>Protein</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${protein}%`, backgroundColor: "#34d399" }]} />
          </View>
          <Text style={styles.percent}>{protein}%</Text>
        </View>
        <View style={styles.macroRow}>
          <Text style={styles.macroLabel}>Fat</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${fat}%`, backgroundColor: "#f87171" }]} />
          </View>
          <Text style={styles.percent}>{fat}%</Text>
        </View>
      </View>

      {/* Add Meal Button */}
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Meal</Text>
      </TouchableOpacity>

      {/* Bottom Tabs Placeholder */}
      <View style={styles.bottomTabs}>
        <TouchableOpacity>
          <Ionicons name="fast-food" size={24} color="#14532d" />
          <Text style={styles.tabText}>Meals</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="bar-chart" size={24} color="#9ca3af" />
          <Text style={styles.tabTextInactive}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="walk" size={24} color="#9ca3af" />
          <Text style={styles.tabTextInactive}>Exercise</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
    paddingTop: 48,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcome: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#14532d",
  },
  calorieSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  calorieCard: {
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  calorieLabel: {
    fontSize: 14,
    color: "#4b5563",
    marginTop: 6,
  },
  calorieValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#14532d",
    marginBottom: 12,
  },
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
  addButton: {
    flexDirection: "row",
    backgroundColor: "#22c55e",
    padding: 14,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  bottomTabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 16,
  },
  tabText: {
    fontSize: 12,
    color: "#14532d",
    marginTop: 4,
    textAlign: "center",
  },
  tabTextInactive: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "center",
  },
});
