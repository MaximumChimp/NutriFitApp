import React, { useState, useEffect } from "react"; 
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import { app } from "../../../../config/firebase-config";

const db = getFirestore(app);

export default function PaymentMethodScreen({ navigation, route }) {
  const {
    cartItems = [],
    totalPrice = 0,
    deliveryAddress = "",
    deliveryCoords = {},
    selectedMeal = null,
  } = route.params || {};

  const [methods, setMethods] = useState([
    { id: "cod", label: "Cash on Delivery", enabled: true },
    { id: "gcash", label: "GCash", enabled: true },
  ]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "payment"),
      (snapshot) => {
        const updated = [...methods];
        snapshot.forEach((doc) => {
          const id = doc.id.toLowerCase();
          const idx = updated.findIndex((m) => m.id === id);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], ...doc.data(), enabled: doc.data().enabled ?? true };
          }
        });
        setMethods(updated);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSelect = (id) => setSelected(id);

const handleContinue = async () => {
  if (!selected) return;

  // Generate a single orderId for this transaction if none exists
  const orderId = selectedMeal?.orderId || cartItems[0]?.orderId ;

  let simplifiedCart = [];
  let finalTotal = totalPrice;

  if (selectedMeal) {
    simplifiedCart = [
      {
        mealName: selectedMeal.mealName,
        price: selectedMeal.price,
        quantity: 1,
        specialInstructions: selectedMeal.specialInstructions || "",
        calories: selectedMeal.calories || 0,
        protein: selectedMeal.protein || 0,
        carbs: selectedMeal.carbs || 0,
        fat: selectedMeal.fat || 0,
        orderId, // always include orderId
      },
    ];
    finalTotal = selectedMeal.price;
  } else {
    simplifiedCart = cartItems.map((item) => ({
      mealName: item.mealName,
      price: item.price,
      quantity: item.quantity || 1,
      specialInstructions: item.specialInstructions || "",
      calories: item.calories || 0,
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      fat: item.fat || 0,
      orderId, // reuse the same orderId for all items
    }));
  }

  // Save to AsyncStorage
  await AsyncStorage.multiSet([
    ["cartMeals", JSON.stringify(simplifiedCart)],
    ["paymentMethod", selected],
    ["totalPrice", finalTotal.toString()],
    ["deliveryAddress", deliveryAddress],
  ]);

  // Navigate
  if (selected === "gcash") {
    navigation.navigate("GcashPayment", {
      cartMeals: simplifiedCart,
      totalPrice: finalTotal,
      deliveryAddress,
      location: deliveryCoords,
      paymentMethod: selected,
      orderId, // always pass
    });
  } else {
    navigation.navigate("ConfirmOrder", {
      cartMeals: simplifiedCart,
      totalPrice: finalTotal,
      deliveryAddress,
      location: deliveryCoords,
      paymentMethod: selected,
      orderId, // optional for COD
    });
  }
};

useEffect(() => {
  console.log("🛒 Cart items received in PaymentMethodScreen:");
  if (cartItems.length > 0) {
    cartItems.forEach((item, index) => {
      console.log(
        `   #${index + 1}`,
        "\n   Meal Name:", item.mealName,
        "\n   Price:", item.price,
        "\n   Quantity:", item.quantity || 1,
        "\n   Calories:", item.calories || 0,
        "\n   Order ID:", item.orderId || "(no orderId)"
      );
    });
  } else {
    console.log("   No cart items received (possibly single meal order).");
  }

  if (selectedMeal) {
    console.log("🍽 Selected single meal details:");
    console.log({
      mealName: selectedMeal.mealName,
      price: selectedMeal.price,
      calories: selectedMeal.calories,
      orderId: selectedMeal.orderId || "(no orderId)",
    });
  }

  console.log("💰 Total Price:", totalPrice);
  console.log("📍 Delivery Address:", deliveryAddress);
  console.log("📌 Delivery Coords:", deliveryCoords);
}, []);

  const renderItem = ({ item }) => {
    const isDisabled = !item.enabled;
    const isSelected = selected === item.id;

    return (
      <TouchableOpacity
        activeOpacity={isDisabled ? 1 : 0.7}
        onPress={() => !isDisabled && handleSelect(item.id)}
        style={[
          styles.option,
          isSelected && styles.optionSelected,
          isDisabled && styles.optionDisabled,
          !isSelected && styles.optionNoShadow,
        ]}
      >
        <Text style={[styles.optionText, isDisabled && { color: "#aaa" }]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#111827" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Select Payment Method</Text>

      <FlatList
        data={methods}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingBottom: 30 }}
      />

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, !selected && { opacity: 0.6 }]}
        disabled={!selected}
        onPress={handleContinue}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f9fafb", paddingTop: 50 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  backText: { marginLeft: 8, fontSize: 16, fontWeight: "500", color: "#111827" },
  title: { fontSize: 24, fontWeight: "700", color: "#555555", marginBottom: 20 },

  option: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  optionSelected: {
    borderColor: "#22c55e",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  optionDisabled: { opacity: 0.6 },
  optionText: { fontSize: 16, fontWeight: "600", color: "#111827", textAlign: "center" },
  optionNoShadow: { shadowOpacity: 0, elevation: 0 },

  continueButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
    elevation: 3,
  },
  continueButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
