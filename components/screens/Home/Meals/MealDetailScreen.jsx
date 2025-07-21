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
  Alert,
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
  orderBy,
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const cardWidth = screenWidth - 48;

export default function MealDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { meal } = route.params;
  const [showFullDescription, setShowFullDescription] = useState(false);

  const [feedbacks, setFeedbacks] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [userFeedback, setUserFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const auth = getAuth();
  const user = auth.currentUser;
  const [currentPage, setCurrentPage] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState(null);
  const [visibleDropdownId, setVisibleDropdownId] = useState(null);
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingRating, setEditingRating] = useState(5);
  const [hasUserFeedback, setHasUserFeedback] = useState(false);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);


  const handleScroll = (event) => {
    const x = event.nativeEvent.contentOffset.x;
    const page = Math.round(x / screenWidth);
    setCurrentPage(page);
  };

const fetchFeedbacks = async () => {
  try {
    setLoadingFeedbacks(true); // Start loading

    const q = query(
      collection(db, 'mealFeedback'),
      where('mealId', '==', meal.id),
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setFeedbacks(results.slice(0, 5));

    const ratings = results.map(f => f.rating || 0);
    const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0;
    setAverageRating(avg);

    if (user) {
      const userHasFeedback = results.some(f => f.userId === user.uid);
      setHasUserFeedback(userHasFeedback);
    }
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
  } finally {
    setLoadingFeedbacks(false); // Done loading
  }
};



  useEffect(() => {
    fetchFeedbacks();
  }, []);

const handleAddFeedback = async () => {
  if (!user) {
    Toast.show({ type: 'error', text1: 'Please login first' });
    return;
  }

  if (!userFeedback.trim()) {
    Toast.show({ type: 'error', text1: 'Feedback cannot be empty' });
    return;
  }

  setSubmitting(true);
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) throw new Error('User profile not found');

    const userData = userSnap.data();
    const fullName =
      userData?.firstName && userData?.lastName
        ? `${userData.firstName} ${userData.lastName}`
        : userData?.Name || 'Name';

    // Check if user already has feedback for this meal
    const q = query(
      collection(db, 'mealFeedback'),
      where('mealId', '==', meal.id),
      where('userId', '==', user.uid)
    );
    const snapshot = await getDocs(q);
    const existingFeedback = snapshot.docs[0];

    if (editingFeedbackId || existingFeedback) {
      // UPDATE EXISTING FEEDBACK
      const feedbackId = editingFeedbackId || existingFeedback.id;
      const feedbackRef = doc(db, 'mealFeedback', feedbackId);
      await updateDoc(feedbackRef, {
        feedback: editingText || userFeedback,
        rating: editingRating || rating,
        date: new Date(),
      });
      Toast.show({ type: 'success', text1: 'Feedback updated!' });
    } else {
      // ADD NEW FEEDBACK
      await addDoc(collection(db, 'mealFeedback'), {
        mealId: meal.id,
        userId: user.uid,
        fullName,
        feedback: userFeedback,
        rating,
        date: new Date(),
      });
      Toast.show({ type: 'success', text1: 'Feedback added!' });
    }

    // Reset state
    setUserFeedback('');
    setEditingFeedbackId(null);
    setEditingText('');
    setRating(5);
    setEditingRating(5);
    setHasUserFeedback(true); // <-- Mark that the user has given feedback
    fetchFeedbacks();
  } catch (e) {
    console.error('Add/update feedback error:', e);
    Toast.show({ type: 'error', text1: 'Failed to submit feedback' });
  } finally {
    setSubmitting(false);
  }
};

const renderSkeletonCard = (_, index) => (
  <View key={index} style={[styles.card, { opacity: 0.5 }]}>
    <View style={{ width: 120, height: 16, backgroundColor: '#e5e7eb', borderRadius: 8, marginBottom: 12 }} />
    <View style={{ flexDirection: 'row', marginBottom: 10 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <Ionicons key={star} name="star" size={18} color="#d1d5db" style={{ marginRight: 2 }} />
      ))}
    </View>
    <View style={{ height: 40, backgroundColor: '#e5e7eb', borderRadius: 8 }} />
  </View>
);


  const deleteFeedback = async (id) => {
    Alert.alert('Delete Feedback', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(db, 'mealFeedback', id));
          fetchFeedbacks();
        },
      },
    ]);
  };

  const handleEditComment = (id) => {
    const feedback = feedbacks.find(f => f.id === id);
    if (feedback) {
      setEditingFeedbackId(id);
      setEditingText(feedback.feedback);
      setEditingRating(feedback.rating || 5);
      setModalVisible(true);
    }
  };


  const addToCart = async () => {
    try {
      const uid = user?.uid;
      if (!uid) {
        Toast.show({ type: 'error', text1: 'Please login to add to cart.' });
        return;
      }
      const storageKey = `cart_${uid}`;
      const existingCart = await AsyncStorage.getItem(storageKey);
      let cart = existingCart ? JSON.parse(existingCart) : [];
      const index = cart.findIndex(item => item.mealName === meal.mealName);
      if (index !== -1) cart[index].quantity += 1;
      else cart.push({ ...meal, quantity: 1 });
      await AsyncStorage.setItem(storageKey, JSON.stringify(cart));
      Toast.show({ type: 'success', text1: 'Added to cart!' });
      navigation.goBack();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Add to cart failed' });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: meal.image }} style={styles.image} />
<View style={styles.headerBlock}>
  {/* Title + Average Rating */}
  <View style={styles.titleRow}>
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

  {/* Price + Calories */}
  <View style={styles.infoRow}>
    <Text style={styles.price}>₱ {meal.price?.toFixed(2)}</Text>
    {meal.calories && (
      <Text style={styles.calories}>Calories: {meal.calories} kcal</Text>
    )}
  </View>
</View>


      <Text
        style={styles.description}
        numberOfLines={showFullDescription ? undefined : 3}
        ellipsizeMode="tail"
      >
        {meal.description || 'No description available.'}
      </Text>
      {meal.description && meal.description.length > 100 && (
        <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
          <Text style={styles.readMoreText}>
            {showFullDescription ? 'Read less' : 'Read more'}
          </Text>
        </TouchableOpacity>
      )}

{/* Macros in one row */}
<View style={styles.macrosRow}>
  <Text style={styles.macroItem}>Protein: {meal.protein || 0}g</Text>
  <Text style={styles.macroItem}>Carbs: {meal.carbs || 0}g</Text>
  <Text style={styles.macroItem}>Fat: {meal.fat || 0}g</Text>
</View>


      {/* Add to Cart */}
      <TouchableOpacity style={styles.addButton} onPress={addToCart}>
        <Text style={styles.addButtonText}>Add to Cart</Text>
      </TouchableOpacity>


      {/* Feedback List */}
      <Text style={styles.sectionTitle}>Meal Reviews From Customers</Text>
     {loadingFeedbacks ? (
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {[...Array(3)].map(renderSkeletonCard)}
  </ScrollView>
) : (
  <FlatList
    data={[
      ...feedbacks.slice(0, 5),
      ...(hasUserFeedback ? [] : [{ type: 'write' }])
    ]}
    keyExtractor={(item, index) => item.id || `write-${index}`}
    horizontal
    showsHorizontalScrollIndicator={false}
    decelerationRate="fast"
    snapToInterval={cardWidth + 16}
    snapToAlignment="center"
    onScroll={handleScroll}
    scrollEventThrottle={16}
    ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
    renderItem={({ item }) =>
      item.type === 'write' ? (
        <TouchableOpacity
          style={[styles.card, { justifyContent: 'center', alignItems: 'center' }]}
          onPress={() => setModalVisible(true)}
        >
          <View style={{ alignItems: 'center' }}>
            {feedbacks.length === 0 && !hasUserFeedback && (
              <Text style={styles.noFeedbackText}>
                No reviews yet. be the first to share your thoughts!
              </Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="pencil" size={22} color="#3b82f6" />
              <Text style={styles.writeButtonText}>Write Feedback</Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={[styles.card, { position: 'relative', zIndex: visibleDropdownId === item.id ? 99 : 1 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.user}>{item.fullName}</Text>
          </View>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <Ionicons
                key={star}
                name={star <= item.rating ? 'star' : 'star-outline'}
                size={18}
                color="#fbbf24"
                style={{ marginRight: 2 }}
              />
            ))}
          </View>
          <Text style={styles.feedbackText}>{item.feedback}</Text>
        </View>
      )
    }
  />
)}



{feedbacks.length > 1 && (
  <View style={styles.dotsContainer}>
    {feedbacks.map((_, index) => (
      <View
        key={index}
        style={[
          styles.dot,
          index === currentPage ? styles.activeDot : null,
        ]}
      />
    ))}
  </View>
)}

<Modal
  animationType="slide"
  transparent={true}
  visible={modalVisible}
  onRequestClose={() => setModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>How Was Your Meal?</Text>

      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map(num => (
          <TouchableOpacity key={num} onPress={() => setRating(num)}>
            <Ionicons
              name={num <= rating ? 'star' : 'star-outline'}
              size={28}
              color="#fbbf24"
              style={{ marginHorizontal: 2 }}
            />
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        multiline
        placeholder="Share your thoughts..."
        value={userFeedback}
        onChangeText={setUserFeedback}
      />

      <View style={styles.modalButtonRow}>
        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: '#e5e7eb' }]}
          onPress={() => setModalVisible(false)}
        >
          <Text style={{ color: '#111827' }}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: '#22c55e' }]}
          onPress={() => {
            handleAddFeedback();
            setModalVisible(false);
          }}
        >
          <Text style={{ color: '#fff' }}>
            {submitting ? 'Submitting...' : 'Submit'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

<Modal
  transparent
  visible={menuVisible}
  animationType="fade"
  onRequestClose={() => setMenuVisible(false)}
>
  <TouchableOpacity
    style={styles.modalOverlay}
    activeOpacity={1}
    onPressOut={() => setMenuVisible(false)}
  >
    <View style={styles.menuContainer}>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => {
          setMenuVisible(false);
          handleEditComment(selectedCommentId); // Define this function
        }}
      >
        <Text style={styles.menuText}>Edit Comment</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => {
          setMenuVisible(false);
          handleDeleteComment(selectedCommentId); // Define this function
        }}
      >
        <Text style={[styles.menuText, { color: 'red' }]}>Delete Comment</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
</Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f9fafb',
    paddingBottom: 80,
    paddingTop:50
  },
  image: {
    width: '100%',
    height: 260,
    borderRadius: 20,
    marginBottom: 16,
  },
  headerBlock: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom:20
  },
  averageText: {
    fontSize: 16,
    marginLeft: 4,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  price: {
    fontSize: 18,
    color: '#10b981',
    fontWeight: '700',
  },
  calories: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginTop: 8,
  },
  readMoreText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop:20,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  writeButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  writeButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
card: {
  width: cardWidth,
  padding: 18,
  backgroundColor: '#ffffff',
  borderRadius: 20,
  borderColor: '#e5e7eb',
  borderWidth: 1,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 6,
  elevation: 2,
  marginHorizontal: 0,
  position: 'relative',   // ✅ IMPORTANT
  zIndex: 1,
  marginBottom:5   
},


  user: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  feedbackText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginVertical: 6,
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#3b82f6',
    width: 10,
    height: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    padding: 24,
    width: '90%',
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111827',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 14,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
cardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
},

  dropdown: {
    position: 'absolute',
    top: 25,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    elevation: 5,
    zIndex: 10,
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#1f2937',
  },
  macrosRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 12,
  marginBottom: 20,
},
macroItem: {
  fontSize: 15,
  color: '#6b7280',
  fontWeight: '500',
  flex: 1,
  textAlign: 'center',
},
noFeedbackText: {
  marginTop: 8,
  fontSize: 14,
  color: '#6b7280',
  textAlign: 'center',
  marginBottom:20
},

});

