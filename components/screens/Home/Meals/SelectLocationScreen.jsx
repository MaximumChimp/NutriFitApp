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
import MapboxGL from "@rnmapbox/maps";
import { Ionicons } from "@expo/vector-icons";
import debounce from "lodash.debounce";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Location from "expo-location";

MapboxGL.setAccessToken(
  "pk.eyJ1IjoibWF4bWNoaW1wIiwiYSI6ImNtZWV2YjY5NzBtMWgybW9lMTNtN3N6ZDQifQ.n-kUUFFBb5c-cCIKMdHgCw"
);

const SelectLocationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const mapRef = useRef(null);
  const cameraRef = useRef(null);

  const [coords, setCoords] = useState(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access location was denied.");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const newCoords = [loc.coords.longitude, loc.coords.latitude];
      setCoords(newCoords);
      const address = await reverseGeocode({
        longitude: loc.coords.longitude,
        latitude: loc.coords.latitude,
      });
      setQuery(address);

      // Only move camera if map is ready
      if (mapReady && cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: newCoords,
          zoomLevel: 18,
          animationDuration: 500,
        });
      }
      animatePin();
    } catch (err) {
      console.log("Error getting location:", err);
      alert("Failed to get location.");
    }
    setLoading(false);
  };

  const reverseGeocode = async ({ latitude, longitude }) => {
    try {
      setSearchLoading(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: { "User-Agent": "NutriFit/1.0 (arvincabrera37@gmail.com)" },
        }
      );
      const data = await res.json();
      return data.display_name || "";
    } catch (err) {
      console.warn("Reverse geocode failed:", err);
      return "";
    } finally {
      setSearchLoading(false);
    }
  };

  const search = debounce(async (text) => {
    if (!text) return setSuggestions([]);
    try {
      setSearchLoading(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          text
        )}&format=json&addressdetails=1&limit=5&countrycodes=ph`,
        {
          headers: { "User-Agent": "NutriFit/1.0 (arvincabrera37@gmail.com)" },
        }
      );
      const data = await res.json();
      setSuggestions(data || []);
    } catch (err) {
      console.error("Nominatim search error:", err);
    } finally {
      setSearchLoading(false);
    }
  }, 300);

  const confirm = () => {
    if (!coords) return;

    const selectedCoords = { latitude: coords[1], longitude: coords[0] };
    const formattedAddress = query;

    DeviceEventEmitter.emit("locationSelected", {
      coords: selectedCoords,
      address: formattedAddress,
    });

    const callback = route.params?.onLocationSelected;
    if (callback) callback(selectedCoords, formattedAddress);

    navigation.goBack();
  };

  useEffect(() => {
    pinMyLocation();
  }, [mapReady]);

  return (
    <View style={{ flex: 1 }}>
      {/* Map */}
      <MapboxGL.MapView
        ref={mapRef}
        style={{ flex: 1 }}
        styleURL={MapboxGL.StyleURL.Street}
        onDidFinishRenderingMapFully={() => setMapReady(true)}
        onMapIdle={() => setMapReady(true)}
        onPress={async (e) => {
          const [lon, lat] = e.geometry.coordinates;
          const newCoords = [lon, lat];
          setCoords(newCoords);
          const address = await reverseGeocode({ longitude: lon, latitude: lat });
          setQuery(address);

          if (mapReady && cameraRef.current) {
            cameraRef.current.setCamera({
              centerCoordinate: newCoords,
              zoomLevel: 18,
              animationDuration: 500,
            });
          }
          animatePin();
        }}
      >
        {coords && (
          <>
            <MapboxGL.Camera
              ref={cameraRef}
              zoomLevel={18}
              centerCoordinate={coords}
              animationMode="flyTo"
              animationDuration={500}
            />

            <MapboxGL.PointAnnotation
              id="marker"
              coordinate={coords}
              draggable
              onDragEnd={async (e) => {
                const [lon, lat] = e.geometry.coordinates;
                const newCoords = [lon, lat];
                setCoords(newCoords);
                const address = await reverseGeocode({ longitude: lon, latitude: lat });
                setQuery(address);
                animatePin();
              }}
            >
              <Animated.View
                style={{
                  transform: [
                    { scale: pinAnim.interpolate({ inputRange: [0, 1], outputRange: [1.5, 1] }) },
                    { translateY: pinAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
                  ],
                }}
              >
                <Ionicons name="location-sharp" size={38} color="#10b981" />
              </Animated.View>
            </MapboxGL.PointAnnotation>
          </>
        )}
      </MapboxGL.MapView>

      {/* Map loading spinner */}
      {!mapReady && (
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

      {/* Search input */}
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
            onChangeText={(text) => {
              setQuery(text);
              if (text.length > 0) search(text);
              else setSuggestions([]);
            }}
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

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <ScrollView
            style={{ maxHeight: 200, backgroundColor: "white", borderRadius: 10 }}
            keyboardShouldPersistTaps="handled"
          >
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  const lon = parseFloat(item.lon);
                  const lat = parseFloat(item.lat);
                  const newCoords = [lon, lat];
                  setCoords(newCoords);
                  setQuery(item.display_name);
                  setSuggestions([]);
                  animatePin();

                  if (mapReady && cameraRef.current) {
                    cameraRef.current.setCamera({
                      centerCoordinate: newCoords,
                      zoomLevel: 18,
                      animationDuration: 500,
                    });
                  }
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

      {/* Pin my location */}
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
        {loading ? <ActivityIndicator color="#10b981" /> : <Ionicons name="locate" size={24} color="#10b981" />}
      </TouchableOpacity>

      {/* Confirm button */}
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
        <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>Confirm Location</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SelectLocationScreen;
