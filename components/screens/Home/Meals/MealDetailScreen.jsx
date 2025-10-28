import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Modal,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import { db } from "../../../../config/firebase-config";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import { useCart } from "../../../context/CartContext";
import { v4 as uuidv4 } from 'uuid'; // install with: npm install uuid

const screenWidth = Dimensions.get("window").width;
const cardWidth = screenWidth - 48;

export default function MealDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { meal } = route.params;

  const [showFullDescription, setShowFullDescription] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [feedbacks, setFeedbacks] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [userFeedback, setUserFeedback] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [favorites, setFavorites] = useState({});
  const [specialModalVisible, setSpecialModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // "buy" or "cart"

  const { addToCart } = useCart();
  const auth = getAuth();
  const user = auth.currentUser;

  const fetchFeedbacks = async () => {
    try {
      const q = query(collection(db, "mealFeedback"), where("mealId", "==", meal.id));
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFeedbacks(results.slice(0, 5));
      const ratings = results.map((f) => f.rating || 0);
      const avg = ratings.length
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : 0;
      setAverageRating(avg);
    } catch (e) {
      console.error("Fetch feedback error:", e);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

// ✅ Optimized fetchFavorites (fetch only current meal)
useEffect(() => {
  const fetchFavoriteStatus = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const favRef = doc(db, "users", user.uid, "favorites", meal.id);
      const favSnap = await getDoc(favRef);
      setFavorites({ [meal.id]: favSnap.exists() });
    } catch (err) {
      console.error("Error fetching favorite status:", err);
    }
  };

  fetchFavoriteStatus();
}, [meal.id]);



const toggleFavorite = async (mealId, mealData) => {
  const user = auth.currentUser;
  if (!user) return;

  // Optimistic update for instant feedback
  setFavorites((prev) => ({
    ...prev,
    [mealId]: !prev[mealId],
  }));

  try {
    const favRef = doc(db, "users", user.uid, "favorites", mealId);

    if (!favorites[mealId]) {
      // Add to favorites in background
      setDoc(favRef, {
        ...mealData,
        timestamp: new Date(),
      });
    } else {
      // Remove from favorites in background
      deleteDoc(favRef);
    }
  } catch (err) {
    console.error("Error updating favorite:", err);
  }
};


  const handleAddFeedback = async () => {
    if (!user || !userFeedback.trim()) return;
    setSubmitting(true);
    try {
      const q = query(
        collection(db, "mealFeedback"),
        where("mealId", "==", meal.id),
        where("userId", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const existing = snapshot.docs[0];
      if (existing) {
        const feedbackRef = doc(db, "mealFeedback", existing.id);
        await updateDoc(feedbackRef, {
          feedback: userFeedback,
          rating,
          date: new Date(),
        });
      } else {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const fullName = userDoc.exists()
          ? `${userDoc.data().firstName || ""} ${
              userDoc.data().lastName || ""
            }`.trim()
          : "User";
        await addDoc(collection(db, "mealFeedback"), {
          mealId: meal.id,
          userId: user.uid,
          fullName,
          feedback: userFeedback,
          rating,
          date: new Date(),
        });
      }
      setUserFeedback("");
      setRating(5);
      setModalVisible(false);
      fetchFeedbacks();
    } catch (e) {
      console.error("Failed to submit feedback:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToCart = () => {
    addToCart({ ...meal, specialInstructions }); 
    navigation.goBack(); 
  };

  
  const handleActionClick = (action) => {
    setPendingAction(action);
    setSpecialModalVisible(true);
  };

const handleSpecialSubmit = () => {
  // Generate a unique orderId using timestamp
  const orderId = Date.now().toString(); // or: `${Date.now()}-${Math.floor(Math.random() * 1000)}`

  setSpecialModalVisible(false);

  if (pendingAction === "buy") {
    navigation.navigate("PaymentMethod", {
      selectedMeal: {
        ...meal,
        specialInstructions,
        orderId, // pass orderId here
      },
    });
  } else if (pendingAction === "cart") {
    addToCart({
      ...meal,
      specialInstructions,
      orderId, // also include orderId in cart
    });
    navigation.goBack();
  }

  setPendingAction(null);
};

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 140,
          paddingHorizontal: 16,
          paddingTop: 0,
        }}
      >
        {/* Image with Back and Favorite icons */}
        <View style={{ position: "relative" }}>
          <Image source={{ uri: meal.image }} style={styles.image} />
          <View style={styles.topIconsContainer}>
            <TouchableOpacity
              style={[styles.iconButton, { left: 16 }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
        
           <TouchableOpacity style={[styles.iconButton, { right: 16 }]} onPress={() => toggleFavorite(meal.id, meal)}>
              <Ionicons
                name={favorites[meal.id] ? "heart" : "heart-outline"}
                size={28}
                color={favorites[meal.id] ? "#ef4444" : "#6b7280"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Title & Rating */}
        <View style={styles.header}>
          <Text style={styles.title}>{meal.mealName}</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons
                key={i}
                name={i <= Math.round(averageRating) ? "star" : "star-outline"}
                size={18}
                color="#fbbf24"
              />
            ))}
            <Text style={styles.averageText}>{averageRating}</Text>
          </View>
        </View>

        {/* Price & Calories */}
        <View style={styles.infoRow}>
          <Text style={styles.price}>₱ {meal.price?.toFixed(2)}</Text>
          {meal.calories && <Text style={styles.calories}>{meal.calories} kcal</Text>}
        </View>

        {/* Description */}

        <Text
          style={styles.description}
          numberOfLines={showFullDescription ? undefined : 3}
          ellipsizeMode="tail"
        >
          {meal?.description?.trim() || "No description available."}
        </Text>

        {meal?.description?.trim().length > 100 && (
          <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
            <Text style={styles.readMore}>
              {showFullDescription ? "Read less" : "Read more"}
            </Text>
          </TouchableOpacity>
        )}



        {/* Macros */}
        <View style={styles.macrosRow}>
          <Text style={styles.macroItem}>Protein: {meal.protein || 0}g</Text>
          <Text style={styles.macroItem}>Carbs: {meal.carbs || 0}g</Text>
          <Text style={styles.macroItem}>Fat: {meal.fat || 0}g</Text>
        </View>

        {/* Ingredients */}
        {meal.ingredients && meal.ingredients.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {meal.ingredients.map((item, index) => (
              <View key={index} style={{ flexDirection: "row", marginVertical: 2 }}>
                <Text style={{ marginRight: 6 }}>•</Text>
                <Text style={{ color: "#374151", flex: 1 }}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Feedback Section */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Customer Reviews</Text>
        {feedbacks.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
          >
            {feedbacks.map((item) => (
              <View
                key={item.id}
                style={[styles.feedbackCard, { width: screenWidth * 0.85, marginRight: 16 }]}
              >
                <Text style={styles.user}>{item.fullName}</Text>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= item.rating ? "star" : "star-outline"}
                      size={16}
                      color="#fbbf24"
                    />
                  ))}
                </View>
                <Text style={styles.feedbackText}>{item.feedback}</Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={{ color: "#6b7280", textAlign: "center", marginVertical: 16 }}>
            No reviews yet.
          </Text>
        )}

        <TouchableOpacity
          style={styles.feedbackButton}
          onPress={() => setModalVisible(true)}
        > 
         <Ionicons
            name="create-outline"
            size={20}
            color="#fff"
            style={{ marginRight: 8 }} // spacing between icon and text
          />
          <Text style={styles.feedbackButtonText}>Add Feedback</Text>
        </TouchableOpacity>
      </ScrollView>

     <View style={styles.bottomBar}>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#22c55e" }]}
            onPress={() => handleActionClick("buy")}
          >
            <Text style={styles.actionButtonText}>Buy Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#3b82f6" }]}
            onPress={() => handleActionClick("cart")}
          >
            <Text style={styles.actionButtonText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>



      {/* Feedback Modal */}
      <Modal animationType="none" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Your Feedback</Text>
            <View style={styles.modalRatingRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity key={i} onPress={() => setRating(i)}>
                  <Ionicons
                    name={i <= rating ? "star" : "star-outline"}
                    size={28}
                    color="#fbbf24"
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Write your feedback..."
              value={userFeedback}
              onChangeText={setUserFeedback}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#e5e7eb" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#22c55e" }]}
                onPress={handleAddFeedback}
                disabled={submitting}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  {submitting ? "Submitting..." : "Submit"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal transparent animationType="none" visible={specialModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Special Instructions</Text>
            <TextInput
              style={styles.instructionsTextArea}
              placeholder="No onions, extra spicy..."
              value={specialInstructions}
              onChangeText={setSpecialInstructions}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#e5e7eb" }]}
                 onPress={() => {
                  setSpecialModalVisible(false);
                  setSpecialInstructions(""); // clear text field
                }}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#22c55e" }]}
                onPress={handleSpecialSubmit}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


    </View>

    
  );
}

const styles = StyleSheet.create({
image: {
  width: "100%",
  height: 280,
  borderRadius: 20,
  marginTop: 50, // 👈 Added this line to bring image down
},
  topIconsContainer: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  iconButton: {
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 8,
    borderRadius: 20,
    position: "absolute",
    top: 8,
  },
  header: { marginTop: 16, marginBottom: 12 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 6,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  averageText: { marginLeft: 6, color: "#6b7280", fontWeight: "600" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  price: { fontSize: 22, fontWeight: "700", color: "#22c55e" },
  calories: { fontSize: 16, color: "#6b7280", fontWeight: "500" },
  description: { fontSize: 16, color: "#374151", lineHeight: 24 },
  readMore: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
    textAlign: "right",
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  macroItem: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  instructionsSubtext: { fontSize: 13, color: "#6b7280", marginBottom: 8 },
  instructionsTextArea: {
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: "top",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
    borderWidth: 0,
  },
  bottomBar: {
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 6,
    elevation: 8,
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  addButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  feedbackCard: {
    width: cardWidth,
    minHeight: 140,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginRight: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackText: {
    fontSize: 14,
    color: "#374151",
    marginTop: 8,
  },
  user: { fontWeight: "700", color: "#111827", marginBottom: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  modalRatingRow: { flexDirection: "row", marginBottom: 16 },
  modalInput: {
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    height: 100,
    marginBottom: 16,
  },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  feedbackButton: {
    marginTop: 16,
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    borderRadius: 4,
    flexDirection:'row',
    justifyContent: "center",
    alignItems: "center",
  },
  feedbackButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  actionButtonsRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  width: "100%",
  gap: 12,
},
actionButton: {
  flex: 1,
  paddingVertical: 14,
  borderRadius: 24,
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 4,
  elevation: 2,
},
actionButtonText: {
  color: "#fff",
  fontWeight: "600",
  fontSize: 16,
},
modalOverlay: {
  flex: 1, // full screen
  backgroundColor: "rgba(0,0,0,0.5)", // dark overlay
  justifyContent: "center", // center vertically
  alignItems: "center", // center horizontally
},

modalContainer: {
  width: "90%",
  backgroundColor: "#fff",
  borderRadius: 12,
  padding: 20,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 5, // Android shadow
},

});
