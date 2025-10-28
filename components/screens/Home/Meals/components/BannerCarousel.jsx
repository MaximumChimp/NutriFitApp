import React, { useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  ImageBackground,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

const BannerItem = ({ item, navigation }) => {
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.bannerItem}>
      <ImageBackground
        source={{ uri: item.image }}
        style={styles.bannerImage}
        imageStyle={{ borderRadius: 12 }}
        resizeMode="cover"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={(e) =>
          console.log("Banner image load error:", e.nativeEvent.error)
        }
      >
        {/* ✅ Loader */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {/* ✅ Overlay content (always rendered) */}
        <View style={styles.bannerOverlay}>
          <Text style={styles.bannerTitle}>{item.mealName}</Text>
          <Text style={styles.bannerPrice}>
            ₱{item.price?.toFixed(2) || "0.00"}
          </Text>

          <TouchableOpacity
            style={styles.bannerBtn}
            onPress={() => navigation.navigate("MealDetail", { meal: item })}
            activeOpacity={0.8}
          >
            <Text style={styles.bannerBtnText}>Order Now</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
};

export default function BannerCarousel({ meals = [], navigation }) {
  const bannerRef = useRef(null);
  const [index, setIndex] = useState(0);

  // ✅ Auto-scroll every 4 seconds
  useEffect(() => {
    if (meals.length === 0) return;
    const interval = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % meals.length;
        bannerRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [meals]);

  return (
    <View style={styles.bannerContainer}>
      <FlatList
        ref={bannerRef}
        data={meals}
        renderItem={({ item }) => (
          <BannerItem item={item} navigation={navigation} />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ alignItems: "center" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    height: 180,
    marginBottom: 16,
  },
  bannerItem: {
    width: SCREEN_WIDTH - 32,
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  bannerImage: {
    width: "100%",
    height: 180,
    justifyContent: "flex-end",
    backgroundColor: "#ccc", // 👈 temporary gray background to verify layout
  },
  bannerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 2,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  bannerPrice: {
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
  },
  bannerBtn: {
    marginTop: 6,
    backgroundColor: "#22c55e",
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
  },
  bannerBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
});
