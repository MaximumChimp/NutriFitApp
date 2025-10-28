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
  BackHandler,
  Modal
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc
} from "firebase/firestore";
import Mapbox from "@rnmapbox/maps";
import mbxDirections from "@mapbox/mapbox-sdk/services/directions";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

Mapbox.setAccessToken(
 "pk.eyJ1IjoibWF4aW11bWNoaW1wIiwiYSI6ImNtZWdxZHMyczE0d3Eya3NnMGdxMzZjNnEifQ.U7gxagxTZmIk85_fxYASWg"
);

const directionsClient = mbxDirections({
  accessToken:"pk.eyJ1IjoibWF4aW11bWNoaW1wIiwiYSI6ImNtZWdxZHMyczE0d3Eya3NnMGdxMzZjNnEifQ.U7gxagxTZmIk85_fxYASWg",
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
    if (s === "preparing" || s === "outfordelivery") return 1;
    if (s === "ontheway") return 2;
    if (s === "done") return 3;
    return 0;
  };

  useEffect(() => {
    let stepIndex = getStepIndex(status);
    const s = status?.toLowerCase().replace(/\s/g, "");
    if (s === "pending" || s === "received") stepIndex = 0.2;
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
    <View style={{ marginTop: 12 }} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <Text style={styles.sectionTitle}>🚚 Status</Text>
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground} />
        <Animated.View style={[styles.progressBarForeground, { width: progressWidth }]} />
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
                { color: isActive ? "#14532d" : "#6b7280", fontWeight: isActive ? "700" : "400" },
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

// --- Single Order Card with Animated Rider and Dynamic Zoom ---
const OrderCard = ({ order, userLocation,onCancel  }) => {
  const [riderLocation, setRiderLocation] = useState(null);
  const [route, setRoute] = useState(null);
  const [etaText, setEtaText] = useState("Waiting for rider...");
  const animatedRider = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const mapCamera = useRef(null);
  const [fullscreenMapVisible, setFullscreenMapVisible] = useState(false); 
  const deliveryLocation = order.location
    ? [order.location.longitude, order.location.latitude]
    : [order.deliveryLng || 0, order.deliveryLat || 0];

  // Listen to rider location in real-time
  useEffect(() => {
    if (!order.orderAccepted || !order.riderId) return;

    const db = getFirestore();
    const riderDoc = doc(db, "riders", order.riderId);

    const unsub = onSnapshot(riderDoc, (snapshot) => {
      const data = snapshot.data();
      if (data?.lat != null && data?.long != null) {
        const coords = [data.long, data.lat];
        setRiderLocation(prev => {
          // Animate movement
          if (prev) {
            Animated.timing(animatedRider, {
              toValue: { x: coords[0], y: coords[1] },
              duration: 1000,
              useNativeDriver: false,
            }).start();
          } else {
            animatedRider.setValue({ x: coords[0], y: coords[1] });
          }
          return coords;
        });
        fetchRouteAndEta(coords, deliveryLocation);
      }
    });

    return () => unsub();
  }, [order.orderAccepted, order.riderId]);

  const fetchRouteAndEta = async (riderCoords, deliveryCoords) => {
    try {
      const response = await directionsClient
        .getDirections({
          profile: "driving",
          geometries: "geojson", // already set
          waypoints: [
            { coordinates: riderCoords },
            { coordinates: deliveryCoords }
          ],
        })
        .send();

      const routeGeo = response.body.routes[0].geometry;
      setRoute(routeGeo);

      const durationSec = response.body.routes[0].duration;
      setRoute(routeGeo);
      setEtaText(`ETA: ${Math.ceil(durationSec / 60)} min`);
    } catch (err) {
      console.log("Error fetching route:", err);
      setEtaText("ETA unavailable");
    }
  };

  // Center and zoom
  const getZoomLevel = (rider, delivery) => {
    if (!rider || !delivery) return 18;
    const latDiff = Math.abs(rider[1] - delivery[1]);
    const lngDiff = Math.abs(rider[0] - delivery[0]);
    const maxDiff = Math.max(latDiff, lngDiff);
    if (maxDiff < 0.01) return 18;
    if (maxDiff < 0.03) return 14;
    if (maxDiff < 0.06) return 13;
    return 12;
  };

  const centerCoordinate = userLocation
    ? userLocation
    : riderLocation
    ? [(riderLocation[0] + deliveryLocation[0]) / 2, (riderLocation[1] + deliveryLocation[1]) / 2]
    : deliveryLocation;

  const zoomLevel = getZoomLevel(riderLocation, deliveryLocation);

  return (
    <View style={styles.card}>
      <Text style={styles.orderTitle}>Order ID: {order.orderId}</Text>

      {/* Meals */}
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
          <Text style={styles.totalValue}>₱{order.totalPrice?.toFixed(2) || "0.00"}</Text>
        </View>
      </View>

      {/* Delivery */}
      <View style={styles.subCard}>
        <Text style={styles.sectionTitle}>Delivery Details</Text>

        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>📍 Address</Text>
          <Text style={styles.detailValue}>
            {order.deliveryAddress || "No address provided"}
          </Text>
        </View>

        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>📞 Phone</Text>
          <Text style={styles.detailValue}>
            {order.phoneNumber || "No phone number"}
          </Text>
        </View>

        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>💳 Payment</Text>
          <Text style={styles.detailValue}>
            {order.paymentMethod?.toLowerCase() === "cod"
              ? "Cash on Delivery"
              : order.paymentMethod?.toUpperCase()}
          </Text>
        </View>
      </View>
     {/* Cancel Button / Canceled Badge */}
    {!["done", "preparing", "outfordelivery", "cancelled", "canceled"].includes(
      order.status?.toLowerCase().replace(/\s/g, "")
    ) && (
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={onCancel}
      >
        <Text style={styles.cancelButtonText}>Cancel Order</Text>
      </TouchableOpacity>
    )}





    {/* Rider Map */}
    {order.status?.toLowerCase() !== "cancelled" ? (
      <>
        {/* Rider Map */}
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setFullscreenMapVisible(true)}
    >
      <View style={styles.mapContainer}>
        {order.orderAccepted && riderLocation ? (
          <Mapbox.MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Street}>
            <Mapbox.Camera
              ref={mapCamera}
              centerCoordinate={centerCoordinate}
              zoomLevel={zoomLevel}
              animationMode="flyTo"
              animationDuration={1000}
            />

            {riderLocation && (
              <Mapbox.PointAnnotation
                id="rider"
                coordinate={[animatedRider.x._value, animatedRider.y._value]}
              >
                <MaterialIcons name="delivery-dining" size={28} color="#f97316" />
              </Mapbox.PointAnnotation>
            )}

            <Mapbox.PointAnnotation id="delivery" coordinate={deliveryLocation}>
              <MaterialIcons name="location-pin" size={32} color="#ef4444" />
            </Mapbox.PointAnnotation>
          {route && (
            <Mapbox.ShapeSource id={`route-${order.id}`} shape={{ type: "Feature", geometry: route }}>
              <Mapbox.LineLayer
                id={`routeLine-${order.id}`}
                style={{
                  lineColor: "#3b82f6",
                  lineWidth: 5,
                  lineCap: "round",  // makes ends rounded
                  lineJoin: "round", // smooth corners
                }}
              />
            </Mapbox.ShapeSource>
          )}

          </Mapbox.MapView>
        ) : (
          <View style={[styles.mapContainer, { justifyContent: "center", alignItems: "center" }]}>
            <Text style={{ color: "#6b7280", textAlign: "center" }}>
              Rider is getting your food. Map will be available once they start moving.
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>


        {/* Status */}
        <View style={styles.subCard}>
          <StatusProgress status={order.status} />
          <Text style={styles.etaText}>{etaText}</Text>
        </View>
      </>
    ) : (
      <View style={[styles.mapContainer, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 16, textAlign: "center" }}>
        Order has been canceled.
        </Text>
      </View>
    )}

     {/* Fullscreen Map Modal */}
      <Modal visible={fullscreenMapVisible} animationType="slide" onRequestClose={() => setFullscreenMapVisible(false)}>
        <View style={{ flex: 1 }}>
          <Mapbox.MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Street}>
            <Mapbox.Camera centerCoordinate={centerCoordinate} zoomLevel={zoomLevel} />
            {riderLocation && (
              <Mapbox.PointAnnotation id="rider-full" coordinate={[animatedRider.x._value, animatedRider.y._value]}>
                <MaterialIcons name="delivery-dining" size={32} color="#f97316" />
              </Mapbox.PointAnnotation>
            )}
            <Mapbox.PointAnnotation id="delivery-full" coordinate={deliveryLocation}>
              <MaterialIcons name="location-pin" size={36} color="#ef4444" />
            </Mapbox.PointAnnotation>
            {route && (
                <Mapbox.ShapeSource id={`route-${order.id}`} shape={{ type: "Feature", geometry: route }}>
                  <Mapbox.LineLayer
                    id={`routeLine-${order.id}`}
                    style={{
                      lineColor: "#3b82f6",
                      lineWidth: 5,
                      lineCap: "round",  // makes ends rounded
                      lineJoin: "round", // smooth corners
                    }}
                  />
                </Mapbox.ShapeSource>
              )}

          </Mapbox.MapView>

          <TouchableOpacity
            onPress={() => setFullscreenMapVisible(false)}
            style={{
              position: "absolute",
              top: 40,
              right: 20,
              backgroundColor: "#fff",
              padding: 10,
              borderRadius: 20,
              elevation: 5,
            }}
          >
            <MaterialIcons name="close" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </Modal>

  

</View>

);

};

// --- Main Screen ---
export default function TrackOrderScreen() {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [fullscreenMapVisible, setFullscreenMapVisible] = useState(false);
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate("MainTabs", { screen: "Order" });
        return true;
      };
      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
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

const isOlderThan24Hours = (timestamp) => {
  if (!timestamp?.seconds) return false;
  const orderDate = new Date(timestamp.seconds * 1000);
  const now = new Date();
  const diffHours = (now - orderDate) / (1000 * 60 * 60);
  return diffHours > 24;
};

 useEffect(() => {
  const db = getFirestore();
  const user = getAuth().currentUser;
  if (!user) return;

  const q = query(collection(db, "orders"), where("userId", "==", user.uid));

  const unsub = onSnapshot(q, async (snapshot) => {
    const fetchedOrders = [];

    for (let docSnap of snapshot.docs) {
      const order = { id: docSnap.id, ...docSnap.data() };

      // Check if order is older than 24 hours
      if (isOlderThan24Hours(order.placedAt)) {
        try {
          await deleteDoc(doc(db, "orders", order.id));
        } catch (err) {
          console.log("Failed to delete old order:", err);
        }
        continue;
      }

      fetchedOrders.push(order);
    }

    fetchedOrders.sort((a, b) => (b.placedAt?.seconds || 0) - (a.placedAt?.seconds || 0));
    setOrders(fetchedOrders);
    setActiveOrders(fetchedOrders.filter(o => o.status?.toLowerCase() !== "done"));
    setLoading(false);
  });

  return () => unsub();
}, []);





const handleCancelOrder = async (orderId) => {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  if (order.status?.toLowerCase() === "done" || order.status?.toLowerCase() === "cancelled") {
    Alert.alert("Cannot cancel", "This order has already been delivered or canceled.");
    return;
  }

  Alert.alert(
    "Cancel Order",
    "Are you sure you want to cancel this order?",
    [
      { text: "No", style: "cancel" },
      { 
        text: "Yes", 
        onPress: async () => {
          try {
            const db = getFirestore();
            const orderRef = doc(db, "orders", order.id);

            // Update status in Firestore
            await updateDoc(orderRef, {
              status: "Cancelled",
              updatedAt: new Date()
            });

            // Update local state
            setOrders(prevOrders =>
              prevOrders.map(o =>
                o.id === orderId ? { ...o, status: "Cancelled" } : o
              )
            );
            setActiveOrders(prevActive =>
              prevActive.filter(o => o.id !== orderId)
            );

            Alert.alert("Order canceled", "Your order has been canceled successfully.");
          } catch (e) {
            console.log("Cancel order error:", e);
            Alert.alert("Error", "Failed to cancel order. Please try again.");
          }
        } 
      },
    ]
  );
};





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
          You have {orders.filter(o => !["done", "cancelled", "canceled"].includes(o.status?.toLowerCase().replace(/\s/g, ""))).length} active order(s)
        </Text>
        {orders.map((order) => (
          <OrderCard 
            key={order.id} 
            order={order} 
            userLocation={userLocation} 
            onCancel={() => handleCancelOrder(order.id)} 
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
  container: { flex: 1, backgroundColor: "#fafaf9", paddingTop: 40 },
  title: { fontSize: 26, fontWeight: "700", color: "#14532d", marginHorizontal: 20 },
  subText: { fontSize: 13, color: "#6b7280", marginBottom: 20, marginHorizontal: 20 },
  loaderWrapper: { width: SCREEN_WIDTH, alignSelf: "center", justifyContent: "center", alignItems: "center", paddingVertical: 40 },
  fixedBackButton: { position: "absolute", bottom: 20, left: 20, right: 20, backgroundColor: "#22c55e", paddingVertical: 14, borderRadius: 12, alignItems: "center", elevation: 5 },
  backButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 20, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
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
  progressContainer: { height: 6, marginTop: 12, justifyContent: "center" },
  progressBarBackground: { position: "absolute", height: 6, width: "100%", backgroundColor: "#e5e7eb", borderRadius: 3 },
  progressBarForeground: { position: "absolute", height: 6, backgroundColor: "#22c55e", borderRadius: 3 },
  stepLabelsContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  stepLabelText: { fontSize: 12, color: "#6b7280", textAlign: "center", flex: 1 },
  etaText: { marginTop: 10, textAlign: "center", fontSize: 14, color: "#14532d", fontWeight: "600" },
detailBlock: {
  marginTop: 12,
},
detailLabel: {
  fontWeight: "600",
  color: "#14532d",
  marginBottom: 4,
},
detailValue: {
  color: "#374151",
  fontSize: 15,
},
cancelButton: {
  backgroundColor: "#ef4444", // bright red
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: "center",
  marginTop: 12,
  elevation: 2, // adds subtle shadow
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 2,
},

cancelButtonText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 15,
},
canceledBadge: {
  backgroundColor: "#f87171", // soft red
  paddingVertical: 10,
  borderRadius: 10,
  alignItems: "center",
  marginTop: 12,
},
canceledText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 15,
},

});
