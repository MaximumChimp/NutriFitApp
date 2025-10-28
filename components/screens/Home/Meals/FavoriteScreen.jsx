import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";

export default function FavoriteScreen() {
  const [favorites, setFavorites] = useState([]);
  const db = getFirestore();
  const auth = getAuth();
  const user = auth.currentUser;
  const navigation = useNavigation();
  
useEffect(() => {
  if (!user) return;

  const favRef = collection(db, "users", user.uid, "favorites");

  const unsubscribe = onSnapshot(favRef, (snapshot) => {
    const favs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by most recent
    favs.sort((a, b) => b.timestamp?.toMillis?.() - a.timestamp?.toMillis?.());
    setFavorites(favs);
  });

  return unsubscribe;
}, [user]);


  const handleRemove = async (id, title) => {
    Alert.alert(
      "Remove Favorite",
      `Are you sure you want to remove "${title}" from favorites?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "users", user.uid, "favorites", id));
            } catch (error) {
              console.error("Error removing favorite:", error);
            }
          },
        },
      ]
    );
  };

const renderItem = ({ item }) => {
  if (!item) return null; // prevent crash if item is undefined

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => navigation.navigate("MealDetail", { meal: item })} // pass full meal
    >
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {item.mealName}
        </Text>
        <View style={styles.details}>
          <Text style={styles.detailText}>₱ {item.price}</Text>
          <Text style={styles.detailText}>{item.calories} kcal</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => handleRemove(item.id, item.mealName)}
      >
        <Ionicons name="heart" size={22} color="#FF5A5F" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};


  return (
    <View style={styles.container}>
      <Text style={styles.header}>Favorites</Text>
      {favorites.length > 0 ? (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-dislike" size={60} color="#9CA3AF" />
          <Text style={styles.emptyText}>No favorites yet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  header: {
    fontSize: 20,
    fontWeight: "700",
    color: "#55555",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 160,
  },
  info: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#55555",
  },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  detailText: {
    fontSize: 14,
    color: "#55555",
  },
  iconBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#fff",
    borderRadius: 50,
    padding: 6,
    elevation: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6B7280",
  },
});
