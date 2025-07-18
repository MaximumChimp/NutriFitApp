import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity,DeviceEventEmitter} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {React,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';
import Toast from 'react-native-toast-message';

export default function MealDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { meal } = route.params;
    const [showFullDescription, setShowFullDescription] = useState(false);



const addToCart = async (meal, navigation) => {
  try {
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Toast.show({
        type: 'error',
        text1: 'Not logged in',
        text2: 'Please login to add items to cart.',
      });
      return;
    }

    const storageKey = `cart_${uid}`;
    const existingCart = await AsyncStorage.getItem(storageKey);
    let cart = existingCart ? JSON.parse(existingCart) : [];

    const index = cart.findIndex(item => item.mealName === meal.mealName);

    if (index !== -1) {
      cart[index].quantity += 1;
    } else {
      cart.push({ ...meal, quantity: 1 });
    }

    await AsyncStorage.setItem(storageKey, JSON.stringify(cart));
    DeviceEventEmitter.emit('cartUpdated'); // 🔁 notify cart sidebar or screen
    navigation.goBack(); // 👈 navigate after notifying
  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Cart Error',
      text2: 'Something went wrong adding to cart.',
    });
  }
};



  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <ScrollView contentContainerStyle={styles.container}>

        {meal ? (
            <View style={styles.content}>
            <Image source={{ uri: meal.image }} style={styles.image} />
            <View style={styles.titleRow}>
                    <Text style={styles.title}>{meal.mealName}</Text>
                    <Text style={styles.price}>₱ {meal.price?.toFixed(2)}</Text>
            </View>


            {meal.calories && (
                <Text style={styles.calories}>Calories: {meal.calories} kcal</Text>
            )}

    <View style={{ width: '100%', marginBottom: 12 }}>
    <Text
        style={styles.description}
        numberOfLines={showFullDescription ? undefined : 3}
        ellipsizeMode="tail"
    >
        {meal.description || 'No description available.'}
    </Text>

    {meal.description && meal.description.length > 100 && (
        <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
        <Text style={styles.readMoreText}>
            {showFullDescription ? 'Read less' : 'Read more'}
        </Text>
        </TouchableOpacity>
    )}
    </View>


            {/* Macros */}
            {(meal.carbs || meal.protein || meal.fat) && (
                <View style={styles.macrosContainer}>
                {meal.carbs && (
                    <View style={styles.macroBox}>
                    <Text style={styles.macroLabel}>Carbs</Text>
                    <Text style={styles.macroValue}>{meal.carbs}g</Text>
                    </View>
                )}
                {meal.protein && (
                    <View style={styles.macroBox}>
                    <Text style={styles.macroLabel}>Protein</Text>
                    <Text style={styles.macroValue}>{meal.protein}g</Text>
                    </View>
                )}
                {meal.fat && (
                    <View style={styles.macroBox}>
                    <Text style={styles.macroLabel}>Fat</Text>
                    <Text style={styles.macroValue}>{meal.fat}g</Text>
                    </View>
                )}
                </View>
            )}

            {/* Good For Tags */}
            {meal.goodFor && meal.goodFor.length > 0 && (
                <View style={styles.goodForContainer}>
                <Text style={styles.goodForLabel}>Good For:</Text>
                <View style={styles.goodForChips}>
                    {meal.goodFor.map((tag, index) => (
                    <View key={index} style={styles.chip}>
                        <Text style={styles.chipText}>{tag}</Text>
                    </View>
                    ))}
                </View>
                </View>
            )}

            <TouchableOpacity
                style={styles.addButton}
                onPress={() => addToCart(meal, navigation)}
                >
                <Text style={styles.addButtonText}>Add to Cart</Text>
                </TouchableOpacity>

            </View>
        ) : (
            <Text style={{ color: '#9ca3af', fontSize: 16 }}>Meal not found.</Text>
        )}
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop:50,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  price: {
    fontSize: 18,
    color: '#10b981',
    marginBottom: 4,
  },
  calories: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 22,
    textAlign: 'center',
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  macroBox: {
    flex: 1,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  goodForContainer: {
    width: '100%',
    marginBottom: 24,
  },
  goodForLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  goodForChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 14,
    color: '#065f46',
  },
  addButton: {
    backgroundColor: '#14532d',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  titleRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  marginBottom: 8,
},
title: {
  fontSize: 24,
  fontWeight: '700',
  color: '#1f2937',
  flex: 1,
},
price: {
  fontSize: 18,
  color: '#10b981',
  marginLeft: 12,
},
readMoreText: {
  color: '#2563eb', // blue
  marginTop: 4,
  fontSize: 14,
  textAlign: 'center',
  fontWeight: '500',
},

});
