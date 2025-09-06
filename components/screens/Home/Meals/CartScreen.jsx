import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth } from "firebase/auth";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function CartScreen({ navigation }) {
  const anim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [cartItems, setCartItems] = useState([]);
  const [visible, setVisible] = useState(true); // controls rendering

  const auth = getAuth();
  const user = auth.currentUser;

  // Load cart and animate sidebar in
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    const loadCart = async () => {
      if (!user) return;
      const stored = await AsyncStorage.getItem(`cart_${user.uid}`);
      setCartItems(stored ? JSON.parse(stored) : []);
    };

    loadCart();
  }, []);

  const saveCart = async (updatedCart) => {
    setCartItems(updatedCart);
    if (user) {
      await AsyncStorage.setItem(`cart_${user.uid}`, JSON.stringify(updatedCart));
    }
  };

  // Close sidebar
  const closeSidebar = (targetScreen = null) => {
    Animated.timing(anim, {
      toValue: SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setVisible(false); // hide content after animation
      if (targetScreen) {
        navigation.replace(targetScreen, { cartItems });
      } else {
        navigation.replace("MainTabs", { screen: "Order" });
      }
    });
  };

  const handleCheckout = () => {
    if (!cartItems.length) {
      alert("Your cart is empty!");
      return;
    }
    closeSidebar("PaymentMethod");
  };

  const increaseQuantity = (index) => {
    const updated = [...cartItems];
    updated[index].quantity += 1;
    saveCart(updated);
  };

  const decreaseQuantity = (index) => {
    const updated = [...cartItems];
    if (updated[index].quantity > 1) updated[index].quantity -= 1;
    else updated.splice(index, 1);
    saveCart(updated);
  };

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + (item.price || 0) * item.quantity,
    0
  );

  // Render nothing if hidden
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cart</Text>
          <TouchableOpacity onPress={() => closeSidebar()}>
            <Ionicons name="close" size={28} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, marginTop: 16 }}>
          {!cartItems.length ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 50,
              }}
            >
              <Text style={{ fontSize: 16, color: "#6b7280" }}>
                Your cart is empty.
              </Text>
            </View>
          ) : (
            cartItems.map((item, idx) => (
              <View key={idx} style={styles.cartItem}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16 }}>{item.mealName}</Text>
                  <Text style={{ color: "#6b7280" }}>
                    ₱ {item.price?.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    onPress={() => decreaseQuantity(idx)}
                    style={styles.qtyButton}
                  >
                    <Ionicons
                      name="remove-circle-outline"
                      size={24}
                      color="#14532d"
                    />
                  </TouchableOpacity>
                  <Text style={{ marginHorizontal: 8, fontSize: 16 }}>
                    {item.quantity}
                  </Text>
                  <TouchableOpacity
                    onPress={() => increaseQuantity(idx)}
                    style={styles.qtyButton}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={24}
                      color="#14532d"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total: ₱ {totalPrice.toFixed(2)}</Text>
        </View>

        <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
          <Text style={styles.checkoutBtnText}>Checkout</Text>
        </TouchableOpacity>
      </Animated.View>
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
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#14532d" },
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
  totalText: { fontSize: 18, fontWeight: "700", color: "#111827", textAlign: "right" },
});
