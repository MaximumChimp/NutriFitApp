// OrderScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TextInput,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  SafeAreaView,
  DeviceEventEmitter,
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase-config';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import debounce from 'lodash.debounce';
import { useNavigation, useStateForPath } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth'; // <-- IMPORTANT

// layout constants
const SCREEN_WIDTH = Dimensions.get('window').width;
const numColumns = 2;
const cardWidth = (SCREEN_WIDTH - 48) / numColumns;

export default function OrderScreen() {
  // data / filters
  const [meals, setMeals] = useState([]);
  const [filteredMeals, setFilteredMeals] = useState([]);
  const [search, setSearch] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState(null); // Removed TypeScript type
  const [calorieRange, setCalorieRange] = useState([0, 1000]); // JS doesn't use `[number, number]`
  const [filterVisible,setFilterVisible] = useState(false)
  // loading / location
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState(null); // useStateForPath removed
  const [mapVisible, setMapVisible] = useState(false);
  const [tempLocation, setTempLocation] = useState(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const mapRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // cart
  const [cart, setCart] = useState([]);
  const [showCartSidebar, setShowCartSidebar] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // continue your logic...

  const navigation = useNavigation();

  /* ------------------------------------------------------------------
   * CART HELPERS
   * ---------------------------------------------------------------- */

  const getCartStorageKey = () => {
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    return uid ? `cart_${uid}` : null;
  };

  const fetchCart = async () => {
    const storageKey = getCartStorageKey();
    if (!storageKey) {
      setCart([]);
      return;
    }
    try {
      const storedCart = await AsyncStorage.getItem(storageKey);
      setCart(storedCart ? JSON.parse(storedCart) : []);
    } catch (err) {
      console.warn('fetchCart error:', err);
      setCart([]);
    }
  };

  const persistCart = async (updatedCart: any[]) => {
    const storageKey = getCartStorageKey();
    if (!storageKey) return;
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedCart));
    } catch (err) {
      console.warn('persistCart error:', err);
    }
  };

  const updateQuantity = async (index: number, newQty: number) => {
    const updated = [...cart];
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
    }
    setCart(updated);
    await persistCart(updated);
    // optional broadcast if other screens need it:
    DeviceEventEmitter.emit('cartUpdated');
  };

  /* ------------------------------------------------------------------
   * CART SIDEBAR ANIMATION
   * ---------------------------------------------------------------- */

  const openCartSidebar = async () => {
    await fetchCart(); // ensure fresh
    setShowCartSidebar(true);
    Animated.timing(sidebarAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const closeCartSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setShowCartSidebar(false));
  };

  const handleCartPress = () => {
    openCartSidebar();
  };

  /* ------------------------------------------------------------------
   * LISTEN FOR CART CHANGES FROM OTHER SCREENS
   * ---------------------------------------------------------------- */
  useEffect(() => {
    // when OrderScreen regains focus
    const unsubscribeFocus = navigation.addListener('focus', fetchCart);

    // when another screen emits 'cartUpdated'
    const subscription = DeviceEventEmitter.addListener('cartUpdated', fetchCart);

    return () => {
      unsubscribeFocus();
      subscription.remove();
    };
  }, [navigation]);

  /* ------------------------------------------------------------------
   * LOAD MEALS + LOCATION ONCE
   * ---------------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const snapshot = await getDocs(collection(db, 'meals'));
        const fetchedMeals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMeals(fetchedMeals);
        setFilteredMeals(fetchedMeals);
      } catch (e) {
        console.error('Error fetching meals:', e);
      } finally {
        setLoading(false);
      }

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        setTempLocation(loc.coords);
        const [addr] = await Location.reverseGeocodeAsync(loc.coords);
        if (addr) setAddress(formatAddress(addr));
      } catch (e) {
        console.warn('Location error:', e);
      }
    })();
  }, []);

  /* ------------------------------------------------------------------
   * FILTER MEALS
   * ---------------------------------------------------------------- */
  const formatAddress = (addr: any) =>
    `${addr.name || ''} ${addr.street || ''}, ${addr.district || ''}, ${addr.subregion || ''}, ${
      addr.city || ''
    }, ${addr.region || ''}, ${addr.postalCode || ''}`.trim();

  const handleSearch = (text: string) => {
    setSearch(text);
    const lowerText = text.toLowerCase();

    const filtered = meals.filter(m => {
      const matchSearch = m.mealName?.toLowerCase().includes(lowerText);
      const matchType = mealTypeFilter ? m.category === mealTypeFilter : true;
      const matchCalories =
        typeof m.calories === 'number'
          ? m.calories >= calorieRange[0] && m.calories <= calorieRange[1]
          : true;

      return matchSearch && matchType && matchCalories;
    });

    setFilteredMeals(filtered);
  };

  useEffect(() => {
    handleSearch(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealTypeFilter, calorieRange]);

  /* ------------------------------------------------------------------
   * NOMINATIM LOCATION SUGGESTIONS
   * ---------------------------------------------------------------- */
  const fetchSuggestions = debounce(async query => {
    if (!query) return setSuggestions([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
        {
          headers: {
            'User-Agent': 'NutriFit/1.0 (arvincabrera37@gmail.com)',
            Accept: 'application/json',
          },
        }
      );
      const data = await res.json();
      setSuggestions(data);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } catch (e) {
      console.error('Nominatim error:', e);
    }
  }, 400);

  const confirmLocation = async () => {
    if (!tempLocation) return;
    setLocation(tempLocation);
    const [addr] = await Location.reverseGeocodeAsync(tempLocation);
    if (addr) setAddress(formatAddress(addr));
    setMapVisible(false);
  };

  /* ------------------------------------------------------------------
   * RENDER MEAL CARD
   * ---------------------------------------------------------------- */
  const renderMeal = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('MealDetail', { meal: item })}
    >
      <Image source={{ uri: item.image }} style={styles.image} />
      <Text style={styles.name}>{item.mealName || 'Unnamed Meal'}</Text>
      <Text style={styles.price}>₱ {item.price?.toFixed(2) || '0.00'}</Text>
    </TouchableOpacity>
  );

  /* ------------------------------------------------------------------
   * TOTALS
   * ---------------------------------------------------------------- */
  const cartItemCount = cart.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const cartTotal = cart.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 0)), 0);

  /* ------------------------------------------------------------------
   * JSX
   * ---------------------------------------------------------------- */
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Order Food</Text>
        <TouchableOpacity onPress={handleCartPress}>
          <View>
            <Ionicons name="cart-outline" size={28} color="#14532d" />
            {cartItemCount > 0 && <View style={styles.cartBadge} />}
          </View>
        </TouchableOpacity>
      </View>

      {/* Current Address */}
      {!!address && (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('SelectLocation', {
              onLocationSelected: (selectedLocation: any, selectedAddress: string) => {
                setLocation(selectedLocation);
                setAddress(selectedAddress);
              },
            })
          }
          style={styles.locationContainer}
        >
          <Ionicons name="location-outline" size={18} color="#14532d" />
          <Text style={styles.locationText}>{address}</Text>
        </TouchableOpacity>
      )}

      {/* Search + Filter */}
      <View style={{ marginBottom: 12 }}>
        <TextInput
          style={[styles.searchBar, { width: '100%' }]}
          placeholder="Search meals..."
          value={search}
          onChangeText={handleSearch}
          placeholderTextColor="#6b7280"
        />
        <TouchableOpacity
          style={{
            marginTop: 8,
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-end',
          }}
          onPress={() => setFilterVisible(true)}
        >
          <Ionicons name="filter-outline" size={20} color="#14532d" />
          <Text style={{ marginLeft: 6, color: '#14532d' }}>Filter by</Text>
        </TouchableOpacity>
      </View>

      {/* Meal Grid */}
      {loading ? (
        <ActivityIndicator color="#14532d" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredMeals}
          renderItem={renderMeal}
          keyExtractor={item => item.id}
          numColumns={numColumns}
          contentContainerStyle={styles.list}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 10 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Map Modal */}
      <Modal visible={mapVisible} animationType="slide">
        <View style={styles.fullscreenModal}>
          <View style={styles.searchContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="search-outline"
                size={18}
                color="#6b7280"
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Search address..."
                value={locationQuery}
                onChangeText={text => {
                  setLocationQuery(text);
                  fetchSuggestions(text);
                }}
                style={styles.locationInput}
                placeholderTextColor="#6b7280"
              />
            </View>

            {suggestions.length > 0 && (
              <Animated.View
                style={{ opacity: fadeAnim, backgroundColor: '#fff', paddingVertical: 4 }}
              >
                <ScrollView style={{ maxHeight: 200 }}>
                  {suggestions.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        const coords = {
                          latitude: parseFloat(item.lat),
                          longitude: parseFloat(item.lon),
                        };
                        setTempLocation(coords);
                        setLocationQuery(item.display_name);
                        setSuggestions([]);
                        mapRef.current?.animateToRegion(
                          { ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 },
                          1000
                        );
                      }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderBottomColor: '#e5e7eb',
                        borderBottomWidth: 1,
                      }}
                    >
                      <Text style={{ color: '#111827' }}>{item.display_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            )}

            <TouchableOpacity
              style={styles.pinMyLocation}
              onPress={async () => {
                const loc = await Location.getCurrentPositionAsync({});
                const coords = loc.coords;
                setTempLocation(coords);
                setLocationQuery('');
                setSuggestions([]);
                mapRef.current?.animateToRegion(
                  { ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 },
                  1000
                );
              }}
            >
              <Ionicons name="locate-outline" size={18} color="#10b981" />
              <Text style={styles.pinText}>Pin My Location</Text>
            </TouchableOpacity>
          </View>

          {tempLocation && (
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              region={{
                latitude: tempLocation.latitude,
                longitude: tempLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={e => setTempLocation(e.nativeEvent.coordinate)}
            >
              <Marker
                draggable
                coordinate={tempLocation}
                onDragEnd={e => setTempLocation(e.nativeEvent.coordinate)}
              />
            </MapView>
          )}

          <View style={styles.confirmContainer}>
            <Pressable onPress={confirmLocation} style={styles.confirmButton}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                Confirm Location
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={filterVisible} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: '#00000066',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#fff',
              padding: 20,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Filters</Text>

            <Text style={{ marginBottom: 6 }}>Meal Type</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {['Breakfast', 'Lunch', 'Dinner'].map(type => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setMealTypeFilter(prev => (prev === type ? null : type))}
                  style={{
                    backgroundColor: mealTypeFilter === type ? '#14532d' : '#f3f4f6',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ color: mealTypeFilter === type ? '#fff' : '#374151' }}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ marginBottom: 6 }}>Calories</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {[[0, 500], [500, 800], [800, 5000]].map(([min, max]) => {
                const isActive = calorieRange[0] === min && calorieRange[1] === max;
                return (
                  <TouchableOpacity
                    key={min}
                    onPress={() => setCalorieRange([min, max])}

                    style={{
                      backgroundColor: isActive ? '#14532d' : '#f3f4f6',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ color: isActive ? '#fff' : '#374151' }}>
                      {min}–{max}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Text style={{ color: '#6b7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  handleSearch(search);
                  setFilterVisible(false);
                }}
              >
                <Text style={{ color: '#14532d', fontWeight: 'bold' }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CART SIDEBAR */}
      {showCartSidebar && (
        <View style={StyleSheet.absoluteFill}>
          {/* Overlay */}
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
            onPress={closeCartSidebar}
            activeOpacity={1}
          />

          {/* Sidebar */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: SCREEN_WIDTH * 0.85,
              backgroundColor: '#fff',
              padding: 16,
              paddingTop: 50,
              shadowColor: '#000',
              shadowOffset: { width: -2, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 10,
              transform: [{ translateX: sidebarAnim }],
            }}
          >
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarTitleContainer}>
                <Ionicons name="cart-outline" size={24} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.sidebarTitle}>Cart</Text>
              </View>
              <TouchableOpacity onPress={closeCartSidebar}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {cart.length === 0 ? (
              <Text style={styles.emptyCartText}>Your cart is empty.</Text>
            ) : (
              <ScrollView style={{ flex: 1 }}>
                {cart.map((item, index) => (
                  <View key={index} style={styles.cartItemRow}>
                    <Image source={{ uri: item.image }} style={styles.cartImage} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.cartTitle}>{item.mealName}</Text>
                      <Text style={styles.cartPrice}>₱ {item.price?.toFixed(2)}</Text>

                      <View style={styles.quantityRow}>
                        <TouchableOpacity
                          onPress={() => updateQuantity(index, (item.quantity || 0) - 1)}
                          style={styles.quantityButton}
                        >
                          <Text style={styles.quantityText}>−</Text>
                        </TouchableOpacity>

                        <Text style={styles.quantityValue}>{item.quantity || 0}</Text>

                        <TouchableOpacity
                          onPress={() => updateQuantity(index, (item.quantity || 0) + 1)}
                          style={styles.quantityButton}
                        >
                          <Text style={styles.quantityText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Cart Summary */}
            {cart.length > 0 && (
              <View style={styles.cartSummary}>
                <Text style={styles.cartSummaryText}>
                  Items: {cartItemCount} • Total: ₱ {cartTotal.toFixed(2)}
                </Text>
                <TouchableOpacity style={styles.checkoutBtn} onPress={() => console.log('Checkout')}>
                  <Text style={styles.checkoutBtnText}>Checkout</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------
 * STYLES
 * ---------------------------------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 50, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', color: '#14532d' },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  locationText: { fontSize: 14, marginLeft: 6, color: '#374151' },
  searchBar: { backgroundColor: '#e5e7eb', borderRadius: 12, padding: 10, marginBottom: 16, fontSize: 16, color: '#111827' },
  list: { paddingBottom: 100 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 0,
    margin: 7,
    width: cardWidth,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  image: { width: '100%', height: 100, borderRadius: 10, marginBottom: 8, resizeMode: 'cover' },
  name: { fontSize: 16, fontWeight: '600', color: '#1f2937', textAlign: 'center' },
  price: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  fullscreenModal: { flex: 1, backgroundColor: '#fff' },
  searchContainer: { padding: 12, backgroundColor: '#fff', gap: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 10, height: 44 },
  inputIcon: { marginRight: 8 },
  locationInput: { flex: 1, fontSize: 16, color: '#111827' },
  pinMyLocation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#ecfdf5', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#10b981' },
  pinText: { color: '#065f46', fontWeight: '600', fontSize: 14 },
  confirmContainer: { backgroundColor: '#fff', padding: 12 },
  confirmButton: { backgroundColor: '#22c55e', padding: 16, alignItems: 'center', borderRadius: 15 },

  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
  },

  /* Sidebar header reused in animated panel */
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sidebarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  emptyCartText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#6b7280',
  },

  cartItemRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cartImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  cartTitle: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  cartPrice: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  quantityValue: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: '600',
  },

  cartSummary: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 12,
  },
  cartSummaryText: {
    fontSize: 16,
    marginBottom: 12,
    color: '#1f2937',
    fontWeight: '600',
  },
  checkoutBtn: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
