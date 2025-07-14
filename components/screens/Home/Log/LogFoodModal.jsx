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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';

export default function LogFoodModal({ navigation }) {
  const [image, setImage] = useState(null);
  const [foodName, setFoodName] = useState('');
  const [recipe, setRecipe] = useState('');
  const [kcal, setKcal] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState('Breakfast');
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    (async () => {
      const camStatus = await ImagePicker.requestCameraPermissionsAsync();
      const mediaStatus = await MediaLibrary.requestPermissionsAsync();
      if (camStatus.status === 'granted' && mediaStatus.status === 'granted') {
        setPermissionsGranted(true);
      } else {
        Alert.alert('Permissions Needed', 'Camera and media access are required.');
      }
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigation])
  );

  const saveImageToLocal = async (imageUri) => {
    const filename = imageUri.split('/').pop();
    const newPath = `${FileSystem.documentDirectory}${filename}`;

    try {
      await FileSystem.copyAsync({
        from: imageUri,
        to: newPath,
      });
      return newPath; // return saved local path
    } catch (error) {
      console.error('Error saving image locally:', error);
      return null;
    }
  };


  const pickImage = async (fromCamera = false) => {
    if (!permissionsGranted) return;

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.5, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.5, allowsEditing: true });

    if (!result.canceled) {
      const asset = result.assets[0];
      const localPath = await saveImageToLocal(asset.uri);

      if (localPath) {
        setImage({ uri: localPath }); // ✅ Set local URI
      } else {
        Alert.alert('Error', 'Could not save image locally.');
      }
    }
  };

const handleSave = async () => {
  if (!foodName || !kcal) {
    Alert.alert('Missing Info', 'Please enter at least food name and calories.');
    return;
  }

  const now = new Date();
  const timestamp = now.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const newMeal = {
    id: `${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    name: foodName,
    recipe,
    image: image?.uri || null, // ✅ Use the local URI here
    timestamp,
    calories: isNaN(parseInt(kcal)) ? 0 : parseInt(kcal),
    macros: {
      carbs: isNaN(parseInt(carbs)) ? 0 : parseInt(carbs),
      protein: isNaN(parseInt(protein)) ? 0 : parseInt(protein),
      fat: isNaN(parseInt(fat)) ? 0 : parseInt(fat),
    },
    mealType,
    createdAt: now.toISOString(),
    synced: false,
  };

  try {
    const storageKey = `loggedMeals_${mealType}`;
    const stored = await AsyncStorage.getItem(storageKey);
    const meals = stored ? JSON.parse(stored) : [];

    meals.push(newMeal);
    await AsyncStorage.setItem(storageKey, JSON.stringify(meals));

    navigation.goBack();
  } catch (error) {
    console.error('[❌] Error saving meal:', error.message, error);
    Alert.alert('Error', 'Failed to save meal locally.');
  }
};

  const renderTab = (type) => (
    <TouchableOpacity
      key={type}
      style={[styles.tabButton, mealType === type && styles.activeTab]}
      onPress={() => setMealType(type)}
    >
      <Text style={[styles.tabText, mealType === type && styles.activeTabText]}>
        {type}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Log New Food</Text>

      <View style={styles.tabContainer}>
        {['Breakfast', 'Lunch', 'Dinner'].map(renderTab)}
      </View>

      <View style={styles.imageButtonContainer}>
        <TouchableOpacity style={styles.imageOption} onPress={() => pickImage(true)}>
          <Ionicons name="camera" size={20} color="#14532d" />
          <Text style={styles.imageOptionText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.imageOption} onPress={() => pickImage(false)}>
          <Ionicons name="image" size={20} color="#14532d" />
          <Text style={styles.imageOptionText}>Choose from Gallery</Text>
        </TouchableOpacity>
      </View>

      {image && <Image source={{ uri: image.uri }} style={styles.image} />}

      <TextInput style={styles.input} placeholder="Food Name" value={foodName} onChangeText={setFoodName} />
      <TextInput style={styles.input} placeholder="Recipe / Description" value={recipe} onChangeText={setRecipe} />
      <TextInput style={styles.input} placeholder="Calories (kcal)" keyboardType="numeric" value={kcal} onChangeText={setKcal} />

      <Text style={styles.subTitle}>Macros (g)</Text>
      <View style={styles.macroRow}>
        <TextInput style={styles.macroInput} placeholder="Carbs" keyboardType="numeric" value={carbs} onChangeText={setCarbs} />
        <TextInput style={styles.macroInput} placeholder="Protein" keyboardType="numeric" value={protein} onChangeText={setProtein} />
        <TextInput style={styles.macroInput} placeholder="Fat" keyboardType="numeric" value={fat} onChangeText={setFat} />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Meal</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#14532d',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#22c55e',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#14532d',
    fontWeight: '600',
  },
  imageButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  imageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    padding: 10,
    borderRadius: 10,
    flex: 1,
    marginRight: 6,
  },
  imageOptionText: {
    marginLeft: 8,
    color: '#14532d',
    fontWeight: '500',
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 12,
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  macroInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    width: '30%',
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  saveButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
