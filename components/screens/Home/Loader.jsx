import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const screenWidth = Dimensions.get("window").width;
const CARD_WIDTH = screenWidth - 48;
const SIZE = 100;

const Shimmer = ({ style }) => {
  const translateX = new Animated.Value(-CARD_WIDTH);

  useEffect(() => {
    Animated.loop(
      Animated.timing(translateX, {
        toValue: CARD_WIDTH,
        duration: 1300,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  return (
    <View style={[style, { overflow: "hidden" }]}>
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.4)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

export default function Loader() {
  return (
    <View style={styles.container}>
      {/* Header Placeholder */}
      <View style={styles.header}>
        <View style={styles.profileCircle} />
        <View style={styles.nameGroup}>
          <View style={styles.lineShort} />
          <View style={styles.lineMedium} />
        </View>
        <View style={styles.icon} />
      </View>

      {/* Circles Placeholder */}
      <View style={styles.circleRow}>
        {[...Array(3)].map((_, i) => (
          <View key={i} style={styles.circleItem}>
            <View style={styles.circle} />
            <View style={styles.lineSmall} />
          </View>
        ))}
      </View>

      {/* Macros Placeholder */}
      {[...Array(3)].map((_, i) => (
        <View key={i} style={styles.macroRow}>
          <View style={styles.label} />
          <View style={styles.progressBar} />
          <View style={styles.percent} />
        </View>
      ))}

      {/* Suggestions Placeholder */}
      <View style={styles.sectionTitle} />
      <Shimmer style={styles.card} />

      {/* Add Button Placeholder */}
      <View style={styles.addButton} />
    </View>
  );
}

const shimmer = {
  backgroundColor: "#e5e7eb",
};

const styles = StyleSheet.create({
  container: { padding: 24,paddingTop:50},
  header: { flexDirection: "row", alignItems: "center", marginBottom: 32 },
  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    ...shimmer,
  },
  nameGroup: { flex: 1, marginLeft: 16 },
  lineShort: {
    width: 100,
    height: 10,
    borderRadius: 4,
    marginBottom: 6,
    ...shimmer,
  },
  lineMedium: { width: 140, height: 14, borderRadius: 4, ...shimmer },
  icon: { width: 26, height: 26, borderRadius: 13, ...shimmer },

  circleRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  circleItem: { alignItems: "center", flex: 1 },
  circle: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, ...shimmer },
  lineSmall: { width: 40, height: 10, marginTop: 10, borderRadius: 4, ...shimmer },

  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    width: 60,
    height: 10,
    borderRadius: 4,
    ...shimmer,
  },
  progressBar: {
    flex: 1,
    height: 10,
    marginHorizontal: 10,
    borderRadius: 5,
    ...shimmer,
  },
  percent: {
    width: 30,
    height: 10,
    borderRadius: 4,
    ...shimmer,
  },

  sectionTitle: {
    width: 150,
    height: 16,
    borderRadius: 6,
    marginBottom: 16,
    ...shimmer,
  },

  card: {
    width: CARD_WIDTH,
    height: 140,
    borderRadius: 16,
    ...shimmer,
    marginBottom: 24,
  },

  addButton: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    ...shimmer,
  },
});
