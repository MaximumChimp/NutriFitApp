import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  BackHandler,
  Dimensions,
  Modal,
  ActivityIndicator,
  DeviceEventEmitter 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { useMealUpdate } from '../../../context/MealUpdateContext';
import { getAuth } from 'firebase/auth';
import moment from 'moment';
import EstimateMeal from './EstimateMeal.jsx/EstimateMeal';
const auth = getAuth();
const { width } = Dimensions.get('window');

const dynamicTitles = {
  morning: { Breakfast: ["Good morning! What’s for breakfast?", "Start your day right", "Morning fuel: Log your meal"], Snack: ["Morning snack time", "Quick bite before lunch?"] },
  afternoon: { Lunch: ["Time for lunch", "Midday meal tracker", "Fuel your afternoon"], Snack: ["Afternoon snack", "Light bite before dinner?"] },
  evening: { Dinner: ["Dinner time", "Evening nourishment", "Log your last meal of the day"] },
  default: { Breakfast: ["Log your meal"], Lunch: ["Log your meal"], Dinner: ["Log your meal"] },
};

export default function LogFoodModal({ navigation }) {
  const { triggerMealUpdate } = useMealUpdate();
  const route = useRoute();
  const { mealToEdit, mealData, mealIndex } = route.params || {};
  const baseMeal = mealToEdit || mealData || {};
const [image, setImage] = useState(baseMeal.image ? { uri: baseMeal.image } : null);
const [foodName, setFoodName] = useState(baseMeal.name || '');
const [recipe, setRecipe] = useState(baseMeal.recipe || '');
const [kcal, setKcal] = useState(baseMeal.calories?.toString() || '');
const [carbs, setCarbs] = useState(baseMeal.macros?.carbs?.toString() || '');
const [protein, setProtein] = useState(baseMeal.macros?.protein?.toString() || '');
const [fat, setFat] = useState(baseMeal.macros?.fat?.toString() || '');

  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [dynamicTitle, setDynamicTitle] = useState('');
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [estimateMealName, setEstimateMealName] = useState('');
  const [estimateRecipe, setEstimateRecipe] = useState('');
  const [estimating, setEstimating] = useState(false);

  const validMealTypes = ['Breakfast', 'Lunch', 'Dinner'];

  const getMealTypeByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Breakfast';
    if (hour >= 11 && hour < 17) return 'Lunch';
    return 'Dinner';
  };

  const [mealType, setMealType] = useState(
    baseMeal.mealType || getMealTypeByTime()
  );

  // const [mealType, setMealType] = useState(mealToEdit?.mealType || getMealTypeByTime());

  const getTimeSegment = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 17) return 'afternoon';
    if (hour >= 17 || hour < 5) return 'evening';
    return 'default';
  };

  const getDynamicTitle = () => {
    if (mealToEdit) return "Update your meal";
    const segment = getTimeSegment();
    const safeMealType = validMealTypes.includes(mealType) ? mealType : "Breakfast";
    const mealTitles = dynamicTitles[segment]?.[safeMealType] || dynamicTitles.default[safeMealType] || ["Log your meal"];
    const randomIndex = Math.floor(Math.random() * mealTitles.length);
    return mealTitles[randomIndex];
  };

  useEffect(() => { setDynamicTitle(getDynamicTitle()); }, [mealType]);

  useEffect(() => {
    (async () => {
      const camStatus = await ImagePicker.requestCameraPermissionsAsync();
      const mediaStatus = await MediaLibrary.requestPermissionsAsync();
      if (camStatus.status === 'granted' && mediaStatus.status === 'granted') {
        setPermissionsGranted(true);
      } else { Alert.alert('Permissions Needed', 'Camera and media access are required.'); }
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => { navigation.goBack(); return true; };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigation])
  );

  const saveImageToLocal = async (imageUri) => {
    const filename = imageUri.split('/').pop();
    const newPath = `${FileSystem.documentDirectory}${filename}`;
    try { await FileSystem.copyAsync({ from: imageUri, to: newPath }); return newPath; } 
    catch (error) { console.error('Error saving image locally:', error); return null; }
  };

  const pickImage = async (fromCamera = false) => {
    if (!permissionsGranted) return;
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: true });

    if (!result.canceled) {
      const asset = result.assets[0];
      const localPath = await saveImageToLocal(asset.uri);
      if (localPath) setImage({ uri: localPath });
      else Alert.alert('Error', 'Could not save image locally.');
    }
  };

const handleSave = async () => {
  const uid = auth?.currentUser?.uid;
  if (!foodName || !kcal) {
    Alert.alert('Missing Info', 'Please enter at least food name and calories.');
    return;
  }
  if (!uid) {
    Alert.alert('Not signed in', 'Please sign in to save meals.');
    return;
  }

  const now = new Date();
  const isEdit = !!mealToEdit;
  const id = isEdit ? mealToEdit.id : `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  const newMeal = {
    id,
    name: foodName,
    recipe,
    image: image?.uri || null,
    timestamp: isEdit ? mealToEdit.timestamp : now.toLocaleString(),
    calories: parseInt(kcal) || 0,
    macros: {
      carbs: parseInt(carbs) || 0,
      protein: parseInt(protein) || 0,
      fat: parseInt(fat) || 0,
    },
    mealType,
    createdAt: isEdit ? mealToEdit.createdAt : now.toISOString(),
    synced: false,
  };

  try {
    // ✅ Step 1: If this came from ordered meals, remove it there
    if (mealData) {
      const orderedKey = `${uid}_orderedMeals`;
      const existing = await AsyncStorage.getItem(orderedKey);
      const parsed = existing ? JSON.parse(existing) : [];

      const updated = parsed.filter(
        (m) => m.id !== mealData.id && m.name !== mealData.name
      );

      await AsyncStorage.setItem(orderedKey, JSON.stringify(updated));

      // 🔥 Emit update so other screens refresh
      DeviceEventEmitter.emit('orderedMealsUpdated');
    }

    // ✅ Step 2: Save to logged meals
    const storageKey = `${uid}_loggedMeals_${mealType}`;
    const stored = await AsyncStorage.getItem(storageKey);
    let meals = stored ? JSON.parse(stored) : [];

    if (isEdit) meals = meals.map((m) => (m.id === id ? newMeal : m));
    else meals.push(newMeal);

    await AsyncStorage.setItem(storageKey, JSON.stringify(meals));
    await AsyncStorage.setItem('lastLoggedDate', moment().format('YYYY-MM-DD'));

    // ✅ Emit another event for general meal updates (optional)
    DeviceEventEmitter.emit('loggedMealsUpdated');

    triggerMealUpdate?.();
    navigation.goBack?.();
  } catch (error) {
    console.error('Save error:', error);
    Alert.alert('Error', 'Failed to save meal locally.');
  }
};




  const handleEstimate = () => {
    setEstimateMealName(foodName);
    setEstimateRecipe(recipe);
    setShowEstimateModal(true);
  };

const handleConfirmEstimate = async () => {
  if (!estimateMealName) {
    Alert.alert('Missing Info', 'Please enter a meal name for estimation.');
    return;
  }

  setEstimating(true);

  try {
    const result = await EstimateMeal(estimateMealName, estimateRecipe);

    if (result) {
      // Fill main inputs with estimated values
      setFoodName(estimateMealName);
      setRecipe(estimateRecipe);
      setKcal(result.calories?.toString() || '');
      setProtein(result.protein?.toString() || '');
      setCarbs(result.carbs?.toString() || '');
      setFat(result.fat?.toString() || '');
    } else {
      Alert.alert('Error', 'Failed to estimate meal.');
    }
  } catch (err) {
    console.error('Estimation error:', err);
    Alert.alert('Error', 'Failed to estimate meal.');
  } finally {
    setEstimating(false);
    setShowEstimateModal(false);
  }
};

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>{dynamicTitle}</Text>
      </View>

      <View style={styles.inner}>
        {/* Meal Type Tabs */}
        <View style={styles.tabContainer}>
          {['Breakfast', 'Lunch', 'Dinner'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.tabButton, mealType === type && styles.activeTab]}
              onPress={() => setMealType(type)}
            >
              <Text style={[styles.tabText, mealType === type && styles.activeTabText]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Image Section */}
<View style={styles.photoSection}>
  {image ? (
    <View style={styles.imageWrapper}>
      <Image source={{ uri: image.uri }} style={styles.preview} />
      <TouchableOpacity
        style={styles.deleteIcon}
        onPress={() => setImage(null)}
      >
        <Ionicons name="close-circle" size={40} color="#ef4444" />
      </TouchableOpacity>
    </View>
  ) : (
    <View style={styles.photoOptions}>
      <TouchableOpacity style={styles.flatBtn} onPress={() => pickImage(true)}>
        <Text style={styles.flatBtnText}>Take a Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.flatBtn} onPress={() => pickImage(false)}>
        <Text style={styles.flatBtnText}>Choose from Gallery</Text>
      </TouchableOpacity>
    </View>
  )}
</View>

       {/* Inputs (disabled when modal open) */}
<TextInput
  style={[
    styles.input,
    showEstimateModal && { opacity: 0.6 },
  ]}
  placeholder="Meal name (e.g., Grilled Chicken Salad)"
  value={foodName}
  onChangeText={setFoodName}
  editable={!showEstimateModal}
/>

<TextInput
  style={[
    styles.input,
    { height: 90, textAlignVertical: 'top' },
    showEstimateModal && { opacity: 0.6 },
  ]}
  placeholder="Recipe or Description"
  value={recipe}
  multiline
  onChangeText={setRecipe}
  editable={!showEstimateModal}
/>

        <Text style={styles.sectionTitle}>Nutrition Info</Text>

        <View style={styles.section}>
  <Text style={styles.label}>Calories (kcal)</Text>
  <TextInput
    style={styles.input}
    keyboardType="numeric"
    value={kcal}
    onChangeText={setKcal}
  />
</View>

<View style={styles.macroRow}>
  <View style={{ flex: 1 }}>
    <Text style={styles.label}>Carbs (g)</Text>
    <TextInput
      style={styles.macroInput}
      keyboardType="numeric"
      value={carbs}
      onChangeText={setCarbs}
    />
  </View>
  <View style={{ flex: 1 }}>
    <Text style={styles.label}>Protein (g)</Text>
    <TextInput
      style={styles.macroInput}
      keyboardType="numeric"
      value={protein}
      onChangeText={setProtein}
    />
  </View>
  <View style={{ flex: 1 }}>
    <Text style={styles.label}>Fat (g)</Text>
    <TextInput
      style={styles.macroInput}
      keyboardType="numeric"
      value={fat}
      onChangeText={setFat}
    />
  </View>
</View>


        <TouchableOpacity onPress={handleEstimate}>
          <Text style={styles.estimateLink}>Need help? Estimate with AI</Text>
        </TouchableOpacity>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.mainCancelBtn]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.mainSaveBtn]}
            onPress={handleSave}
          >
            <Text style={styles.saveText}>Save Meal</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal */}
      <Modal visible={showEstimateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Estimate Meal</Text>

            <TextInput
              style={styles.input}
              placeholder="Meal Name"
              value={estimateMealName}
              onChangeText={setEstimateMealName}
            />

            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Recipe / Ingredients"
              multiline
              value={estimateRecipe}
              onChangeText={setEstimateRecipe}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowEstimateModal(false);
                  setFoodName(estimateMealName);
                  setRecipe(estimateRecipe);
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.confirmBtn]}
                onPress={handleConfirmEstimate}
                disabled={estimating}
              >
                {estimating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>Estimate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

}


const styles = StyleSheet.create({
  container: { backgroundColor: '#f8fafc', flexGrow: 1, paddingBottom: 60 },
  banner: {
    width,
    backgroundColor: '#22c55e',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop:30,
    lineHeight: 28,
  },
  inner: { paddingHorizontal: 22, marginTop: 25 },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#eef2f6',
    borderRadius: 25,
    padding: 4,
    marginBottom: 22,
  },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  activeTab: { backgroundColor: '#22c55e' },
  tabText: { fontSize: 15, color: '#555555', fontWeight: '500' },
  activeTabText: { color: '#fff' },
  photoSection: { marginBottom: 20 },
  photoOptions: { alignItems: 'center', gap: 10 },
  flatBtn: {
    width: '100%',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    alignItems: 'center',
  },
  flatBtnText: { color: '#555555', fontWeight: '600', fontSize: 15 },
  preview: { width: '100%', height: 220, borderRadius: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#555555', marginBottom: 10 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  macroInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  estimateLink: {
    color: '#15803d',
    textAlign: 'right',
    marginTop: 8,
    fontWeight: '500',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    padding: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#555555', marginBottom: 15 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 15,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#e5e7eb',
  },
  confirmBtn: {
    backgroundColor: '#22c55e',
  },
  cancelText: {
    color: '#555555',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  mainCancelBtn: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  mainSaveBtn: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  imageWrapper: {
  position: 'relative',
},
deleteIcon: {
  position: 'absolute',
  top: -18,
  right: -14,
  zIndex: 10,
},

});

