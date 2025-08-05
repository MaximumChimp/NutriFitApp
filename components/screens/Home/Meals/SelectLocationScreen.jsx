import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  DeviceEventEmitter,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import debounce from "lodash.debounce";
import { useNavigation, useRoute } from "@react-navigation/native";

const SelectLocationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const mapRef = useRef(null);
  const [coords, setCoords] = useState(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const pinAnim = useRef(new Animated.Value(0)).current;

  const animatePin = () => {
    pinAnim.setValue(0);
    Animated.spring(pinAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 80,
    }).start();
  };

  const pinMyLocation = async () => {
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setCoords(loc.coords);
      animatePin();
      mapRef.current?.animateToRegion(
        {
          ...loc.coords,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
      await reverseGeocode(loc.coords); // Update address input
    } catch (err) {
      alert("Failed to get location.");
    }
    setLoading(false);
  };

  const reverseGeocode = async (location) => {
    try {
      setSearchLoading(true);
      const [addr] = await Location.reverseGeocodeAsync(location);
      const parts = [
        addr.name,
        addr.street,
        addr.subregion,
        addr.city || addr.district,
        addr.region,
        addr.postalCode,
        addr.country,
      ];
      const formattedAddress = parts.filter(Boolean).join(", ");
      setQuery(formattedAddress);
    } catch (error) {
      console.warn("Reverse geocode failed:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const search = debounce(async (text) => {
    if (!text) return setSuggestions([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          text
        )}&countrycodes=ph&format=json`,
        {
          headers: {
            "User-Agent": "ReactNativeMealApp/1.0 (arvincabrera37@gmail.com)",
          },
        }
      );
      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      console.error("Search error:", err);
    }
  }, 500);

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
      const formattedAddress = parts.filter(Boolean).join(", ");
      const selectedCoords = coords;

      DeviceEventEmitter.emit("locationSelected", {
        coords: selectedCoords,
        address: formattedAddress,
      });

      const callback = route.params?.onLocationSelected;
      if (callback) {
        callback(selectedCoords, formattedAddress);
      }

      navigation.goBack();
    } catch (error) {
      console.warn("Failed to reverse geocode:", error);
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access location was denied.");
        return;
      }
      pinMyLocation();
    })();
  }, []);

  useEffect(() => {
    search(query);
  }, [query]);

  return (
    <View style={{ flex: 1 }}>
      {/* Map View */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        region={{
          latitude: coords?.latitude || 14.5995,
          longitude: coords?.longitude || 120.9842,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={(e) => {
          const loc = e.nativeEvent.coordinate;
          setCoords(loc);
          animatePin();
          reverseGeocode(loc);
        }}
        onRegionChange={() => setMapLoading(true)}
        onRegionChangeComplete={() => setMapLoading(false)}
      >
        {coords && (
          <Marker
            coordinate={coords}
            draggable
            onDragEnd={(e) => {
              const loc = e.nativeEvent.coordinate;
              setCoords(loc);
              reverseGeocode(loc);
            }}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    scale: pinAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.5, 1],
                    }),
                  },
                  {
                    translateY: pinAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              }}
            >
              <Ionicons name="location-sharp" size={38} color="#10b981" />
            </Animated.View>
          </Marker>
        )}
      </MapView>

      {/* Map Loading Spinner */}
      {mapLoading && (
        <View
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            marginLeft: -15,
            marginTop: -15,
            zIndex: 10,
          }}
        >
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      )}

      {/* Search Input & Suggestions */}
      <View style={{ position: "absolute", top: 40, left: 0, right: 0, paddingHorizontal: 10 }}>
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 10,
            marginBottom: 5,
          }}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search location..."
            style={{ flex: 1, paddingVertical: 12, fontSize: 16 }}
          />
          {searchLoading ? (
            <ActivityIndicator size="small" color="#10b981" />
          ) : query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        {suggestions.length > 0 && (
          <ScrollView
            style={{ maxHeight: 200, backgroundColor: "white", borderRadius: 10 }}
            keyboardShouldPersistTaps="handled"
          >
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  const selected = {
                    latitude: parseFloat(item.lat),
                    longitude: parseFloat(item.lon),
                  };
                  setCoords(selected);
                  animatePin();
                  setQuery(item.display_name);
                  setSuggestions([]);
                  mapRef.current?.animateToRegion(
                    {
                      ...selected,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    },
                    1000
                  );
                }}
                style={{
                  padding: 10,
                  borderBottomWidth: 1,
                  borderColor: "#eee",
                }}
              >
                <Text>{item.display_name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Pin My Location Button */}
      <TouchableOpacity
        onPress={pinMyLocation}
        style={{
          position: "absolute",
          bottom: 100,
          right: 20,
          backgroundColor: "white",
          padding: 12,
          borderRadius: 50,
          elevation: 5,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#10b981" />
        ) : (
          <Ionicons name="locate" size={24} color="#10b981" />
        )}
      </TouchableOpacity>

      {/* Confirm Button */}
      <TouchableOpacity
        onPress={confirm}
        style={{
          position: "absolute",
          bottom: 30,
          left: 20,
          right: 20,
          backgroundColor: "#10b981",
          padding: 15,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
          Confirm Location
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default SelectLocationScreen;
