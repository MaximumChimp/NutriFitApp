// AccountOwnership.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { auth, db } from "../../../config/firebase-config";
import { updateDoc, doc } from "firebase/firestore";
import { deleteUser, signOut } from "firebase/auth";

export default function AccountOwnership() {
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deactivateDays, setDeactivateDays] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const deactivateOptions = [
    { label: "7 days", value: 7 },
    { label: "15 days", value: 15 },
    { label: "30 days", value: 30 },
    { label: "Never (permanent until reactivated)", value: 0 },
  ];

  // 🔹 Auto logout when logout modal shows
  useEffect(() => {
    if (showLogoutModal) {
      const timer = setTimeout(async () => {
        try {
          await signOut(auth);
          setShowLogoutModal(false);
        } catch (err) {
          console.log("Logout error:", err);
          Alert.alert("Error", "Could not log out.");
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showLogoutModal]);

  // 🔹 Deactivate account with duration
  const handleDeactivate = async () => {
    if (deactivateDays === null) {
      Alert.alert("Account Deactivation", "Please select a deactivation period.");
      return;
    }

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        status: "deactivated",
        deactivateUntil:
          deactivateDays === 0
            ? null
            : new Date(Date.now() + deactivateDays * 24 * 60 * 60 * 1000),
      });

      setShowDeactivateModal(false);
      setDeactivateDays(null);

      // Show loading + auto logout
      setShowLogoutModal(true);
    } catch (err) {
      console.log("Deactivate error:", err);
      Alert.alert("Error", "Could not deactivate account.");
    }
  };

  // 🔹 Delete account with confirmation
  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== "delete my account") {
      Alert.alert("Account Deletion", 'Please type "delete my account" to proceed.');
      return;
    }

    try {
      if (!auth.currentUser) return;
      await deleteUser(auth.currentUser);

      setShowDeleteModal(false);
      setDeleteConfirmText("");
      Alert.alert("Deleted", "Your account has been permanently deleted.");
    } catch (err) {
      console.log("Delete account error:", err);
      Alert.alert("Error", "Could not delete account.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account Ownership</Text>
      <Text style={styles.subtitle}>
        Manage your account. You can deactivate it temporarily or delete it permanently.
      </Text>

      {/* Deactivate Account */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowDeactivateModal(true)}
      >
        <Text style={styles.buttonText}>Deactivate Account</Text>
      </TouchableOpacity>

      {/* Delete Account */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowDeleteModal(true)}
      >
        <Text style={[styles.buttonText, { color: "red" }]}>
          Delete Account
        </Text>
      </TouchableOpacity>

      {/* 🔹 Deactivate Modal */}
      <Modal visible={showDeactivateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Deactivate Account</Text>
            <Text style={styles.modalSubtitle}>
              Select how long you’d like your account to remain deactivated:
            </Text>

            {deactivateOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.radioRow}
                onPress={() => setDeactivateDays(option.value)}
              >
                <View
                  style={[
                    styles.radioOuter,
                    deactivateDays === option.value && styles.radioOuterActive,
                  ]}
                >
                  {deactivateDays === option.value && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowDeactivateModal(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#f59e0b" }]}
                onPress={handleDeactivate}
              >
                <Text style={{ color: "#fff" }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🔹 Delete Modal */}
      <Modal visible={showDeleteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalSubtitle}>
              To confirm, type{" "}
              <Text style={{ fontWeight: "bold" }}>"delete my account"</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Type here..."
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#ef4444" }]}
                onPress={handleDeleteAccount}
              >
                <Text style={{ color: "#fff" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🔹 Logout Auto Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Logging Out!</Text>
            <Text style={styles.modalSubtitle}>
              Your account has been deactivated.
            </Text>
            <ActivityIndicator size="large" color="#555555" style={{ marginTop: 10 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafaf9",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#555555",
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#374151",
    marginBottom: 30,
    lineHeight: 20,
  },
  button: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555555",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "85%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#9ca3af",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  radioOuterActive: {
    borderColor: "#555555",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#555555",
  },
  radioLabel: {
    fontSize: 15,
    color: "#111827",
  },
});
