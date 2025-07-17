import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  Alert,
  Modal,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRoute } from "@react-navigation/native";

const { width } = Dimensions.get("window");

  const steps = [
    "Let’s start with your name.",
    "What’s your Last Name?",
    "What is your Gender?",
    "Weight",
    "Height",
    "What is your goal?",
    "Target Weight Change",
    "What is your Activity level?",
    "Do you have any health conditions?",
    "Allergy Details",
    "Medications",
    "When is your Birthday?",
  ];


const calculateAge = (birthdayString) => {
  const birthDate = new Date(birthdayString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

const convertFtInToCm = (ftInStr) => {
  const match = ftInStr.match(/(\d+)' (\d+)"/);
  if (!match) return null;
  const feet = parseInt(match[1]);
  const inches = parseInt(match[2]);
  return (feet * 12 + inches) * 2.54;
};

export default function OnboardingScreen({ navigation }) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(true);
  const [agreed, setAgreed] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCurrentStepValid, setIsCurrentStepValid] = useState(false);
  const [isAuthPromptVisible, setAuthPromptVisible] = useState(false);
  const [showCustomGoalOptions, setShowCustomGoalOptions] = useState(false);
  const [showHealthWarning, setShowHealthWarning] = useState(false);

const [userData, setUserData] = useState({
  firstName: "",
  lastName: "",
  Age: "",
  Goal: "",
  Gender: "",
  Birthday: "",
  Height: "",
  Weight: "",
  WeightUnit: "kg",
  HeightUnit: "cm",
  HeightFtIn: "",
  TargetKg: "",
  TargetKgUnit: "kg",
  Activity: "",
  HealthConditions: [],
  OtherHealthCondition: "",
  AllergyDetails: "",
  AllergyMedications: "",
  Allergies: [],            // <-- Add this line
  OtherAllergy: "",         // <-- And this
  Medications: [],
  OtherMedication: "",
});



  const derivedSteps = [...steps];
if (
  userData.HealthConditions?.includes("Allergies") &&
  !derivedSteps.includes("Allergy Details")
) {
  derivedSteps.splice(9, 0, "Allergy Details"); // Insert before Birthday
}


  const route = useRoute();
  const cameFromLogin = route.params?.fromLogin === true;

  useEffect(() => {
    const animate = () => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    };
    if (modalVisible || isAuthPromptVisible) animate();
    else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [modalVisible, isAuthPromptVisible]);

  const handleAgree = () => {
    setAgreed(true);
    setModalVisible(false);
  };

  const handleDisagree = () => {
    setModalVisible(false);
    setTimeout(() => {
      if (cameFromLogin) navigation.replace("Login");
      else navigation.replace("Landing");
    }, 300);
  };

  const calculateBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  return weightKg / (h * h);
};


const toggleMedication = (medication) => {
  const current = userData.Medications;
  if (current.includes(medication)) {
    setUserData({
      ...userData,
      Medications: current.filter((m) => m !== medication),
    });
  } else {
    // Remove "None" if adding another item
    const newSelection = medication === "None" ? ["None"] : current.filter((m) => m !== "None").concat(medication);
    setUserData({
      ...userData,
      Medications: newSelection,
    });
  }
};


  const handleInputChange = (key, value) => {
    setUserData((prev) => ({ ...prev, [key]: value }));
  };

const toggleHealthCondition = (condition) => {
  const current = userData.HealthConditions;
  let updated = [...current];

  if (condition === "None") {
    // If selecting None: clear all others
    updated = current.includes("None") ? [] : ["None"];
  } else {
    // Remove "None" if another condition is selected
    updated = updated.filter((c) => c !== "None");

    if (current.includes(condition)) {
      // Deselect condition
      updated = updated.filter((c) => c !== condition);
    } else {
      updated.push(condition);
    }
  }

  setUserData({
    ...userData,
    HealthConditions: updated,
  });
};


  useEffect(() => {
    const valid = validateStep(false);
    setIsCurrentStepValid(valid);
  }, [userData, currentStep]);

const validateStep = (showAlerts = true) => {
  const key = derivedSteps[currentStep];

  if (key === steps[0] && (!userData.firstName || userData.firstName.trim().length < 2)) {
    showAlerts && Alert.alert("Enter your first name.");
    return false;
  }

  if (key === steps[1] && (!userData.lastName || userData.lastName.trim().length < 2)) {
    showAlerts && Alert.alert("Enter your last name.");
    return false;
  }

  if (key === steps[2] && !userData.Gender) {
    showAlerts && Alert.alert("Select gender.");
    return false;
  }

  if (key === steps[3]) {
    const weight = parseFloat(userData.Weight);
    if (!weight || weight < 20 || weight > 500) {
      showAlerts && Alert.alert("Enter valid weight.");
      return false;
    }
  }

  if (key === steps[4]) {
    if (userData.HeightUnit === "cm") {
      const height = parseFloat(userData.Height);
      if (!height || height < 50 || height > 300) {
        showAlerts && Alert.alert("Enter valid height in cm.");
        return false;
      }
    } else if (!userData.HeightFtIn) {
      showAlerts && Alert.alert("Select height in ft/in.");
      return false;
    }
  }

  if (key === steps[5] && !userData.Goal) {
    showAlerts && Alert.alert("Select your goal.");
    return false;
  }

  if (key === steps[6]) {
    const target = parseFloat(userData.TargetKg);
    if (!target || target <= 0) {
      showAlerts && Alert.alert("Enter a valid target weight.");
      return false;
    }

    const weight = parseFloat(userData.Weight);
    let targetKg = target;
    if (userData.TargetKgUnit === "lb") {
      targetKg *= 0.453592;
    }

    if (userData.Goal === "Weight Loss" && targetKg >= weight) {
      showAlerts && Alert.alert("Target must be lower than current weight.");
      return false;
    }

    if (userData.Goal === "Weight Gain" && targetKg <= weight) {
      showAlerts && Alert.alert("Target must be higher than current weight.");
      return false;
    }
  }

  if (key === steps[7] && !userData.Activity) {
    showAlerts && Alert.alert("Select activity level.");
    return false;
  }

  if (key === steps[8]) {
    const selected = userData.HealthConditions || [];
    if (!selected.length || (selected.includes("None") && selected.length > 1)) {
      showAlerts && Alert.alert("Choose one or 'None'.");
      return false;
    }
    if (selected.includes("Others") && !userData.OtherHealthCondition?.trim()) {
      showAlerts && Alert.alert("Specify other health condition.");
      return false;
    }
  }

  if (key === "Allergy Details") {
    const selected = userData.Allergies || [];
    if (!selected.length || (selected.includes("None") && selected.length > 1)) {
      showAlerts && Alert.alert("Choose one or 'None'.");
      return false;
    }
    if (selected.includes("Others") && !userData.OtherAllergy?.trim()) {
      showAlerts && Alert.alert("Specify other allergy.");
      return false;
    }
  }

  if (key === "Medications") {
    const selected = userData.Medications || [];
    if (!selected.length || (selected.includes("None") && selected.length > 1)) {
      showAlerts && Alert.alert("Choose one or 'None'.");
      return false;
    }
    if (selected.includes("Others") && !userData.OtherMedication?.trim()) {
      showAlerts && Alert.alert("Specify other medication.");
      return false;
    }
  }

  if (key === "Birthday" && !userData.Birthday) {
    showAlerts && Alert.alert("Select your birthday.");
    return false;
  }

  return true;
};




const handleNext = () => {
  if (!validateStep(true)) return;

  const key = derivedSteps[currentStep];
  const nextKey = steps[currentStep + 1];

  // ✅ BMI Goal Alert Logic
  if (key === "What is your goal?") {
    const heightCm =
      userData.HeightUnit === "cm"
        ? parseFloat(userData.Height)
        : convertFtInToCm(userData.HeightFtIn);

    const weightKg =
      userData.WeightUnit === "kg"
        ? parseFloat(userData.Weight)
        : parseFloat(userData.Weight) * 0.453592;

    const bmi = calculateBMI(weightKg, heightCm);
    let suggestedGoal = null;

    if (bmi) {
      if (bmi < 18.5) suggestedGoal = "Weight Gain";
      else if (bmi >= 18.5 && bmi < 25) suggestedGoal = "Maintain my current weight";
      else suggestedGoal = "Weight Loss";
    }

    if (
      userData.Goal !== suggestedGoal &&
      userData.Goal !== "Maintain my current weight"
    ) {
      Alert.alert(
        "Are you sure?",
        `The suggested goal based on your BMI is "${suggestedGoal}". Do you want to continue with "${userData.Goal}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            onPress: () => {
              if (userData.Goal === "Maintain my current weight") {
                setCurrentStep((prev) => prev + 2); // Skip target weight
              } else {
                setCurrentStep((prev) => prev + 1);
              }
            },
          },
        ]
      );
      return;
    }

    // If not showing alert and goal is maintain, skip next step
    if (userData.Goal === "Maintain my current weight") {
      setCurrentStep((prev) => prev + 2);
      return;
    }
  }

  // ✅ Skip "Allergy Details" if "Allergies" not selected
if (key === "Do you have any health conditions?") {
  const selectedConditions = userData.HealthConditions.filter(
    (c) => c !== "None"
  );
  
  // Show modal if 2+ conditions selected
  if (selectedConditions.length >= 2) {
    setShowHealthWarning(true);
    return;
  }

  // Handle Allergy skip
  const hasAllergies = userData.HealthConditions.includes("Allergies");
  const nextStep = steps[currentStep + 1];
  if (!hasAllergies && nextStep === "Allergy Details") {
    setCurrentStep((prev) => prev + 2);
    return;
  }
}

  // ✅ Allergy step validation
  if (key === "Allergy Details") {
    const selected = userData.Allergies || [];

    if (selected.length === 0) {
      Alert.alert("Please select at least one allergy.");
      return;
    }

    if (selected.includes("Others") && !userData.OtherAllergy?.trim()) {
      Alert.alert("Please specify your allergy under 'Others'.");
      return;
    }
  }

  // ✅ Final step: submit and set age, height
  if (currentStep < steps.length - 1) {
    setCurrentStep((prev) => prev + 1);
  } else {
    const age = calculateAge(userData.Birthday);
    let finalHeight = userData.Height;

    if (userData.HeightUnit === "ftin") {
      finalHeight = convertFtInToCm(userData.HeightFtIn);
    }

    setUserData((prev) => ({
      ...prev,
      Age: age,
      Height: finalHeight,
      HeightUnit: "cm",
    }));

    setAuthPromptVisible(true);
  }
};





const handleBack = () => {
  if (currentStep === 0) return;

  const key = derivedSteps[currentStep];
  const prevKey = steps[currentStep - 1];

  // If user is at Allergy Details but doesn't have allergies, skip back
  if (key === "Allergy Details" && !userData.HealthConditions.includes("Allergies")) {
    setCurrentStep((prev) => prev - 2);
    return;
  }

  // If previous step is Allergy Details and user doesn't have allergies, skip it
  if (prevKey === "Allergy Details" && !userData.HealthConditions.includes("Allergies")) {
    setCurrentStep((prev) => prev - 2);
    return;
  }

  // If coming back from skipping "Target Weight" when goal is Maintain
  if (
    key === "Target Weight" &&
    userData.Goal === "Maintain my current weight"
  ) {
    setCurrentStep((prev) => prev - 2);
    return;
  }

  setCurrentStep((prev) => prev - 1);
};



useEffect(() => {
  const key = derivedSteps[currentStep];
  if (key === "What is your goal?") {
    setShowCustomGoalOptions(false);
  }
}, [currentStep]);
const renderStep = () => {
  const key = derivedSteps[currentStep];

  if (key === "Let’s start with your name.") {
    return (
      <>
        <Text style={styles.subtitle}>
          Hi! We'd like to get to know you to make the NutriFit app personalized to you.
        </Text>
        <TextInput
          placeholder="Enter your first name"
          value={userData.firstName}
          onChangeText={(text) => handleInputChange("firstName", text)}
          style={styles.input}
          placeholderTextColor="#9ca3af"
        />
      </>
    );
  }

  if (key === "What’s your Last Name?") {
    return (
      <TextInput
        placeholder="Enter your last name"
        value={userData.lastName}
        onChangeText={(text) => handleInputChange("lastName", text)}
        style={styles.input}
        placeholderTextColor="#9ca3af"
      />
    );
  }

  if (key === "What is your Gender?") {
    return (
      <View style={styles.genderGrid}>
        {["Male", "Female"].map((gender) => (
          <TouchableOpacity
            key={gender}
            style={[
              styles.genderBox,
              userData.Gender === gender && styles.genderBoxSelected,
            ]}
            onPress={() => handleInputChange("Gender", gender)}
          >
            <Ionicons
              name={gender === "Male" ? "male" : "female"}
              size={32}
              color={userData.Gender === gender ? "#fff" : "#4b5563"}
              style={{ marginBottom: 8 }}
            />
            <Text
              style={[
                styles.genderText,
                userData.Gender === gender && styles.genderTextSelected,
              ]}
            >
              {gender}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (key === "Weight") {
    return (
      <View style={styles.inlineRow}>
        <TextInput
          placeholder="Weight"
          value={userData.Weight}
          onChangeText={(text) =>
            handleInputChange("Weight", text.replace(/[^0-9.]/g, ""))
          }
          style={styles.weightInput}
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={userData.WeightUnit}
            onValueChange={(value) => handleInputChange("WeightUnit", value)}
            style={styles.picker}
          >
            <Picker.Item label="kg" value="kg" />
            <Picker.Item label="lb" value="lb" />
          </Picker>
        </View>
      </View>
    );
  }

  if (key === "Height") {
    if (userData.HeightUnit === "cm") {
      return (
        <View style={styles.inlineRow}>
          <TextInput
            placeholder="Height"
            value={userData.Height}
            onChangeText={(text) =>
              handleInputChange("Height", text.replace(/[^0-9.]/g, ""))
            }
            style={styles.smallInput}
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />
          <View style={styles.pickerContainerFixed}>
            <Picker
              selectedValue={userData.HeightUnit}
              onValueChange={(value) => handleInputChange("HeightUnit", value)}
              style={styles.picker}
            >
              <Picker.Item label="cm" value="cm" />
              <Picker.Item label="ft/in" value="ftin" />
            </Picker>
          </View>
        </View>
      );
    }

    const ftInOptions = [];
    for (let ft = 3; ft <= 7; ft++) {
      for (let inch = 0; inch <= 11; inch++) {
        if (ft === 7 && inch > 9) break;
        ftInOptions.push(`${ft}' ${inch}"`);
      }
    }

    return (
      <View style={styles.inlineRow}>
        <View style={styles.fullPickerContainer}>
          <Picker
            selectedValue={userData.HeightFtIn}
            onValueChange={(val) => handleInputChange("HeightFtIn", val)}
            style={styles.picker}
          >
            {ftInOptions.map((label) => (
              <Picker.Item key={label} label={label} value={label} />
            ))}
          </Picker>
        </View>
        <View style={styles.pickerContainerFixed}>
          <Picker
            selectedValue={userData.HeightUnit}
            onValueChange={(value) => handleInputChange("HeightUnit", value)}
            style={styles.picker}
          >
            <Picker.Item label="cm" value="cm" />
            <Picker.Item label="ft/in" value="ftin" />
          </Picker>
        </View>
      </View>
    );
  }

if (key === "What is your goal?") {
  const heightCm =
    userData.HeightUnit === "cm"
      ? parseFloat(userData.Height)
      : convertFtInToCm(userData.HeightFtIn);

  const weightKg =
    userData.WeightUnit === "kg"
      ? parseFloat(userData.Weight)
      : parseFloat(userData.Weight) * 0.453592;

  const bmi = calculateBMI(weightKg, heightCm);

  let suggestedGoal = null;
  if (bmi) {
    if (bmi < 18.5) suggestedGoal = "Weight Gain";
    else if (bmi >= 18.5 && bmi < 25) suggestedGoal = "Maintain my current weight";
    else suggestedGoal = "Weight Loss";
  }

  const manualGoals = [
    "Weight Loss",
    "Maintain my current weight",
    "Weight Gain",
  ];

  return (
    <View style={{ gap: 16 }}>
      <Text style={styles.subtitle}>
        Based on your height and weight, we suggest the goal:{" "}
        <Text style={{ fontWeight: "bold", color: "#14532d" }}>{suggestedGoal}</Text>
      </Text>

      <View style={styles.goalGrid}>
        {manualGoals.map((opt) => {
          const isDisabled =
          !showCustomGoalOptions &&
          opt !== suggestedGoal &&
          opt !== "Maintain my current weight";

          const isSelected = userData.Goal === opt;

          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.goalBox,
                isSelected && styles.goalBoxSelected,
                isDisabled && { backgroundColor: "#e5e7eb", borderColor: "#d1d5db" },
              ]}
              onPress={() => !isDisabled && handleInputChange("Goal", opt)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.goalText,
                  isSelected && styles.goalTextSelected,
                  isDisabled && { color: "#9ca3af" },
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!showCustomGoalOptions && (
       <TouchableOpacity
          onPress={() => {
            handleInputChange("Goal", ""); // reset selected goal
            setShowCustomGoalOptions(true); // enable all options
          }}
        >
          <Text style={{ textAlign: "center", color: "#2563eb", marginTop: 10 }}>
            I prefer to choose my goal manually
          </Text>
        </TouchableOpacity>

      )}
    </View>
  );
}


  if (key === "Target Weight Change") {
    if (userData.Goal === "Maintain my current weight") {
      return null; // Skip rendering this step entirely
    }
    let prompt = "What's your target weight?";
    if (userData.Goal === "Weight Loss") {
      prompt = "Let’s set your target weight for your weight loss goal";
    } else if (userData.Goal === "Weight Gain") {
      prompt = "Let’s set your target weight for your gain journey.";
    }

    return (
      <>
        <Text style={styles.subtitle}>{prompt}</Text>
        <View style={styles.inlineRow}>
          <TextInput
            placeholder="Weight"
            value={userData.TargetKg}
            onChangeText={(text) =>
              handleInputChange("TargetKg", text.replace(/[^0-9.]/g, ""))
            }
            style={styles.targetInput}
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />
          <View style={styles.targetPickerContainer}>
            <Picker
              selectedValue={userData.TargetKgUnit || "kg"}
              onValueChange={(value) =>
                handleInputChange("TargetKgUnit", value)
              }
              style={styles.picker}
            >
              <Picker.Item label="kg" value="kg" />
              <Picker.Item label="lb" value="lb" />
            </Picker>
          </View>
        </View>
      </>
    );
  }


    if (key === "What is your Activity level?") {
      const activityOptions = [
        {
          label: "Sedentary",
          description:
            "Little to no physical activity (e.g., sitting most of the day)",
        },
        {
          label: "Low Active",
          description: "Light daily activity like walking or light chores",
        },
        {
          label: "Active",
          description: "Regular moderate exercise or active job",
        },
        {
          label: "Very Active",
          description: "Intense exercise or physically demanding work",
        },
      ];

      return (
        <>
        <View style={styles.activityGroup}>
          {activityOptions.map(({ label, description }) => (
            <TouchableOpacity
              key={label}
              style={[
                styles.activityCard,
                userData.Activity === label && styles.activityCardSelected,
              ]}
              onPress={() => handleInputChange("Activity", label)}
            >
              <Text
                style={[
                  styles.activityLabel,
                  userData.Activity === label && styles.activityLabelSelected,
                ]}
                
              >
                {label}
              </Text>
              <Text
                style={[
                  styles.activityDescription,
                  userData.Activity === label &&
                    styles.activityDescriptionSelected,
                ]}
              >
                {description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        </>
      );
    }

if (key === "Do you have any health conditions?") {
  const options = [
    "Diabetes",
    "Hypertension",
    "Heart Disease",
    "Kidney Disease",
    "Thyroid Disorder",
    "Allergies",
    "None",
    "Others",
  ];

  const hasCondition = (cond) => userData.HealthConditions.includes(cond);

  return (
    <View style={{ marginBottom: 20 }}>
      {options.map((condition) => {
        const isChecked = hasCondition(condition);
        return (
          <TouchableOpacity
            key={condition}
            style={styles.checkboxRow}
            onPress={() => toggleHealthCondition(condition)}
          >
            <View style={[styles.checkbox, isChecked && styles.checkedBox]}>
              {isChecked && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>{condition}</Text>
          </TouchableOpacity>
        );
      })}

      {/* Show input if "Others" is selected */}
      {hasCondition("Others") && (
        <TextInput
          placeholder="Please specify"
          value={userData.OtherHealthCondition || ""}
          onChangeText={(text) =>
            setUserData((prev) => ({
              ...prev,
              OtherHealthCondition: text,
            }))
          }
           style={{
              borderBottomWidth: 1,
              borderBottomColor: "#ccc",
              marginTop: 10,
              paddingVertical: 6,
              fontSize: 16,
              color: "#000",
            }}
          placeholderTextColor="#aaa"
        />
      )}
    </View>
  );
}


if (key === "Medications") {
  const medicationOptions = [
    "Aspirin",
    "Metformin",
    "Lisinopril",
    "Statins",
    "Insulin",
    "None",
    "Others",
  ];

  const hasMedication = (med) => userData.Medications.includes(med);

  return (
    <View>
      <Text style={styles.subtitle}>Select any medications you are currently taking:</Text>
      {medicationOptions.map((med) => (
        <TouchableOpacity
          key={med}
          style={styles.checkboxRow}
          onPress={() => toggleMedication(med)}
        >
          <View style={[styles.checkbox, hasMedication(med) && styles.checkedBox]}>
            {hasMedication(med) && (
              <Ionicons name="checkmark" size={14} color="#fff" />
            )}
          </View>
          <Text style={styles.checkboxLabel}>{med}</Text>
        </TouchableOpacity>
      ))}
      {userData.Medications.includes("Others") && (
        <TextInput
          placeholder="Please specify other medications"
          value={userData.OtherMedication}
          onChangeText={(text) => handleInputChange("OtherMedication", text)}
          style={[styles.inputUnderlineOnly]}
          placeholderTextColor="#9ca3af"
        />

      )}
    </View>
  );
}


if (derivedSteps[currentStep] === "Allergy Details") {
  const allergyOptions = [
    "Peanuts",
    "Shellfish",
    "Shrimp",
    "Chocolates",
    "Eggs",
    "Milk",
    "Wheat",
    "Soy",
    "Others",
  ];

  const hasAllergy = (item) => userData.Allergies?.includes(item);

  const toggleAllergy = (item) => {
    let updated = userData.Allergies || [];

    if (updated.includes(item)) {
      updated = updated.filter((a) => a !== item);
    } else {
      updated.push(item);
    }

    setUserData((prev) => ({ ...prev, Allergies: updated }));
  };

  return (
    <View>
      <Text style={styles.subtitle}>Tell us more about your allergies</Text>

      {/* Allergy Checkbox List */}
      {allergyOptions.map((item) => {
        const checked = hasAllergy(item);
        return (
          <TouchableOpacity
            key={item}
            style={styles.checkboxRow}
            onPress={() => toggleAllergy(item)}
          >
            <View style={[styles.checkbox, checked && styles.checkedBox]}>
              {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>{item}</Text>
          </TouchableOpacity>
        );
      })}

      {/* Show "Other" allergy text input */}
      {hasAllergy("Others") && (
        <TextInput
          placeholder="Please specify your allergy"
          value={userData.OtherAllergy || ""}
          onChangeText={(text) =>
            setUserData((prev) => ({ ...prev, OtherAllergy: text }))
          }
          style={{
            borderBottomWidth: 1,
            borderBottomColor: "#ccc",
            marginTop: 10,
            paddingVertical: 6,
            fontSize: 16,
            color: "#000",
          }}
          placeholderTextColor="#aaa"
        />
      )}

    </View>
  );
}

  if (key === "When is your Birthday?") {
    return (
      <>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: userData.Birthday ? "#111827" : "#9ca3af" }}>
            {userData.Birthday
              ? new Date(userData.Birthday).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "Select your birthday"}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={
              userData.Birthday
                ? new Date(userData.Birthday)
                : new Date("2000-01-01")
            }
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === "ios");
              if (selectedDate) {
                const dateOnly = selectedDate.toISOString().split("T")[0];
                handleInputChange("Birthday", dateOnly);
              }
            }}
          />
        )}
      </>
    );
  }

  return (
    <TextInput
      placeholder={`Enter your ${key}`}
      value={userData[key]}
      onChangeText={(text) => handleInputChange(key, text)}
      style={styles.input}
      placeholderTextColor="#9ca3af"
    />
  );
};


  return (
    <>
      <Modal visible={modalVisible} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
            <Text style={styles.title}>Before you get started</Text>
            <Text style={styles.consentText}>
              We collect your information (age, height, weight, etc.) solely for the purpose of calculating your
              personalized calorie and nutrition goals.
            </Text>
            <View style={styles.consentButtons}>
              <TouchableOpacity style={styles.agreeButton} onPress={handleAgree}>
                <Text style={styles.agreeText}>Agree</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.disagreeButton} onPress={handleDisagree}>
                <Text style={styles.disagreeText}>Not agree</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          {currentStep > 0 ? (
            <TouchableOpacity onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#14532d" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        <Text style={styles.stepTitle}>{steps[currentStep]}</Text>
        {renderStep()}

        <TouchableOpacity
          style={[styles.button, !isCurrentStepValid && { opacity: 0.5 }]}
          onPress={handleNext}
          disabled={!isCurrentStepValid}
        >
          <Text style={styles.buttonText}>{currentStep === steps.length - 1 ? "Finish" : "Next"}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={isAuthPromptVisible} transparent animationType="none">
        <View style={styles.authModalOverlay}>
          <Animated.View style={[styles.authModalContent, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
            <Text style={styles.authTitle}>Create your NutriFit account</Text>
            <Text style={styles.authText}>
              Sign up to save your progress and start tracking your calories.
            </Text>

            <TouchableOpacity
              style={[styles.authGreenButton, { marginBottom: 20 }]}
              onPress={() => {
                setAuthPromptVisible(false);
                navigation.navigate("SignUpWithEmail", { userData });
              }}
            >
              <View style={styles.googleRow}>
                <Ionicons name="mail-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.authGreenButtonText}>Sign up with Email</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.authGoogleButton}
              onPress={() => {
                setAuthPromptVisible(false);
                navigation.navigate("GoogleSignIn", { userData });
              }}
            >
              <View style={styles.googleRow}>
                <Image
                  source={require("../../../assets/googlelogo.png")}
                  style={[styles.googleLogo, { marginRight: 8 }]}
                />
                <Text style={styles.disagreeText}>Continue with Google</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
<Modal
  animationType="slide"
  transparent={true}
  visible={showHealthWarning}
  onRequestClose={() => setShowHealthWarning(false)}
>
  <View className="flex-1 justify-center items-center bg-black/50 px-4">
    <View className="bg-white rounded-2xl p-6 w-full max-w-md shadow-lg items-center">
      
      {/* Warning Icon */}
      <View className="p-2">
        <Ionicons name="warning" size={40} color="#facc15" />
      </View>

      <Text className="text-lg font-semibold text-center mb-2">
        Health Warning
      </Text>

      <Text className="text-base text-gray-700 mb-6 text-center">
        You've selected multiple health conditions. For your safety, we strongly recommend consulting a healthcare professional before making any major dietary or lifestyle changes.
      </Text>

     <TouchableOpacity
  onPress={() => {
    setShowHealthWarning(false);

    const selectedConditions = userData.HealthConditions?.filter(
      (c) => c !== "None"
    ) || [];

    const hasAllergies = selectedConditions.includes("Allergies");
    const otherConditionsCount = selectedConditions.filter(
      (c) => c !== "Allergies"
    ).length;

    const shouldSkipAllergyStep = !hasAllergies && otherConditionsCount >= 2;

    setCurrentStep((prev) => prev + (shouldSkipAllergyStep ? 2 : 1));
  }}
  style={{ backgroundColor: '#22c55e' }}
  className="rounded-xl py-3 px-6 self-center"
>
  <Text className="text-white font-semibold text-base">Continue</Text>
</TouchableOpacity>

    </View>
  </View>
</Modal>


    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#ffffff",
    padding: 24,
    paddingTop: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#14532d",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
    marginTop: -10,
    paddingHorizontal: 10,
  },
  consentText: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 24,
    lineHeight: 22,
    textAlign: "center",
  },
  consentButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  agreeButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginRight: 8,
  },
  agreeText: {
    color: "#ffff",
    fontWeight: "600",
    fontSize: 16
  },
  disagreeButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginLeft: 8,
  },
  disagreeText: {
    color: "#6b7280",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    width: "100%",
    elevation: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 10,
    marginBottom: 24,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    backgroundColor: "#22c55e",
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#14532d",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#f9fafb",
    marginBottom: 20,
    color: "#111827",
  },
  button: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    textAlign: "center",
  },
  goalGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  goalBox: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginBottom: 12,
  },
  goalBoxSelected: {
    borderColor: "#14532d",
    backgroundColor: "#14532d",
  },
  goalText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
    textAlign: "center",
  },
  goalTextSelected: {
    color: "#fff",
  },
  genderGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  genderBox: {
    width: "45%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  genderBoxSelected: {
    borderColor: "#14532d",
    backgroundColor: "#14532d",
  },
  genderText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  genderTextSelected: {
    color: "#fff",
  },
  activityGroup: {
    gap: 10,
    marginBottom: 20,
  },
  activityCard: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
  },
  activityCardSelected: {
    borderColor: "#14532d",
    backgroundColor: "#14532d",
  },
  activityLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  activityLabelSelected: {
    color: "#fff",
  },
  activityDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  activityDescriptionSelected: {
    color: "#f0fdf4",
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
  },
  weightInput: {
    width: 80,
    height: 60,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 16,
    color: "#111827",
    textAlign: "center",
    backgroundColor: "#f9fafb",
  },
  smallInput: {
    width: 80,
    height: 60,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: "#f9fafb",
    color: "#111827",
    textAlign: "center",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    width: 100,
    height: 60,
    justifyContent: "center",
  },
  pickerContainerFixed: {
    width: 120,
    height: 60,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
  },
  fullPickerContainer: {
    width: 125,
    height: 60,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
  },
  picker: {
    width: "100%",
    height: 60,
  },
  googleRow: {
  flexDirection: "row",
  alignItems: "center", 
  justifyContent: "center",
},
authModalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.7)",
  justifyContent: "center",   
  alignItems: "center",      
  padding: 24,
},

authModalContent: {
  backgroundColor: "#fff",
  borderRadius: 20,
  padding: 30,
  width: "100%",
  maxWidth: 400,             
  elevation: 12,
  alignItems: "center",     
},

authTitle: {
  fontSize: 22,
  fontWeight: "700",
  color: "#14532d",
  marginBottom: 16,
  textAlign: "center",
},

authText: {
  fontSize: 16,
  color: "#374151",
  marginBottom: 24,
  textAlign: "center",
},

authButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  padding: 14,
  borderRadius: 10,
  backgroundColor: "#fff",
  borderColor: "#d1d5db",
  borderWidth: 1,
  marginTop: 10,
},

authButtonText: {
  fontSize: 16,
  color: "#111827",
  fontWeight: "600",
  marginLeft: 8,
},
authGreenButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  padding: 14,
  borderRadius: 10,
  backgroundColor: "#22c55e",
  marginTop: 10,
  width: "100%",      
  maxWidth: 400,         
},

authGreenButtonText: {
  fontSize: 16,
  color: "#fff",
  fontWeight: "600",
  marginLeft: 8,
},
googleButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "#d1d5db",
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 8,
  marginTop: 10,
  width: "100%",     
  maxWidth: 400
},

googleLogo: {
  width: 20,
  height: 20,
  resizeMode: "contain",
  marginRight: 10,
},

googleButtonText: {
  fontSize: 16,
  fontWeight: "500",
  color: "#374151",
},
authEmailText: {
  color: "#374151",
  fontWeight: "500",
  fontSize: 16,
},

targetInput: {
  width: 80,
  height: 60,
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 10,
  paddingHorizontal: 10,
  fontSize: 16,
  color: "#111827",
  textAlign: "center",
  backgroundColor: "#f9fafb",
},

targetPickerContainer: {
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 10,
  backgroundColor: "#f3f4f6",
  width: 100,
  height: 60,
  justifyContent: "center",
},
checkboxRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 12,
},

checkbox: {
  width: 20,
  height: 20,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: "#9ca3af",
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
  backgroundColor: "#fff",
},

checkedBox: {
  backgroundColor: "#22c55e",
  borderColor: "#22c55e",
},

checkboxLabel: {
  fontSize: 16,
  color: "#374151",
},

underlineInput: {
  borderBottomWidth: 1,
  borderColor: "#d1d5db",
  fontSize: 16,
  color: "#111827",
  paddingVertical: 6,
  marginTop: 10,
},
inputUnderlineOnly: {
  borderBottomWidth: 1,
  borderColor: "#ccc",
  paddingVertical: 8,
  paddingHorizontal: 4,
  marginTop: 10,
  fontSize: 16,
  color: "#000",
},

});
