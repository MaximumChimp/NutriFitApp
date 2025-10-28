import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import { db } from "../../../config/firebase-config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";

const MAX_CHARS = 500;

const HelpScreen = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigation = useNavigation();

  const handleSendConcern = async () => {
    if (!subject.trim() || !message.trim()) {
      alert("Please fill in both fields.");
      return;
    }

    if (message.length > MAX_CHARS) {
      alert(`Your message exceeds the ${MAX_CHARS}-character limit.`);
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert("Please sign in to send your concern.");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "helpRequests"), {
        uid: user.uid,
        email: user.email || "N/A",
        subject: subject.trim(),
        message: message.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setSubject("");
      setMessage("");
      setSubmitted(true);
    } catch (error) {
      console.error("Error sending help request:", error);
      alert("Failed to send your message. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#111827" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      

      <View style={styles.header}>
        <Ionicons name="help-circle" size={40} color="#22c55e" />
        <Text style={styles.title}>Help & Support</Text>
        <Text style={styles.subtitle}>
          Tell us what’s not working or share ideas on how we can improve your
          experience.
        </Text>
      </View>

      {/* Success Message */}
      {submitted ? (
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={60} color="#22c55e" />
          <Text style={styles.successTitle}>Thank You!</Text>
          <Text style={styles.successText}>
            Your message has been sent successfully. Our support team will reach
            out to you soon.
          </Text>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter subject"
            value={subject}
            onChangeText={setSubject}
            maxLength={100}
          />

          <Text style={styles.label}>Your Concern</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your concern..."
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            maxLength={MAX_CHARS}
          />
          <Text style={styles.charCount}>
            {message.length}/{MAX_CHARS}
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleSendConcern}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.buttonText}>Send Message</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

export default HelpScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f9fafb",
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 10,
    marginTop: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 8,
    color: "#111827",
  },
  subtitle: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 4,
    fontSize: 14,
    paddingHorizontal: 20,
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginBottom: 10,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  charCount: {
    textAlign: "right",
    color: "#6b7280",
    fontSize: 12,
    marginBottom: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 6,
  },
  successCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginTop: 10,
  },
  successText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 6,
    fontSize: 14,
  },
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
