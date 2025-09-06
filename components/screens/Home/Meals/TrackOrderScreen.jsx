// TrackOrderScreen.js
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Alert,
  BackHandler
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation,useFocusEffect} from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  where,
  doc,
} from "firebase/firestore";
import Mapbox from "@rnmapbox/maps";
import mbxDirections from "@mapbox/mapbox-sdk/services/directions";

Mapbox.setAccessToken(
  "pk.eyJ1IjoibWF4aW11bWNoaW1wIiwiYSI6ImNtZWdxZHMyczE0d3Eya3NnMGdxMzZjNnEifQ.U7gxagxTZmIk85_fxYASWg"
);

const directionsClient = mbxDirections({
  accessToken:
    "pk.eyJ1IjoibWF4aW11bWNoaW1wIiwiYSI6ImNtZWdxZHMyczE0d3Eya3NnMGdxMzZjNnEifQ.U7gxagxTZmIk85_fxYASWg",
});

const SCREEN_WIDTH = Dimensions.get("window").width - 40;


// --- StatusProgress Component ---
const StatusProgress = ({ status }) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH);

  const steps = ["pending", "preparing", "ontheway", "delivered"];
  const stepLabels = {
    pending: "Pending",
    preparing: "Preparing",
    ontheway: "On the way",
    delivered: "Delivered",
  };

  const getStepIndex = (status) => {
    if (!status) return 0;
    const s = status.toLowerCase().replace(/\s/g, "");
    if (s === "pending" || s === "received") return 0;
    if (s === "preparing" || s === "outfordelivery" ) return 1;
    if (s === "ontheway") return 2;
    if (s === "done") return 3;
    return 0;
  };

  useEffect(() => {
    let stepIndex = getStepIndex(status);
    const s = status?.toLowerCase().replace(/\s/g, "");

    // Partial fill for pending/received
    if (s === "pending" || s === "received") {
      stepIndex = 0.2;
    }

    const progress = stepIndex / (steps.length - 1);

    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [status]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, containerWidth || 0],
  });

  return (
    <View
      style={{ marginTop: 12 }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Text style={styles.sectionTitle}>🚚 Status</Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground} />
        <Animated.View
          style={[styles.progressBarForeground, { width: progressWidth }]}
        />
      </View>

      <View style={styles.stepLabelsContainer}>
        {steps.map((step, i) => {
          const stepIndex = getStepIndex(status);
          const isActive = i <= stepIndex;
          return (
            <Text
              key={i}
              style={[
                styles.stepLabelText,
                {
                  color: isActive ? "#14532d" : "#6b7280",
                  fontWeight: isActive ? "700" : "400",
                },
              ]}
            >
              {stepLabels[step]}
            </Text>
          );
        })}
      </View>
    </View>
  );
};

// --- Single Order Card ---
const OrderCard = ({ order, userLocation, loading }) => {
  const randomRiderLocation = (lng, lat, minDistance = 20) => {
    const radiusInDeg = minDistance / 111320;
    const angle = Math.random() * 2 * Math.PI;
    const newLat = lat + radiusInDeg * Math.sin(angle);
    const newLng = lng + radiusInDeg * Math.cos(angle);
    return [newLng, newLat];
  };

  const [riderLocation, setRiderLocation] = useState(() => {
    if (userLocation) return randomRiderLocation(...userLocation, 20);
    return [
      order.riderLocation?.lng || order.deliveryLng || 0,
      order.riderLocation?.lat || order.deliveryLat || 0,
    ];
  });

  const [route, setRoute] = useState(null);
  const deliveryLocation = [order.deliveryLng || 0, order.deliveryLat || 0];

  useEffect(() => {
    if (!order.riderId) return;
    const db = getFirestore();
    const riderDoc = doc(db, "riderLocations", order.riderId);
    const unsub = onSnapshot(riderDoc, (snapshot) => {
      const data = snapshot.data();
      if (data?.lat && data?.lng) {
        setRiderLocation([data.lng, data.lat]);
      }
    });
    return () => unsub();
  }, [order.riderId]);

  useEffect(() => {
    if (!riderLocation || !deliveryLocation) return;

    const fetchRoute = async () => {
      try {
        const response = await directionsClient
          .getDirections({
            profile: "driving",
            geometries: "geojson",
            waypoints: [
              { coordinates: riderLocation },
              { coordinates: deliveryLocation },
            ],
          })
          .send();

        const routeGeo = response.body.routes[0].geometry;
        setRoute(routeGeo);
      } catch (err) {
        console.log("Error fetching route:", err);
      }
    };

    fetchRoute();
  }, [riderLocation, deliveryLocation]);

  const getEtaText = (placedAt) => {
    if (!placedAt) return null;
    const now = new Date();
    const placedTime = new Date(placedAt.seconds * 1000);
    const eta = new Date(placedTime.getTime() + 30 * 60000);
    const diff = Math.max(0, Math.round((eta - now) / 60000));
    if (diff <= 0) return "Arriving soon";
    if (diff === 1) return "Arriving in 1 min";
    return `Arriving in ${diff} mins`;
  };

  const centerCoordinate = userLocation
    ? userLocation
    : [
        (riderLocation[0] + deliveryLocation[0]) / 2,
        (riderLocation[1] + deliveryLocation[1]) / 2,
      ];

  return (
    <View style={styles.card}>
      <Text style={styles.orderTitle}>Order ID: {order.orderId}</Text>

      {/* Items */}
      <View style={styles.subCard}>
        <Text style={styles.sectionTitle}>🛒 Meals</Text>
        {order.cartMeals?.map((item, idx) => (
          <View style={styles.itemRow} key={idx}>
            <Text style={styles.itemText}>
              {item.quantity}× {item.mealName}
            </Text>
            <Text style={styles.itemPrice}>
              ₱{(item.quantity * item.price).toFixed(2)}
            </Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            ₱{order.totalPrice?.toFixed(2) || "0.00"}
          </Text>
        </View>
      </View>

      {/* Delivery */}
      <View style={styles.subCard}>
        <Text style={styles.sectionTitle}>📍 Delivery Address</Text>
        <Text style={styles.infoText}>{order.deliveryAddress}</Text>
        <Text style={styles.infoText}>
          Payment Type: {order.paymentMethod === "cod"? "Cash on Delivery" : order.paymentMethod?.toUpperCase()}
        </Text>
      </View>

      {/* Rider Map */}
      <View style={styles.mapContainer}>
        <Mapbox.MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Street}>
          <Mapbox.Camera zoomLevel={12} centerCoordinate={centerCoordinate} />

          {userLocation && (
            <Mapbox.PointAnnotation id="user" coordinate={userLocation}>
              <View style={styles.userMarker} />
            </Mapbox.PointAnnotation>
          )}

          <Mapbox.PointAnnotation id="rider" coordinate={riderLocation}>
            <View style={styles.riderMarker} />
          </Mapbox.PointAnnotation>

          <Mapbox.PointAnnotation id="delivery" coordinate={deliveryLocation}>
            <View style={styles.deliveryMarker} />
          </Mapbox.PointAnnotation>

          {route && (
            <Mapbox.ShapeSource
              id={`route-${order.id}`}
              shape={{ type: "Feature", geometry: route }}
            >
              <Mapbox.LineLayer
                id={`routeLine-${order.id}`}
                style={{
                  lineColor: "#22c55e",
                  lineWidth: 5,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            </Mapbox.ShapeSource>
          )}
        </Mapbox.MapView>
      </View>

      {/* Status */}
      <View style={styles.subCard}>
        <StatusProgress status={order.status}/>
        {getEtaText(order.placedAt) && (
          <Text style={styles.etaText}>{getEtaText(order.placedAt)}</Text>
        )}
      </View>
    </View>
  );
};

// --- Main Screen ---
export default function TrackOrderScreen() {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]); // <-- added
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate("MainTabs", { screen: "Order" });
        return true; // prevent default back action
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [navigation])
  );

  useEffect(() => {
    (async () => {
      try {
        const locationStr = await AsyncStorage.getItem("userCoords");
        if (!locationStr) {
          Alert.alert("Location not found", "Please save your location first.");
          return;
        }
        const location = JSON.parse(locationStr);
        setUserLocation([location.longitude, location.latitude]);
      } catch (e) {
        console.log("Error reading AsyncStorage location:", e);
      }
    })();
  }, []);

  useEffect(() => {
    const db = getFirestore();
    const user = getAuth().currentUser;
    if (!user) return;

    const q = query(collection(db, "orders"), where("userId", "==", user.uid));

    const unsub = onSnapshot(q, (snapshot) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // start of today

      const fetchedOrders = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((order) => {
          if (!order.placedAt?.seconds) return false;
          const orderDate = new Date(order.placedAt.seconds * 1000);
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === today.getTime();
        });

      fetchedOrders.sort(
        (a, b) => (b.placedAt?.seconds || 0) - (a.placedAt?.seconds || 0)
      );

      setOrders(fetchedOrders); // all orders
      setActiveOrders(fetchedOrders.filter(o => o.status?.toLowerCase() !== "done")); // only active
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading)
    return (
      <View style={styles.loaderWrapper}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );

  if (!orders.length)
    return (
      <View style={styles.loaderWrapper}>
        <Text style={{ color: "#6b7280" }}>No active orders.</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={styles.title}>Track Orders</Text>
        <Text style={styles.subText}>
          You have {activeOrders.length} active order(s)
        </Text>

        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            userLocation={userLocation}
            loading={loading}
          />
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.fixedBackButton}
        onPress={() => navigation.navigate("MainTabs", { screen: "Order" })}
      >
        <Text style={styles.backButtonText}>Back to Order Food</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafaf9", paddingTop: 40},
  title: { fontSize: 26, fontWeight: "700", color: "#14532d", marginHorizontal: 20 },
  subText: { fontSize: 13, color: "#6b7280", marginBottom: 20, marginHorizontal: 20 },
  loaderWrapper: {
    width: SCREEN_WIDTH,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },

  fixedBackButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    elevation: 5,
  },
  backButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  card: { backgroundColor: "#fff", borderRadius: 2, padding: 16, marginBottom: 20, elevation: 3 },
  orderTitle: { fontSize: 16, fontWeight: "700", color: "#14532d", marginBottom: 12 },
  subCard: { backgroundColor: "#f9fafb", borderRadius: 12, padding: 12, marginBottom: 12 },
  sectionTitle: { fontWeight: "600", color: "#14532d", marginBottom: 8, fontSize: 15 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  itemText: { color: "#1c1917", fontSize: 15 },
  itemPrice: { fontWeight: "600", color: "#1c1917" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e5e5e5", marginTop: 12, paddingTop: 8 },
  totalLabel: { fontSize: 16, fontWeight: "bold", color: "#14532d" },
  totalValue: { fontSize: 16, fontWeight: "bold", color: "#14532d" },
  infoText: { fontSize: 14, color: "#374151", marginBottom: 4 },

  mapContainer: { height: 220, marginVertical: 12, borderRadius: 12, overflow: "hidden" },
  userMarker: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#3b82f6", borderWidth: 2, borderColor: "#fff" },
  riderMarker: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#22c55e", borderWidth: 2, borderColor: "#fff" },
  deliveryMarker: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#ef4444", borderWidth: 2, borderColor: "#fff" },

  progressContainer: { height: 6, marginTop: 12, justifyContent: "center" },
  progressBarBackground: { position: "absolute", height: 6, width: "100%", backgroundColor: "#e5e7eb", borderRadius: 3 },
  progressBarForeground: { position: "absolute", height: 6, backgroundColor: "#22c55e", borderRadius: 3 },
  stepLabelsContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  stepLabelText: { fontSize: 12, color: "#6b7280", textAlign: "center", flex: 1 },
  etaText: { marginTop: 10, textAlign: "center", fontSize: 14, color: "#14532d", fontWeight: "600" },
});
