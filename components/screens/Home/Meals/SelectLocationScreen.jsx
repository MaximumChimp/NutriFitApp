import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  PermissionsAndroid,
  Platform,
  Animated,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  Keyboard,
} from "react-native";
import Mapbox from "@rnmapbox/maps";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
Mapbox.setAccessToken(
  "pk.eyJ1IjoibWF4aW11bWNoaW1wIiwiYSI6ImNtZWdxZHMyczE0d3Eya3NnMGdxMzZjNnEifQ.U7gxagxTZmIk85_fxYASWg"
);

const SelectionLocationScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { coords } = route.params || {};
  const [userLocation, setUserLocation] = useState(coords || null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const debounceRef = useRef(null);

  const bounceAnim = useRef(new Animated.Value(1)).current;

  // Reverse geocode helper
  const fetchAddressFromCoords = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { "User-Agent": "NutriFitApp/1.0" } }
      );
      const data = await response.json();

      // Fallback logic for barangay/purok/subdivision
      const barangay =
        data.address?.village ||
        data.address?.suburb ||
        data.address?.neighbourhood ||
        data.address?.locality ||
        "";
      const purok =
        data.address?.neighbourhood || data.address?.suburb || data.address?.locality || "";

      const structured = {
        displayName: data.display_name || "Unknown location",
        houseNumber: data.address?.house_number || "",
        road: data.address?.road || data.address?.residential || "",
        purok,
        barangay,
        city:
          data.address?.city ||
          data.address?.town ||
          data.address?.municipality ||
          "",
        province: data.address?.state || "",
        country: data.address?.country || "",
      };

      return structured;
    } catch (err) {
      console.error("Reverse geocoding error:", err);
      return {
        displayName: "Unknown location",
        houseNumber: "",
        road: "",
        purok: "",
        barangay: "",
        city: "",
        province: "",
        country: "",
      };
    }
  };

  useEffect(() => {
    (async () => {
      if (Platform.OS === "android") {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Permission to access location was denied");
      }
    })();

    const keyboardListener = Keyboard.addListener("keyboardDidHide", () => {
      setResults([]);
    });

    return () => {
      keyboardListener.remove();
    };
  }, []);

  const triggerBounce = () => {
    Animated.sequence([
      Animated.spring(bounceAnim, { toValue: 1.3, friction: 3, useNativeDriver: true }),
      Animated.spring(bounceAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (userLocation) triggerBounce();
  }, [userLocation]);

  const handleSearchChange = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length < 3) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            text
          )}&addressdetails=1&limit=5&countrycodes=ph`,
          { headers: { "User-Agent": "NutriFitApp/1.0" } }
        );
        const data = await response.json();
        setResults(data);
      } catch (err) {
        console.error("Search error:", err);
      }
      setLoading(false);
    }, 500);
  };

  const handleSelectResult = async (item) => {
    const coords = { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) };
    setUserLocation(coords);
    setResults([]);
    setQuery(item.display_name);
    triggerBounce();
    Keyboard.dismiss();

    const addr = await fetchAddressFromCoords(coords.latitude, coords.longitude);
    setSelectedAddress(addr);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.page}>
      {/* Search Bar with Clear Button */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#555" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search location..."
          value={query}
          onChangeText={handleSearchChange}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Results Dropdown */}
      {results.length > 0 && (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={results}
          keyExtractor={(item, index) => index.toString()}
          style={styles.resultsList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => handleSelectResult(item)}
            >
              <Text style={styles.resultText}>{item.display_name}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Map */}
      <Mapbox.MapView
        styleURL={Mapbox.StyleURL.Street}
        style={styles.map}
        compassEnabled
        zoomEnabled
        defaultSettings={{
          centerCoordinate: coords
            ? [coords.longitude, coords.latitude]
            : [120.9842, 14.5995],
          zoomLevel: 17,
        }}
        onPress={async (e) => {
          const [longitude, latitude] = e.geometry.coordinates;
          setUserLocation({ longitude, latitude });
          setResults([]);
          triggerBounce();
          Keyboard.dismiss();

          const addr = await fetchAddressFromCoords(latitude, longitude);
          setQuery(addr.displayName);
          setSelectedAddress(addr);
        }}
      >
        {userLocation && (
          <Mapbox.Camera
            zoomLevel={17}
            centerCoordinate={[userLocation.longitude, userLocation.latitude]}
            animationMode="flyTo"
            animationDuration={500}
          />
        )}

        {userLocation && (
          <Mapbox.PointAnnotation
            id="selected-location"
            coordinate={[userLocation.longitude, userLocation.latitude]}
            draggable
            onDragEnd={async (e) => {
              const [longitude, latitude] = e.geometry.coordinates;
              setUserLocation({ longitude, latitude });
              triggerBounce();

              const addr = await fetchAddressFromCoords(latitude, longitude);
              setQuery(addr.displayName);
              setSelectedAddress(addr);
            }}
          >
            <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
              <Ionicons name="location-sharp" size={40} color="#14532d" />
            </Animated.View>
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>

{/* Floating Buttons */}
<View style={styles.floatingContainer}>
  <View style={styles.confirmWrapper}>
    {/* Confirm Button */}

<TouchableOpacity
  style={styles.confirmBtn}
  onPress={async () => {
    if (userLocation && selectedAddress) {
      try {
        // Save to AsyncStorage
        await AsyncStorage.setItem("userCoords", JSON.stringify(userLocation));
        await AsyncStorage.setItem("userAddress", selectedAddress.displayName);

        // Navigate back to MainTabs -> Order
        navigation.navigate("MainTabs", {
          screen: "Order",
          params: {
            coords: userLocation,
            address: selectedAddress.displayName,
          },
        });
      } catch (err) {
        console.error("Error saving address:", err);
      }
    }
  }}
>
  <Text style={styles.confirmText}>Confirm</Text>
</TouchableOpacity>


    {/* Current Location Button */}
    <TouchableOpacity
      style={styles.fabRight}
      onPress={async () => {
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const { latitude, longitude } = pos.coords;
          setUserLocation({ latitude, longitude });
          triggerBounce();

          const addr = await fetchAddressFromCoords(latitude, longitude);
          setQuery(addr.displayName);
          setSelectedAddress(addr);
        } catch (err) {
          console.error("GPS error:", err);
        }
      }}
    >
      <Ionicons name="locate" size={22} color="#fff" />
    </TouchableOpacity>
  </View>
</View>




    </View>
  );
};

export default SelectionLocationScreen;

const styles = StyleSheet.create({
  page: { flex: 1 },
  map: { flex: 1 },
  searchContainer: {
    position: "absolute",
    top: 50,
    left: 15,
    right: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#333" },
  resultsList: {
    position: "absolute",
    top: 95,
    left: 15,
    right: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 10,
    elevation: 3,
  },
  resultItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  resultText: { fontSize: 14, color: "#333" },
floatingContainer: {
  position: "absolute",
  bottom: 40,
  left: 20,
  right: 20,
  alignItems: "center",
},

confirmWrapper: {
  width: "100%",
  position: "relative", 
},

confirmBtn: {
  width: "100%",
  backgroundColor: "#22c55e",
  paddingVertical: 14,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 5,
},

confirmText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "bold",
},

fabRight: {
  position: "absolute",
  bottom: 100, // above the confirm button
  right: 10, // right corner
  backgroundColor: "#14532d",
  padding: 12,
  borderRadius: 30,
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 5,
},

});
