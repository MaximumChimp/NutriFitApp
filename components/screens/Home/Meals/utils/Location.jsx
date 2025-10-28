// utils/location.js
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";

const CACHE_EXPIRY_MINUTES = 10;

export async function clearCachedLocation() {
  await AsyncStorage.multiRemove([
    "userCoords",
    "userAddress",
    "userLocationTimestamp",
  ]);
  console.log("[Location] Cache cleared");
}

export async function getUserLocation(forceRefresh = false) {
  try {

    // 1. Try cache
    if (!forceRefresh) {
      const savedCoords = await AsyncStorage.getItem("userCoords");
      const savedAddress = await AsyncStorage.getItem("userAddress");
      const savedTimestamp = await AsyncStorage.getItem("userLocationTimestamp");

      if (savedCoords && savedAddress && savedTimestamp) {
        const ageMinutes =
          (Date.now() - parseInt(savedTimestamp, 10)) / (1000 * 60);

        if (ageMinutes < CACHE_EXPIRY_MINUTES && savedAddress !== "Unknown location") {
          console.log(
            `[Location] Using cached location (age ${ageMinutes.toFixed(1)} min):`,
            savedCoords,
            savedAddress
          );
          return {
            coords: JSON.parse(savedCoords),
            address: savedAddress,
          };
        }
      }
    }

    let latitude, longitude;

    // 2. GPS
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
        console.log("[Location] GPS coords:", latitude, longitude);
      } else {
        throw new Error("Permission denied");
      }
    } catch (gpsErr) {
      console.warn("[Location] GPS unavailable:", gpsErr);

      // 3. Fallback: IP geolocation
      try {
        const ipResponse = await fetch("https://ipapi.co/json/");
        const ipData = await ipResponse.json();

        if (ipData?.latitude && ipData?.longitude) {
          latitude = ipData.latitude;
          longitude = ipData.longitude;
          console.log("[Location] IP-based coords:", latitude, longitude);
        }
      } catch (ipErr) {
        console.warn("[Location] IP geolocation failed:", ipErr);
      }
    }

    // if still no coords, return null
    if (!latitude || !longitude) {
      return null;
    }

    // 4. Reverse geocode
    let displayName = "Unknown location";
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
        {
          headers: {
            "User-Agent": "NutriFitApp/1.0 (arvincabrera37@gmail.com)",
            "Accept-Language": "en",
          },
        }
      );
      const data = await response.json();
      if (data?.display_name) displayName = data.display_name;
    } catch (err) {
      console.error("[Location] Nominatim failed:", err);
    }

    if (displayName === "Unknown location") {
      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode?.length > 0) {
          displayName = `${geocode[0].city || geocode[0].region}, ${geocode[0].country}`;
        }
      } catch (expoErr) {
        console.warn("[Location] Expo reverse geocode failed:", expoErr);
      }
    }

    const result = { coords: { latitude, longitude }, address: displayName };

    if (displayName !== "Unknown location") {
      await AsyncStorage.setItem("userCoords", JSON.stringify(result.coords));
      await AsyncStorage.setItem("userAddress", result.address);
      await AsyncStorage.setItem("userLocationTimestamp", Date.now().toString());
      console.log("[Location] Saved to AsyncStorage:", result);
    }

    return result;
  } catch (err) {
    console.error("[Location] Fatal error:", err);
    return null;
  }
}
