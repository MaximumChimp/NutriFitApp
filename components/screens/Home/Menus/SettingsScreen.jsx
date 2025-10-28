// SettingsScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const toggleNotifications = () => setNotificationsEnabled((prev) => !prev);

  const showPrivacyPolicy = () => {
    Alert.alert(
      "Privacy Policy",
      "By using this app, you agree to our Privacy Policy. Your personal data will be protected and only used in accordance with our policies.",
      [{ text: "OK" }]
    );
  };

  const showTermsOfService = () => {
    Alert.alert(
      "Terms of Service",
      "By using this app, you agree to our Terms of Service. Please make sure you read and understand the rules and responsibilities.",
      [{ text: "OK" }]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Back Button */}
    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
      <Ionicons name="arrow-back" size={24} color="#111827" />
      <Text style={styles.backText}>Back</Text>
    </TouchableOpacity>

      <Text style={styles.title}>Settings</Text>

      {/* Notifications */}
      <View style={styles.settingRow}>
        <Text style={styles.settingText}>Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={toggleNotifications}
          trackColor={{ true: "#22c55e", false: "#d1d5db" }}
          thumbColor="#fff"
        />
      </View>

      {/* Account Ownership */}
      <TouchableOpacity
        style={styles.settingRow}
        onPress={() => navigation.navigate("AccountOwnership")}
      >
        <Text style={styles.settingText}>Account Ownership and Control</Text>
        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
      </TouchableOpacity>

      {/* Privacy Policy */}
      <TouchableOpacity style={styles.settingRow} onPress={showPrivacyPolicy}>
        <Text style={styles.settingText}>Privacy Policy</Text>
        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
      </TouchableOpacity>

      {/* Terms of Service */}
      <TouchableOpacity style={styles.settingRow} onPress={showTermsOfService}>
        <Text style={styles.settingText}>Terms of Service</Text>
        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafaf9", padding: 20 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#55555",
    marginBottom: 20,
    marginTop: 20,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  settingText: { fontSize: 16, color: "#55555", fontWeight: "500" },
    backButton: {
  flexDirection: "row",
  alignItems: "center",
  paddingTop: 20,
  marginTop:10,
  marginBottom: 10,
},
backText: {
  marginLeft: 8,
  fontSize: 16,
  fontWeight: "500",
  color: "#111827",
},

});
