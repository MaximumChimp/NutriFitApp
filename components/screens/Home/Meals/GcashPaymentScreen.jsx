import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { app } from "../../../../config/firebase-config";
import { getAuth } from "firebase/auth";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system"; // for downloading

const auth = getAuth(app);
const db = getFirestore(app);

export default function GcashPaymentScreen({ navigation, route }) {
  const { cartMeals, totalPrice, deliveryAddress, location, orderId } = route.params || {};
  const [gcashData, setGcashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadedProofUrl, setUploadedProofUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImageUri, setModalImageUri] = useState(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const paymentDocId = `proof_${auth.currentUser?.uid}_${orderId}`;

  // Fetch GCash info and check for existing proof
  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, "payment", "gcash");
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) setGcashData(snapshot.data());

        const proofRef = doc(db, "paymentProofs", paymentDocId);
        const proofSnap = await getDoc(proofRef);
        if (proofSnap.exists()) {
          setHasPaid(true);
          setUploadedProofUrl(proofSnap.data().proofUrl);
        }
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to fetch data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

    // 🧾 Log meal details and order ID for debugging
  useEffect(() => {
    console.log("🧾 GcashPaymentScreen loaded");
    console.log("📦 Order ID:", orderId);
    console.log("🛒 Cart Meals:");
    (cartMeals || []).forEach((meal, idx) => {
      console.log(
        `  #${idx + 1}`,
        "\n   Meal Name:", meal.mealName,
        "\n   Quantity:", meal.quantity,
        "\n   Price:", meal.price,
        "\n   Calories:", meal.calories || 0
      );
    });
    console.log("💰 Total Price:", totalPrice);
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return Alert.alert("Permission denied", "Access to photos is required.");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) setSelectedImage(result.assets[0].uri);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to select image.");
    }
  };

  const handleContinue = async () => {
    if (!auth.currentUser) return Alert.alert("Not Signed In", "Please sign in to continue.");

    if (!hasPaid && !selectedImage) {
      Alert.alert("No Image", "Please select a proof of payment before continuing.");
      return;
    }

    setUploading(true);

    try {
      let proofUrl = uploadedProofUrl;

      if (!hasPaid) {
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result.split(",")[1]);
          reader.onerror = reject;
        });
        reader.readAsDataURL(blob);
        const base64Image = await base64Promise;

        const imgbbResponse = await fetch(
          `https://api.imgbb.com/1/upload?key=5d3311f90ffc71914620a8d5c008eb9a`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `image=${encodeURIComponent(base64Image)}`,
          }
        );

        const imgbbData = await imgbbResponse.json();
        if (!imgbbData.success) throw new Error("ImgBB upload failed");
        proofUrl = imgbbData.data.url;

        const mealsData = (cartMeals || []).map((meal) => ({
          mealName: meal?.mealName || "Unnamed Meal",
          quantity: meal?.quantity ?? 1,
        }));

        await setDoc(doc(db, "paymentProofs", paymentDocId), {
          user: auth.currentUser.uid,
          cartMeals: mealsData,
          proofUrl,
          paymentMethod: "gcash",
          timestamp: new Date(),
        });
      }

      // Update order status
      if (orderId) {
        const orderRef = doc(db, "orders", orderId);
        await setDoc(orderRef, { status: "paid", paidAt: new Date() }, { merge: true });
      }

      setHasPaid(true);
      setUploadedProofUrl(proofUrl);

      navigation.navigate("ConfirmOrder", {
        cartMeals,
        totalPrice,
        deliveryAddress,
        paymentMethod: "gcash",
        location,
        orderId,
      });
    } catch (err) {
      console.error(err);
      Alert.alert("Upload Failed", "Failed to upload proof. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const openModal = (uri) => {
    setModalImageUri(uri);
    setModalVisible(true);
  };


const downloadQRCode = async () => {
  try {
    setDownloading(true); // start spinner
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Cannot save image.");
      setDownloading(false);
      return;
    }

    const uri = gcashData.qrImageOriginalUrl || gcashData.qrImageUrl;
    const fileUri = FileSystem.documentDirectory + "gcash_qr.png";

    const download = await FileSystem.downloadAsync(uri, fileUri);
    await MediaLibrary.saveToLibraryAsync(download.uri);

    Alert.alert("Success", "QR code saved successfully!");
  } catch (err) {
    console.error(err);
    Alert.alert("Error", "Failed to save QR code.");
  } finally {
    setDownloading(false); 
  }
};

  if (loading)
    return <ActivityIndicator style={styles.loader} size="large" color="#22c55e" />;

  if (!gcashData)
    return (
      <View style={styles.loader}>
        <Text style={{ color: "#111827" }}>No GCash data available</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#111827" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Scan Qr Code to Pay</Text>

      <View style={styles.qrWrapper}>
        {imageLoading && <ActivityIndicator size="large" color="#22c55e" style={styles.qrLoader} />}
        <TouchableOpacity onPress={() => openModal(gcashData.qrImageUrl)}>
          <Image
            source={{ uri: gcashData.qrImageUrl }}
            style={styles.qrImage}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
        </TouchableOpacity>
        <TouchableOpacity
            style={styles.downloadButton}
            onPress={downloadQRCode}
            disabled={downloading} // optional: disable while downloading
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="download" size={24} color="#fff" />
            )}
          </TouchableOpacity>

      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>Account Name:</Text>
        <Text style={styles.value}>{gcashData.accountName}</Text>

        <Text style={styles.label}>Account Number:</Text>
        <Text style={styles.value}>{gcashData.accountNumber}</Text>
      </View>

      {!hasPaid && (
        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <MaterialIcons name="cloud-upload" size={20} color="#fff" />
          <Text style={styles.uploadText}>{selectedImage ? "Change Proof" : "Select Proof of Payment"}</Text>
        </TouchableOpacity>
      )}

      {selectedImage && !hasPaid && (
        <TouchableOpacity onPress={() => openModal(selectedImage)}>
          <Image source={{ uri: selectedImage }} style={styles.previewImage} />
        </TouchableOpacity>
      )}

      {hasPaid && uploadedProofUrl && (
        <TouchableOpacity onPress={() => openModal(uploadedProofUrl)}>
          <Text style={{ marginBottom: 8, fontWeight: "700" }}>Proof of Payment:</Text>
          <Image source={{ uri: uploadedProofUrl }} style={styles.previewImage} />
        </TouchableOpacity>
      )}

      <View style={styles.bottomButtonWrapper}>
        <TouchableOpacity
          style={[styles.continueButton, !hasPaid && !selectedImage && { opacity: 0.6 }]}
          disabled={!hasPaid && !selectedImage || uploading}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>
            {uploading ? "Uploading..." : hasPaid ? "Continue" : "Send Proof"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalBackground} onPress={() => setModalVisible(false)} />
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: modalImageUri }} style={styles.fullscreenImage} resizeMode="contain" />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa", padding: 16, paddingTop: 40 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backText: { marginLeft: 8, fontSize: 16, fontWeight: "500", color: "#111827" },
  title: { fontSize: 22, fontWeight: "600", color: "#111827", marginBottom: 20, textAlign: "center" },
  qrWrapper: { position: "relative", alignItems: "center", marginBottom: 24 },
  qrImage: { width: 200, height: 200, borderRadius: 12 },
  qrLoader: { position: "absolute", top: 90, left: 90 },
  downloadButton: { position: "absolute", top: 8, right: 8, backgroundColor: "#22c55e", padding: 6, borderRadius: 20 },
  infoContainer: { marginBottom: 24, paddingHorizontal: 8 },
  label: { fontSize: 14, color: "#6b7280" },
  value: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 12 },
  uploadButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#3b82f6", paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  uploadText: { color: "#fff", fontWeight: "600", marginLeft: 8, fontSize: 16 },
  previewImage: { width: "100%", height: 200, borderRadius: 12, marginBottom: 12 },
  bottomButtonWrapper: { position: "absolute", bottom: 20, left: 16, right: 16 },
  continueButton: { backgroundColor: "#22c55e", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  continueButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalBackground: { position: "absolute", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.8)" },
  fullscreenImage: { width: "100%", height: "100%" },
  closeButton: { position: "absolute", top: 40, right: 20, zIndex: 2 },
});
