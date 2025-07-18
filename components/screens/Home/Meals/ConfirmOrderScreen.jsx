import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { app } from '../../../../config/firebase-config';

const db = getFirestore(app);

export default function ConfirmOrderScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  // Safe destructure with fallback to prevent crash
  const {
    cartItems = [],
    totalPrice = 0,
    deliveryAddress = 'No address',
    paymentMethod = 'cod',
  } = route.params || {};

  const handlePlaceOrder = async () => {
    try {
      const order = {
        items: cartItems.map((item) => ({
          name: item.mealName,
          quantity: item.quantity,
          price: item.price,
        })),
        total: totalPrice,
        address: deliveryAddress,
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'unpaid' : 'pending',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'orders'), order);

      Alert.alert('Success', 'Your order has been placed!', [
        {
          text: 'OK',
          onPress: () => navigation.replace('OrderSuccess'),
        },
      ]);
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Confirm Your Order</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items:</Text>
        {cartItems.length > 0 ? (
          cartItems.map((item, index) => (
            <Text key={index} style={styles.itemText}>
              {item.quantity}x {item.mealName} - ₱
              {(item.price * item.quantity).toFixed(2)}
            </Text>
          ))
        ) : (
          <Text style={styles.itemText}>No items in cart.</Text>
        )}
        <Text style={styles.totalText}>Total: ₱{totalPrice.toFixed(2)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address:</Text>
        <Text>{deliveryAddress}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method:</Text>
        <Text style={styles.paymentText}>{paymentMethod.toUpperCase()}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handlePlaceOrder}>
        <Text style={styles.buttonText}>Place Order</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fefce8',
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemText: {
    fontSize: 16,
  },
  totalText: {
    marginTop: 10,
    fontWeight: 'bold',
    fontSize: 18,
  },
  paymentText: {
    fontSize: 16,
    color: '#14532d',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#14532d',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
