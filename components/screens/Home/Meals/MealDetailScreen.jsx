import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  Modal
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../../../config/firebase-config';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import Toast from 'react-native-toast-message';

const screenWidth = Dimensions.get('window').width;
const cardWidth = screenWidth - 48;

export default function MealDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { meal } = route.params;

  const [showFullDescription, setShowFullDescription] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [feedbacks, setFeedbacks] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [userFeedback, setUserFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  // Fetch feedbacks
  const fetchFeedbacks = async () => {
    try {
      const q = query(collection(db, 'mealFeedback'), where('mealId', '==', meal.id));
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFeedbacks(results.slice(0, 5));
      const ratings = results.map(f => f.rating || 0);
      const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0;
      setAverageRating(avg);
    } catch (e) {
      console.error('Fetch feedback error:', e);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  // Add or update feedback
  const handleAddFeedback = async () => {
    if (!user || !userFeedback.trim()) return;

    setSubmitting(true);
    try {
      const q = query(
        collection(db, 'mealFeedback'),
        where('mealId', '==', meal.id),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const existing = snapshot.docs[0];

      if (existing) {
        const feedbackRef = doc(db, 'mealFeedback', existing.id);
        await updateDoc(feedbackRef, { feedback: userFeedback, rating, date: new Date() });
        Toast.show({ type: 'success', text1: 'Feedback updated!' });
      } else {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const fullName = userDoc.exists()
          ? `${userDoc.data().firstName || ''} ${userDoc.data().lastName || ''}`.trim()
          : 'User';
        await addDoc(collection(db, 'mealFeedback'), {
          mealId: meal.id,
          userId: user.uid,
          fullName,
          feedback: userFeedback,
          rating,
          date: new Date()
        });
        Toast.show({ type: 'success', text1: 'Feedback added!' });
      }

      setUserFeedback('');
      setRating(5);
      setModalVisible(false);
      fetchFeedbacks();
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Failed to submit feedback' });
    } finally {
      setSubmitting(false);
    }
  };

  const addToCart = async () => {
    try {
      const uid = user?.uid;
      if (!uid) return;

      const storageKey = `cart_${uid}`;
      const existingCart = await AsyncStorage.getItem(storageKey);
      let cart = existingCart ? JSON.parse(existingCart) : [];

      const index = cart.findIndex(item => item.mealName === meal.mealName);
      if (index !== -1) {
        cart[index].quantity += 1;
        cart[index].specialInstructions = specialInstructions;
      } else {
        cart.push({ ...meal, quantity: 1, specialInstructions });
      }

      await AsyncStorage.setItem(storageKey, JSON.stringify(cart));
      Toast.show({ type: 'success', text1: 'Added to cart!' });
      navigation.goBack();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Add to cart failed' });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 16, paddingTop: 16 }}>
        {/* Meal Image */}
        <Image source={{ uri: meal.image }} style={styles.image} />

        {/* Title & Rating */}
        <View style={styles.header}>
          <Text style={styles.title}>{meal.mealName}</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <Ionicons
                key={i}
                name={i <= Math.round(averageRating) ? 'star' : 'star-outline'}
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
        <Text style={styles.description} numberOfLines={showFullDescription ? undefined : 3} ellipsizeMode="tail">
          {meal.description || 'No description available.'}
        </Text>
        {meal.description?.length > 100 && (
          <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
            <Text style={styles.readMore}>{showFullDescription ? 'Read less' : 'Read more'}</Text>
          </TouchableOpacity>
        )}

        {/* Macros */}
        <View style={styles.macrosRow}>
          <Text style={styles.macroItem}>Protein: {meal.protein || 0}g</Text>
          <Text style={styles.macroItem}>Carbs: {meal.carbs || 0}g</Text>
          <Text style={styles.macroItem}>Fat: {meal.fat || 0}g</Text>
        </View>

        {/* Special Instructions */}
        <Text style={styles.sectionTitle}>Special Instructions</Text>
        <Text style={styles.instructionsSubtext}>Allergies or preferences? Let us know.</Text>
        <TextInput
          style={styles.instructionsInput}
          placeholder="No onions, extra spicy..."
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
          multiline
          numberOfLines={4}
        />

        {/* Feedback Section */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Customer Reviews</Text>
        <FlatList
          data={feedbacks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.feedbackCard}>
              <Text style={styles.user}>{item.fullName}</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Ionicons
                    key={star}
                    name={star <= item.rating ? 'star' : 'star-outline'}
                    size={16}
                    color="#fbbf24"
                  />
                ))}
              </View>
              <Text style={styles.feedbackText}>{item.feedback}</Text>
            </View>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
        <TouchableOpacity
          style={styles.feedbackButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.feedbackButtonText}>Add Feedback</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.backButtonBottom} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={addToCart}>
          <Text style={styles.addButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>

      {/* Feedback Modal */}
      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Your Feedback</Text>
            <View style={styles.modalRatingRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <TouchableOpacity key={i} onPress={() => setRating(i)}>
                  <Ionicons
                    name={i <= rating ? 'star' : 'star-outline'}
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
                style={[styles.modalButton, { backgroundColor: '#e5e7eb' }]}
                onPress={() => setModalVisible(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#22c55e' }]}
                onPress={handleAddFeedback}
                disabled={submitting}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>{submitting ? 'Submitting...' : 'Submit'}</Text>
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
    width: '100%',
    height: 260,
    borderRadius: 20,
    marginBottom: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  averageText: {
    marginLeft: 6,
    color: '#6b7280',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  price: { fontSize: 20, fontWeight: '700', color: '#10b981' },
  calories: { fontSize: 16, color: '#6b7280', fontWeight: '500' },
  description: { fontSize: 16, color: '#374151', lineHeight: 24 },
  readMore: { color: '#2563eb', fontSize: 14, fontWeight: '500', marginTop: 4, textAlign: 'right' },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 20 },
  macroItem: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 6 },
  instructionsSubtext: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  instructionsInput: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 16,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -1 },
    shadowRadius: 3,
    elevation: 5,
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  backButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    flexShrink: 1,
  },
  backButtonText: {
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 16,
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
    marginLeft: 12,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
feedbackCard: {
  width: cardWidth * 0.8,
  minHeight: 120,           // Make cards taller
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 12,
  marginRight: 12,
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowOffset: { width: 0, height: 1 },
  shadowRadius: 2,
  elevation: 2,
  flexShrink: 0,
},
feedbackText: {
  fontSize: 14,
  color: '#374151',
  marginTop: 6,
  flexWrap: 'wrap',         // Allow wrapping
  flexShrink: 1,
},

  user: { fontWeight: '700', color: '#1f2937', marginBottom: 4 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalRatingRow: { flexDirection: 'row', marginBottom: 12 },
  modalInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    height: 100,
    marginBottom: 12,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
