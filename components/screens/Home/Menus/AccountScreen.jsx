import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import axios from "axios";
import { getAuth, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../../config/firebase-config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useNavigation } from "@react-navigation/native";
export default function AccountScreen() {
  const auth = getAuth();
  const user = auth.currentUser;
  const userId = user?.uid;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(""); 
  const [avatarUri, setAvatarUri] = useState(user?.photoURL || null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
useEffect(() => {
  const fetchUserData = async () => {
    if (!userId) return;

    try {
      const localProfile = await AsyncStorage.getItem("userProfile");
      if (localProfile) {
        const parsed = JSON.parse(localProfile);
        setFirstName(parsed.firstName || "");
        setLastName(parsed.lastName || "");
        // strip leading 0 for input but keep display consistent
        setPhoneNumber(parsed.phone ? parsed.phone.replace(/^0/, "") : "");
        if (parsed.photoURL) setAvatarUri(parsed.photoURL);
      }

      const state = await NetInfo.fetch();
      if (!state.isConnected) { setLoading(false); return; }

      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setPhoneNumber(data.phone ? data.phone.replace(/^0/, "") : ""); // remove leading 0 for input
        if (data.photoURL) setAvatarUri(data.photoURL);

        await AsyncStorage.setItem("userProfile", JSON.stringify(data));
      }
    } catch (error) {
      console.error(error);
    } finally { setLoading(false); }
  };

  fetchUserData();
}, [userId]);


  const firstInitial = firstName?.[0] || "";
  const lastInitial = lastName?.[0] || "";

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return alert("Permission denied!");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setUploading(true);
      const uri = result.assets[0].uri;

      const localUri = await saveImageLocally(uri);
      const imageUrl = await uploadToImgbb(localUri);
      if (imageUrl) setAvatarUri(imageUrl);

      setUploading(false);
    }
  };

  const saveImageLocally = async (uri) => {
    try {
      const fileName = `${firstName}_${lastName}_${Date.now()}.jpg`;
      const dest = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      return dest;
    } catch (error) {
      console.error("Local save error:", error);
      Alert.alert("Error", "Failed to save image locally.");
      return uri;
    }
  };

  const uploadToImgbb = async (uri) => {
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop();
      formData.append("image", { uri, name: filename, type: "image/jpeg" });

      const apiKey = "5d3311f90ffc71914620a8d5c008eb9a";
      const response = await axios.post(
        `https://api.imgbb.com/1/upload?key=${apiKey}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      return response.data.data.url;
    } catch (error) {
      console.error("ImgBB upload error:", error);
      Alert.alert("Error", "Failed to upload image. Please check your connection.");
      return null;
    }
  };

// Updated handleSave
const handleSave = async () => {
  if (!user) return;

  let formattedPhone = null;

  // Validate phone only if user entered something
  if (phoneNumber) {
    const phoneRegex = /^9\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      Alert.alert(
        "Invalid Phone Number",
        "Please enter a valid 10-digit mobile number starting with 9 (e.g., 9157557570)."
      );
      return;
    }
    formattedPhone = "0" + phoneNumber; // prepend 0 for database
  }

  try {
    const displayName = firstName + (lastName ? ` ${lastName}` : "");
    await updateProfile(user, { displayName, photoURL: avatarUri });

    const userRef = doc(db, "users", userId);
    const profileData = {
      firstName,
      lastName,
      photoURL: avatarUri,
    };

    if (formattedPhone) profileData.phone = formattedPhone;

    await setDoc(userRef, profileData, { merge: true });

    await AsyncStorage.setItem("userProfile", JSON.stringify(profileData));

    Alert.alert("Success", "Account info saved!");
  } catch (error) {
    console.error(error);
    Alert.alert(
      "Save Failed",
      "Failed to save account info. Please check your internet connection and try again."
    );
  }
};



  if (loading)
    return <ActivityIndicator size="large" style={{ flex: 1 }} color="#22c55e" />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#111827" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
        <Text style={styles.title}>Manage Profile</Text>

        <View style={styles.avatarContainer}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {firstInitial}{lastInitial}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.editAvatar} onPress={pickImage}>
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="camera" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Enter your first name"
        />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Enter your last name"
        />

        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.phoneContainer}>
          <Text style={styles.flag}>🇵🇭</Text>
          <Text style={styles.countryCode}>+63</Text>
          <TextInput
            style={styles.phoneInput}
            value={phoneNumber}
            onChangeText={(text) => {
              // remove non-digit chars
              let cleaned = text.replace(/[^0-9]/g, "");

              // remove leading 0 if user types it
              if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);

              // limit to 10 digits
              if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);

              setPhoneNumber(cleaned);
            }}
            placeholder="9123456789"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 20 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#555555",
    marginBottom: 30,
  },
  avatarContainer: { alignSelf: "center", marginBottom: 30, position: "relative" },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#d1fae5",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#bbf7d0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: { fontSize: 36, fontWeight: "700", color: "#555555" },
  editAvatar: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#22c55e",
    borderRadius: 20,
    padding: 8,
  },
  label: {
    fontSize: 16,
    color: "#555555",
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  flag: { fontSize: 22, marginRight: 6 },
  countryCode: { fontSize: 16, fontWeight: "500", color: "#555555", marginRight: 6 },
  phoneInput: { flex: 1, paddingVertical: 14, fontSize: 16 },
  saveButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#22c55e",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 10,
  },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  backButton: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 30,
  marginTop:10
},
backText: {
  marginLeft: 8,
  fontSize: 16,
  fontWeight: "500",
  color: "#111827",
},

});
