import React, { useState } from "react";
import { FontAwesome } from '@expo/vector-icons';


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
  Easing
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRoute } from "@react-navigation/native";
import { useEffect } from "react";

const { width } = Dimensions.get("window");




const steps = [
  "Let’s start with your name.",
  "Setting Up Your Profile",
  "What is your goal?",
  "Target Weight Change",
  "What is your Gender?",
  "What is your Activity level?",
  "Weight",
  "Height",
  "When is your Birthday?",
];

const calculateAge = (birthdayString) => {
  const birthDate = new Date(birthdayString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

const convertFtInToCm = (ftInStr) => {
  const match = ftInStr.match(/(\d+)' (\d+)"/);
  if (!match) return null;

  const feet = parseInt(match[1]);
  const inches = parseInt(match[2]);
  const totalInches = feet * 12 + inches;
  const cm = totalInches * 2.54;
  return cm.toFixed(1); 
};

export default function OnboardingScreen({ navigation }) {
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
const opacityAnim = React.useRef(new Animated.Value(0)).current;
  
  const [agreed, setAgreed] = useState(null);
  const [modalVisible, setModalVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCurrentStepValid, setIsCurrentStepValid] = useState(false);
  const [isAuthPromptVisible, setAuthPromptVisible] = useState(false);
  const [userData, setUserData] = useState({
    Name: "",
    Age: "",
    Gender: "",
    Birthday: "",
    Height: "",
    HeightFtIn: "3' 0\"",
    HeightUnit: "cm",
    Weight: "",
    WeightUnit: "kg",
    Activity: "",
    Goal: "",
    TargetKg: "",          
    TargetKgUnit: "kg",     
  });
  const route = useRoute();
const cameFromLogin = route.params?.fromLogin === true;

React.useEffect(() => {
  if (modalVisible || isAuthPromptVisible) {
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
  } else {
    scaleAnim.setValue(0.8);
    opacityAnim.setValue(0);
  }
}, [modalVisible, isAuthPromptVisible]);


//   React.useEffect(() => {
//   if (modalVisible) {
//     Animated.parallel([
//       Animated.timing(scaleAnim, {
//         toValue: 1,
//         duration: 300,
//         useNativeDriver: true,
//         easing: Easing.out(Easing.exp),
//       }),
//       Animated.timing(opacityAnim, {
//         toValue: 1,
//         duration: 300,
//         useNativeDriver: true,
//       }),
//     ]).start();
//   }
// }, [modalVisible]);

  const handleAgree = () => {
    setAgreed(true);
    setModalVisible(false);
  };


  const handleDisagree = () => {
    setModalVisible(false);
    setTimeout(() => {
      if (cameFromLogin) {
        navigation.replace("Login"); 
      } else {
        navigation.replace("Landing"); 
      }
    }, 300);
  };

  const handleInputChange = (key, value) => {
    setUserData({ ...userData, [key]: value });
  };

  React.useEffect(() => {
  const isValid = validateStep(false);  // disable alerts
  setIsCurrentStepValid(isValid);
}, [userData, currentStep]);

const validateStep = (showAlerts = true) => {
  const key = steps[currentStep];
  const newErrors = {};

  if (key === "Let’s start with your name." && (!userData.Name || userData.Name.trim().length < 2)) {
    if (showAlerts) Alert.alert("Invalid Input", "Please enter your name.");
    return false;
  }

  if (key === "What is your goal?" && !userData.Goal) {
    if (showAlerts) Alert.alert("Invalid Input", "Please select your goal.");
    return false;
  }

  if (key === "Target Weight Change") {
    const target = parseFloat(userData.TargetKg || "0");
    if (!target || target <= 0) {
      if (showAlerts) Alert.alert("Invalid Input", "Please enter a valid target weight.");
      return false;
    }
  }

  if (key === "What is your Gender?" && !userData.Gender) {
    if (showAlerts) Alert.alert("Invalid Input", "Please select your gender.");
    return false;
  }

  if (key === "What is your Activity level?" && !userData.Activity) {
    if (showAlerts) Alert.alert("Invalid Input", "Please select your activity level.");
    return false;
  }

  if (key === "Weight") {
    const weight = parseFloat(userData.Weight);
    const target = parseFloat(userData.TargetKg);

    if (!weight || weight < 20 || weight > 500) {
      if (showAlerts) Alert.alert("Invalid Input", "Please enter a valid weight.");
      return false;
    }

    if (userData.Goal === "Weight Loss" && target >= weight) {
      if (showAlerts) Alert.alert("Invalid Target", "For weight loss, your target weight must be lower than your current weight.");
      return false;
    }

    if (userData.Goal === "Weight Gain" && target <= weight) {
      if (showAlerts) Alert.alert("Invalid Target", "For weight gain, your target weight must be higher than your current weight.");
      return false;
    }
  }

  if (key === "Height") {
    if (userData.HeightUnit === "cm") {
      const height = parseFloat(userData.Height);
      if (!height || height < 50 || height > 300) {
        if (showAlerts) Alert.alert("Invalid Input", "Enter a valid height in cm.");
        return false;
      }
    } else if (!userData.HeightFtIn) {
      if (showAlerts) Alert.alert("Invalid Input", "Select your height in ft/in.");
      return false;
    }
  }

  if (key === "When is your Birthday?" && !userData.Birthday) {
    if (showAlerts) Alert.alert("Invalid Input", "Please select your birthday.");
    return false;
  }

  return true;
};



const handleNext = () => {
  const key = steps[currentStep];

  if (!validateStep(true)) return; // now alerts only show when "Next" is clicked

  if (key === "What is your goal?" && userData.Goal === "Maintain my current weight") {
    setCurrentStep(currentStep + 2);
    return;
  }

  if (currentStep < steps.length - 1) {
    setCurrentStep(currentStep + 1);
    return;
  }

  const age = calculateAge(userData.Birthday);
  let finalHeightCm = userData.Height;

  if (userData.HeightUnit === "ftin") {
    finalHeightCm = convertFtInToCm(userData.HeightFtIn);
  }

  setUserData((prev) => ({
    ...prev,
    Age: age,
    Height: finalHeightCm,
    HeightUnit: "cm",
  }));

  setAuthPromptVisible(true);
};

  const handleBack = () => {
     if (
      steps[currentStep] === "What is your Gender?" &&
      userData.Goal === "Maintain my current weight"
      ) {
        setCurrentStep(currentStep - 2); // go back to "What is your goal?"
      } else if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
      }
  };

  const renderGenderSelection = () => (
    <>
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
    </>
  );

  const renderStep = () => {
    const key = steps[currentStep];
    if (key === "Setting Up Your Profile") {
      return (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            To set up your goals, we will start by calculating your RDI or
            recommended daily intake. This is how much food you should, ideally,
            be consuming each day. It is affected by your nutrition goal,
            activity level, age, height, and other characteristics unique to you.
          </Text>
        </View>
      );
    }

    if (key === "What is your Gender?") return renderGenderSelection();

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

    if (key === "What is your goal?") {
      const goals = [
        "Weight Loss",
        "Maintain my current weight",
        "Weight Gain",
      ];

      return (
        <>
        <View style={styles.goalGrid}>
          {goals.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.goalBox,
                userData.Goal === opt && styles.goalBoxSelected,
              ]}
              onPress={() => handleInputChange("Goal", opt)}
            >
              <Text
                style={[
                  styles.goalText,
                  userData.Goal === opt && styles.goalTextSelected,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        </>
      );
    }

    if (key === "Target Weight Change") {
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
            onValueChange={(value) => handleInputChange("TargetKgUnit", value)}
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

    if (key === "Weight") {
      return (
        <>
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
        </>
      );
    }

    if (key === "Height") {
      if (userData.HeightUnit === "cm") {
        return (
          <>
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
                onValueChange={(value) =>
                  handleInputChange("HeightUnit", value)
                }
                style={styles.picker}
              >
                <Picker.Item label="cm" value="cm" />
                <Picker.Item label="ft/in" value="ftin" />
              </Picker>
            </View>
          </View>
          </>
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
        <>
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
              onValueChange={(value) =>
                handleInputChange("HeightUnit", value)
              }
              style={styles.picker}
            >
              <Picker.Item label="cm" value="cm" />
              <Picker.Item label="ft/in" value="ftin" />
            </Picker>
          </View>
        </View>
        </>
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

    let fieldKey = key;
    let placeholder = key;

    if (key === "Let’s start with your name.") {
      fieldKey = "Name";
      placeholder = "Enter your name here";
    }

    return (
      <TextInput
        placeholder={placeholder}
        value={userData[fieldKey]}
        onChangeText={(text) => handleInputChange(fieldKey, text)}
        style={styles.input}
        placeholderTextColor="#9ca3af"
      />
    );

  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      <Modal visible={modalVisible} transparent animationType="none">
  <View style={styles.modalOverlay}>
    <Animated.View
      style={[
        styles.modalContent,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Text style={styles.title}>Before you get started</Text>
      <Text style={styles.consentText}>
        We collect your information (age, height, weight, etc.) solely for
        the purpose of calculating your personalized calorie and nutrition
        goals. Your data is stored securely and never shared with third
        parties.
      </Text>
      <View style={styles.consentButtons}>
        <TouchableOpacity style={styles.agreeButton} onPress={handleAgree}>
          <Text style={styles.agreeText}>Agree</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.disagreeButton}
          onPress={handleDisagree}
        >
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

        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>

        <Text style={styles.stepTitle}>{steps[currentStep]}</Text>

        {steps[currentStep] === "Let’s start with your name." && (
          <Text style={styles.subtitle}>
            Hi! We'd like to get to know you to make the NutriFit app
            personalized to you.
          </Text>
        )}

        {renderStep()}

        <TouchableOpacity
          style={[styles.button, !isCurrentStepValid && { opacity: 0.5 }]}
          onPress={handleNext}
          disabled={!isCurrentStepValid}
        >
          <Text style={styles.buttonText}>
            {currentStep === steps.length - 1 ? "Finish" : "Next"}
          </Text>
        </TouchableOpacity>

      </ScrollView>

<Modal visible={isAuthPromptVisible} transparent animationType="none">
  <View style={styles.authModalOverlay}>
    <Animated.View
      style={[
        styles.authModalContent,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
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
          <Ionicons
            name="mail-outline"
            size={20}
            color="#fff"
            style={{ marginRight: 8 }}
          />
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

});
