import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  GeoPoint,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ConfirmOrderScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const {
    cartMeals = [],
    totalPrice,
    deliveryAddress,
    paymentMethod,
    location = { latitude: null, longitude: null },
  } = route.params;

  const handlePlaceOrder = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to place an order.');
        return;
      }

      const db = getFirestore();
      const orderData = {
        userId: user.uid,
        cartMeals,
        totalPrice,
        deliveryAddress,
        paymentMethod,
        status: 'pending',
        placedAt: serverTimestamp(),
      };

      // ✅ Add GeoPoint only if valid
      if (
        location &&
        typeof location.latitude === 'number' &&
        typeof location.longitude === 'number'
      ) {
        orderData.location = new GeoPoint(location.latitude, location.longitude);
      }

      await addDoc(collection(db, 'orders'), orderData);
      await AsyncStorage.removeItem(`cart_${user.uid}`);
      Alert.alert('✅ Order Placed', 'Your order has been saved successfully!');
      navigation.navigate('MainTabs', { screen: 'Order' });


    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Something went wrong while placing your order.');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemRow}>
      <View style={styles.itemLeft}>
        <Text style={styles.quantityText}>{item.quantity}×</Text>
        <Text style={styles.mealNameText}>{item.mealName}</Text>
      </View>
      <Text style={styles.itemPrice}>₱{(item.quantity * item.price).toFixed(2)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Summary</Text>
      <Text style={styles.subText}>Please review your order before placing it.</Text>

      <View style={styles.card}>
        <FlatList
          data={cartMeals}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Your cart is empty.</Text>}
        />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₱{totalPrice.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>📍 Delivery Address</Text>
        <Text style={styles.infoText}>{deliveryAddress}</Text>

        <Text style={[styles.infoLabel, { marginTop: 16 }]}>💳 Payment Method</Text>
        <Text style={styles.infoText}>
          {paymentMethod.toUpperCase() === 'COD' ? 'Cash on Delivery' : paymentMethod}
        </Text>
      </View>

      <Text style={styles.confirmNote}>
        By placing this order, you agree to our terms and cancellation policy.
      </Text>

      <TouchableOpacity style={styles.checkoutButton} onPress={handlePlaceOrder}>
        <Text style={styles.checkoutButtonText}>Place Order</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#14532d',
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quantityText: {
    fontWeight: '600',
    marginRight: 8,
    color: '#1c1917',
  },
  mealNameText: {
    fontSize: 16,
    color: '#1c1917',
    flexShrink: 1,
  },
  itemPrice: {
    fontWeight: '600',
    color: '#1c1917',
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#14532d',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#14532d',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#14532d',
    fontSize: 14,
  },
  infoText: {
    color: '#444',
    fontSize: 15,
    marginTop: 4,
    marginBottom: 10,
  },
  confirmNote: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  checkoutButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
