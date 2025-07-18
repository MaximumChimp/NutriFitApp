// SelectLocationScreen.jsx
import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import debounce from 'lodash.debounce';

export default function SelectLocationScreen() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [coords, setCoords] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);
  const navigation = useNavigation();
  const route = useRoute();

  const fetchSuggestions = debounce(async (text) => {
    if (!text) return setSuggestions([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}`,
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
  }, 500);

  const pinMyLocation = async () => {
    const loc = await Location.getCurrentPositionAsync({});
    setCoords(loc.coords);
    mapRef.current?.animateToRegion({
      ...loc.coords,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000);
  };

const confirm = async () => {
  if (!coords) return;

  try {
    const [addr] = await Location.reverseGeocodeAsync(coords);

    const parts = [
      addr.name,
      addr.street,
      addr.subregion,
      addr.city || addr.district,
      addr.region,
      addr.postalCode,
      addr.country,
    ];

    const formatted = parts.filter(Boolean).join(', ');

    const callback = route.params?.onLocationSelected;
    if (callback) {
      callback(coords, formatted);
    }

    navigation.goBack();
  } catch (error) {
    console.warn('Failed to reverse geocode location:', error);
  }
};


  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingHorizontal: 0, paddingBottom: 20 }}>
      <View style={styles.searchContainer}>
        <View style={styles.inputWrapper}>
          <Ionicons name="search-outline" size={18} color="#6b7280" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search address..."
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              fetchSuggestions(text);
            }}
            placeholderTextColor="#6b7280"
            style={{ flex: 1, fontSize: 16, color: '#111827' }}
          />
        </View>

        {suggestions.length > 0 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <ScrollView style={{ maxHeight: 180 }}>
              {suggestions.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    const selected = {
                      latitude: parseFloat(item.lat),
                      longitude: parseFloat(item.lon),
                    };
                    setCoords(selected);
                    setQuery(item.display_name);
                    setSuggestions([]);

                    mapRef.current?.animateToRegion({
                      ...selected,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }, 1000);
                  }}
                  style={{
                    padding: 12,
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

        <TouchableOpacity onPress={pinMyLocation} style={styles.pinMyLocation}>
          <Ionicons name="locate-outline" size={18} color="#10b981" />
          <Text style={styles.pinText}>Pin My Location</Text>
        </TouchableOpacity>
      </View>

     <MapView
  ref={mapRef}
  style={{ flex: 1 }}
  region={{
    latitude: coords?.latitude || 14.5995, // Manila fallback
    longitude: coords?.longitude || 120.9842,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }}
  onPress={(e) => setCoords(e.nativeEvent.coordinate)}
>
  {coords && (
    <Marker
      draggable
      coordinate={coords}
      onDragEnd={(e) => setCoords(e.nativeEvent.coordinate)}
    />
  )}
</MapView>
        <View style={{ paddingHorizontal: 15, marginTop: 10 }}>
        <TouchableOpacity style={styles.confirmButton} onPress={confirm}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Confirm Location</Text>
        </TouchableOpacity>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    padding:15,
    paddingTop: 50,
    
    backgroundColor: '#fff',
    gap: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
  },
  pinMyLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  pinText: {
    color: '#065f46',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: '#22c55e',
    padding: 16,
    paddingHorizontal:15,
    alignItems: 'center',
    borderRadius: 15,
  },
});
