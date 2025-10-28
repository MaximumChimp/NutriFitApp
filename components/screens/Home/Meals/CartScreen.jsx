import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../../../context/CartContext";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../config/firebase-config"; // adjust path

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function CartScreen({ navigation }) {
  const anim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [visible, setVisible] = useState(true);
  const [userPhone, setUserPhone] = useState(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const { cartItems, increaseQuantity, decreaseQuantity } = useCart();

  // 🔹 Load user phone from Firestore
  useEffect(() => {
    const fetchUserPhone = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setUserPhone(snap.data().phone || null);
      }
    };
    fetchUserPhone();
  }, []);

   // 🔹 Animate sidebar in
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, []);
  
// Close sidebar
const closeSidebar = (targetScreen = null, skipDefault = false, params = {}) => {
  Animated.timing(anim, {
    toValue: SCREEN_WIDTH,
    duration: 300,
    useNativeDriver: false,
  }).start(() => {
    setVisible(false);

    // Defer navigation to avoid useInsertionEffect warning
    setTimeout(() => {
      if (targetScreen) {
        navigation.replace(targetScreen, params);
      } else if (!skipDefault) {
        navigation.goBack();
      }
    }, 0);
  });
};

// Handle checkout
const handleCheckout = () => {
  if (!cartItems.length) {
    alert("Your cart is empty!");
    return;
  }

  // Block checkout if phone not added
  if (!userPhone) {
    setShowPhoneModal(true);
    return;
  }

  // Generate orderId
  const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Pass orderId with cartItems
  closeSidebar("PaymentMethod", true, { cartItems, orderId });
};


  const totalPrice = cartItems.reduce(
    (sum, item) => sum + (item.price || 0) * item.quantity,
    0
  );

  if (!visible) return null;

  return (
    <View style={{ flex: 1 }}>
      {/* Grey overlay */}
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        activeOpacity={1}
        onPress={() => closeSidebar()}
      />

      {/* Sidebar */}
      <Animated.View
        style={[styles.sidebar, { transform: [{ translateX: anim }] }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cart</Text>
          <TouchableOpacity onPress={() => closeSidebar()}>
            <Ionicons name="close" size={28} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Items */}
        <ScrollView style={{ flex: 1, marginTop: 16 }}>
          {!cartItems.length ? (
            <View style={styles.emptyCart}>
              <Text style={{ fontSize: 16, color: "#6b7280" }}>
                Your cart is empty.
              </Text>
            </View>
          ) : (
            cartItems.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16 }}>{item.mealName}</Text>
                  <Text style={{ color: "#6b7280" }}>
                    ₱ {item.price?.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    onPress={() => decreaseQuantity(item.id)}
                    style={styles.qtyButton}
                  >
                    <Ionicons
                      name="remove-circle-outline"
                      size={24}
                      color="#555555"
                    />
                  </TouchableOpacity>
                  <Text style={{ marginHorizontal: 8, fontSize: 16 }}>
                    {item.quantity}
                  </Text>
                  <TouchableOpacity
                    onPress={() => increaseQuantity(item.id)}
                    style={styles.qtyButton}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={24}
                      color="#555555"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Total */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total: ₱ {totalPrice.toFixed(2)}</Text>
        </View>

        {/* Checkout Button */}
        <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
          <Text style={styles.checkoutBtnText}>Checkout</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* 🔹 Modal if no phone */}
      <Modal
        transparent
        visible={showPhoneModal}
        animationType="fade"
        onRequestClose={() => setShowPhoneModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="call-outline" size={40} color="#22c55e" />
            <Text style={styles.modalText}>
              Please add a phone number to continue checkout.
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setShowPhoneModal(false);
                setVisible(false);
                navigation.replace("Account"); // 🔹 replace instead of navigate
              }}
            >
              <Text style={styles.modalBtnText}>Go to Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#555555" },
  checkoutBtn: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  checkoutBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomColor: "#e5e7eb",
    borderBottomWidth: 1,
  },
  quantityControls: { flexDirection: "row", alignItems: "center" },
  qtyButton: { paddingHorizontal: 2 },
  totalContainer: {
    paddingVertical: 12,
    borderTopColor: "#e5e7eb",
    borderTopWidth: 1,
    marginBottom: 8,
  },
  totalText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#555555",
    textAlign: "right",
  },
  emptyCart: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
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
