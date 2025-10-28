import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  GeoPoint,
  getDoc,
  doc,
  onSnapshot
} from "firebase/firestore";
import { useCart } from "../../../context/CartContext";
import { Ionicons } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function ConfirmOrderScreen() {
  const { clearCart } = useCart();
  const route = useRoute();
  const navigation = useNavigation();
  const { cartMeals = [], paymentMethod } = route.params;
  const [orderId, setOrderId] = useState(null); 
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(
    route.params?.deliveryAddress || ""
  );
  const [location, setLocation] = useState(
    route.params?.location || { latitude: null, longitude: null }
  );

  const [userPhone, setUserPhone] = useState(null);

  const totalPrice = useMemo(() => {
    return cartMeals.reduce((sum, item) => sum + item.quantity * item.price, 0);
  }, [cartMeals]);



useEffect(() => {
    (async () => {
      try {
        const savedAddress = await AsyncStorage.getItem("userAddress");
        const savedCoords = await AsyncStorage.getItem("userCoords");

        if (savedAddress) setDeliveryAddress(savedAddress);
        if (savedCoords) setLocation(JSON.parse(savedCoords));
      } catch (err) {
        console.error("Error fetching saved address:", err);
      }

      // 🔹 Fetch phone number from Firestore
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const db = getFirestore();
          const userRef = doc(db, "users", user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            setUserPhone(snap.data().phone || null);
          }
        }
      } catch (err) {
        console.error("Error fetching phone:", err);
      }
    })();
  }, []);

  const generateOrderId = (cartMeals) => {
    const initials = cartMeals
      .map((meal) =>
        meal.mealName
          .split(" ")
          .map((word) => word[0]?.toUpperCase())
          .join("")
      )
      .join("-");

    const now = new Date();
    const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomNum = Math.floor(1000 + Math.random() * 9000);

    return `${initials}-ORD-${yyyymmdd}-${randomNum}`;
  };

useEffect(() => {
  const db = getFirestore();
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user || !orderId) return;

  const orderRef = doc(db, "orders", orderId);

  const unsubscribe = onSnapshot(orderRef, async (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();

    // trigger only once when status becomes "done"
    if (data.status.toLowerCase() === "done" && data.cartMeals) {
      console.log("✅ order marked as done — saving to local storage...");
      await saveOrderedMealsToLocal(data.cartMeals);
    }
  });

  return () => unsubscribe();
}, [orderId]);



  const saveOrderedMealsToLocal = async (orderedMeals) => {
  const user = getAuth().currentUser;
  if (!user) return;

  try {
    const existingData = await AsyncStorage.getItem(`${user.uid}_orderedMeals`);
    const parsed = existingData ? JSON.parse(existingData) : [];

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 5);

    const mealsWithDate = orderedMeals.map((m) => ({
      mealName: m.mealName,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      quantity: m.quantity,
      date,
      time,
    }));

    const updated = [...parsed, ...mealsWithDate];
    await AsyncStorage.setItem(`${user.uid}_orderedMeals`, JSON.stringify(updated));

    console.log("🥗 Saved ordered meals to local:", mealsWithDate);
  } catch (error) {
    console.error("Error saving ordered meals locally:", error);
  }
};



const handlePlaceOrder = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Error", "You must be logged in to place an order.");
      return;
    }

    const db = getFirestore();
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const phone = userSnap.exists() ? userSnap.data().phone : null;

    // 🔹 Check if phone is missing or empty
    if (!phone || phone.trim() === "") {
      console.log("📞 No phone found, showing modal");
      setShowPhoneModal(true);
      return;
    }

    // 🔹 Prepare order data
    const ordersRef = collection(db, "orders");
    const orderIdGenerated = generateOrderId(cartMeals);

    const orderData = {
      userId: user.uid,
      cartMeals,
      totalPrice,
      deliveryAddress,
      paymentMethod,
      status: "Pending",
      placedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      orderId: orderIdGenerated,
      phoneNumber: phone,
    };

    if (
      location &&
      typeof location.latitude === "number" &&
      typeof location.longitude === "number"
    ) {
      orderData.location = new GeoPoint(location.latitude, location.longitude);
    }

    // 🔹 Add order to Firestore
    const docRef = await addDoc(ordersRef, orderData);
    setOrderId(docRef.id);

    // 🔹 Clear cart locally
    await AsyncStorage.removeItem(`cart_${user.uid}`);
    clearCart();

    // 🔹 Notify user
    Alert.alert(
      "Order Placed",
      `Your order (${orderData.orderId}) has been saved!`
    );

    // 🔹 Navigate to TrackOrderScreen
    navigation.navigate("TrackOrderScreen", {
      orderId: docRef.id,
      friendlyId: orderData.orderId,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    Alert.alert("Error", "Something went wrong while placing your order.");
  }
};


  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemRow}>
        <View style={styles.itemLeft}>
          <Text style={styles.quantityText}>{item.quantity}×</Text>
          <Text style={styles.mealNameText}>{item.mealName}</Text>
        </View>
        <Text style={styles.itemPrice}>
          ₱{(item.quantity * item.price).toFixed(2)}
        </Text>
      </View>
      {item.specialInstructions?.trim() ? (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsLabel}>Special Instructions:</Text>
          <Text style={styles.instructionsText}>{item.specialInstructions}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 🔹 Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={28} color="#111827" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Order Summary</Text>
      <Text style={styles.subText}>Please review your order before placing it.</Text>

      <View style={styles.card}>
        <FlatList
          data={cartMeals}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Your cart is empty.</Text>
          }
        />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₱{totalPrice.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>📍 Delivery Address</Text>
        <Text style={styles.infoText}>
          {deliveryAddress || "No address selected"}
        </Text>

        <Text style={[styles.infoLabel, { marginTop: 16 }]}>📞 Phone Number</Text>
        <Text style={styles.infoText}>
          {userPhone || "No phone number added"}
        </Text>

        <Text style={[styles.infoLabel, { marginTop: 16 }]}>💳 Payment Method</Text>
        <Text style={styles.infoText}>
          {paymentMethod?.toUpperCase() === "COD" ? "Cash on Delivery" : paymentMethod}
        </Text>
      </View>


      <Text style={styles.confirmNote}>
        By placing this order, you agree to our terms and cancellation policy.
      </Text>

      <TouchableOpacity style={styles.checkoutButton} onPress={handlePlaceOrder}>
        <Text style={styles.checkoutButtonText}>Place Order</Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={showPhoneModal}
        animationType="fade"
        onRequestClose={() => setShowPhoneModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}>
          <View style={{
            backgroundColor: "#fff",
            padding: 20,
            borderRadius: 12,
            width: "80%",
            alignItems: "center",
          }}>
            <Ionicons name="call-outline" size={40} color="#22c55e" />
            <Text style={{ fontSize: 16, textAlign: "center", marginVertical: 12 }}>
              Please add a phone number to continue your order.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#22c55e",
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
              }}
              onPress={() => {
                setShowPhoneModal(false);
                navigation.replace("Account");
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                Go to Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafaf9", padding: 20, paddingTop: 40 },
  title: { fontSize: 26, fontWeight: "700", color: "#555555", marginBottom: 4 },
  subText: { fontSize: 14, color: "#6b7280", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  quantityText: { fontWeight: "600", marginRight: 8, color: "#1c1917" },
  mealNameText: { fontSize: 16, color: "#1c1917", flexShrink: 1 },
  itemPrice: { fontWeight: "600", color: "#1c1917" },
  separator: { height: 1, backgroundColor: "#e5e5e5", marginVertical: 10 },
  instructionsContainer: { marginTop: 4, padding: 8, borderRadius: 8 },
  instructionsLabel: { fontSize: 12, color: "#4b5563", fontWeight: "600", marginBottom: 2 },
  instructionsText: { fontSize: 13, color: "#6b7280", fontStyle: "italic" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 12,
  },
  totalLabel: { fontSize: 18, fontWeight: "bold", color: "#555555" },
  totalValue: { fontSize: 18, fontWeight: "bold", color: "#555555" },
  emptyText: { textAlign: "center", color: "#9ca3af", paddingVertical: 20, fontStyle: "italic" },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  infoLabel: { fontWeight: "600", color: "#555555", fontSize: 14 },
  infoText: { color: "#444", fontSize: 15, marginTop: 4, marginBottom: 10 },
  confirmNote: { fontSize: 12, color: "#6b7280", textAlign: "center", marginBottom: 12 },
  checkoutButton: { backgroundColor: "#22c55e", paddingVertical: 16, borderRadius: 12, alignItems: "center", elevation: 4 },
  checkoutButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 8,
    color: "#111827",
  },
    modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: SCREEN_WIDTH * 0.75,
    alignItems: "center",
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 12,
    color: "#111827",
  },
  modalBtn: {
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  modalBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
