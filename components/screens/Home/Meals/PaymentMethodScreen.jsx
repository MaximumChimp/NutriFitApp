import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { app } from '../../../../config/firebase-config';

const db = getFirestore(app);

const PAYMENT_METHODS_STATIC = {
  card: {
    label: 'Credit / Debit Card',
    image: require('../../../../assets/payments/Card.png'),
  },
  gcash: {
    label: 'GCash',
    image: require('../../../../assets/payments/Gcash.png'),
  },
  paypal: {
    label: 'PayPal',
    image: require('../../../../assets/payments/Paypal.png'),
  },
  cod: {
    label: 'Cash on Delivery',
    image: null,
  },
};

export default function PaymentMethodScreen({ navigation, route }) {
  const { cart, totalPrice, userAddress } = route.params;
  const [selected, setSelected] = useState(null);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'payment'), (snapshot) => {
      const updated = [];

      snapshot.forEach((doc) => {
        const id = doc.id.toLowerCase();
        const data = doc.data();
        const enabled = data?.enabled ?? true;

        console.log('[DEBUG] Payment Method:', id, 'enabled:', enabled);

        if (PAYMENT_METHODS_STATIC[id]) {
  updated.push({
    id,
    label: PAYMENT_METHODS_STATIC[id].label,
    image: PAYMENT_METHODS_STATIC[id].image,
    enabled,
  });
} else {
  console.warn(`Payment method '${id}' not found in static config`);
}

      });

      setMethods(updated);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

    const handleConfirm = () => {
    if (!selected) return;

    navigation.navigate('ConfirmOrder', {
        paymentMethod: selected,
        cartItems: cart,
        totalPrice,
        deliveryAddress: userAddress,
    });
    };


  const renderItem = ({ item }) => {
    const isDisabled = !item.enabled;
    const isSelected = selected === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.option,
          isSelected && styles.optionSelected,
          isDisabled && styles.optionDisabled,
        ]}
        onPress={() => !isDisabled && setSelected(item.id)}
        activeOpacity={isDisabled ? 1 : 0.7}
      >
        <Ionicons
          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
          size={24}
          color={isDisabled ? '#aaa' : '#14532d'}
          style={{ marginRight: 12 }}
        />
        {item.image && (
          <Image
            source={item.image}
            style={[styles.optionImage, isDisabled && { opacity: 0.4 }]}
          />
        )}
        <Text style={[styles.optionText, isDisabled && { color: '#aaa' }]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#14532d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Payment Method</Text>

      {methods.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>
          No payment methods available at the moment.
        </Text>
      ) : (
        <FlatList
          data={methods}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
        />
      )}

      <TouchableOpacity
        style={[styles.confirmButton, !selected && { opacity: 0.5 }]}
        onPress={handleConfirm}
        disabled={!selected}
      >
        <Text style={styles.confirmButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fefce8', paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20,color:'#14532d'},
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  optionSelected: {
    borderColor: '#14532d',
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    marginRight: 10,
  },
  optionText: {
    fontSize: 16,
  },
  confirmButton: {
    marginTop: 30,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
