import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const steps = [
  "Name",
  "Setting Up Your Profile", 
  "What is your goal?",
  "What is your Gender?",
  "What is your Activity level?",
  "Weight",
  "Height",
  "Age",
];

export default function OnboardingScreen({ navigation }) {
  const [agreed, setAgreed] = useState(null); // null = not decided
  const [modalVisible, setModalVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState({
    Name: "",
    Age: "",
    Gender: "",
    HeightFtIn: "3' \"",
    HeightUnit: "cm",
    Weight: "",
    WeightUnit: "kg",
    Activity: "",
    Goal: "",
  });

  const handleAgree = () => {
    setAgreed(true);
    setModalVisible(false);
  };

  const handleDisagree = () => {
    Alert.alert(
      "Agreement Required",
      "You must agree to proceed with onboarding.",
      [{ text: "OK", onPress: () => {} }],
      { cancelable: false }
    );
  };

  const handleInputChange = (key, value) => {
    setUserData({ ...userData, [key]: value });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      console.log("User data:", userData);
      navigation.navigate("Home");
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSkip = () => navigation.navigate("Home");

  const renderGenderSelection = () => (
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


  const renderStep = () => {
    const key = steps[currentStep];
    if (key === "Setting Up Your Profile") {
    return (
        <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
            To set up your goals, we will start by calculating your RDI or recommended daily intake. This is how much food you should, ideally, be consuming each day. It is affected by your nutrition goal, activity level, age, height, and other characteristics unique to you.
        </Text>
        </View>
    );
    }
    if (key === "What is your Gender?") return renderGenderSelection();

    if (key === "What is your Activity level?") {
    const activityOptions = [
        {
        label: "Sedentary",
        description: "Little to no physical activity (e.g., sitting most of the day)",
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
                userData.Activity === label && styles.activityDescriptionSelected,
                ]}
            >
                {description}
            </Text>
            </TouchableOpacity>
        ))}
        </View>
    );
    }
    if (key === "What is your goal?") {
    const goals = [
        "Weight Loss",
        "Maintain my current weight",
        "Weight Gain"
    ];
    
    return (
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
    );
    }
    if (key === "Weight") {
        return (
        <View style={styles.inlineRow}>
            <TextInput
                placeholder="Weight"
                value={userData.Weight}
                onChangeText={(text) => handleInputChange("Weight", text)}
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
    placeholder="Height in cm"
    value={userData.Height}
    onChangeText={(text) => handleInputChange("Height", text)}
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

    // Generate ft/in options like 3' 0", 3' 1", ..., 7' 9"
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
      onValueChange={(value) => handleInputChange("HeightUnit", value)}
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



    return (
      <TextInput
        placeholder={key}
        value={userData[key]}
        onChangeText={(text) => handleInputChange(key, text)}
        style={styles.input}
        keyboardType={
          ["Age", "Height", "Weight"].includes(key) ? "numeric" : "default"
        }
        placeholderTextColor="#9ca3af"
      />
    );
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Before you get started</Text>
            <Text style={styles.consentText}>
              We collect your information (age, height, weight, etc.) solely for
              the purpose of calculating your personalized calorie and nutrition
              goals. Your data is stored securely and never shared with third
              parties.
            </Text>
            <View style={styles.consentButtons}>
              <TouchableOpacity style={styles.agreeButton} onPress={handleAgree}>
                <Text style={styles.agreeText}>Yes, I agree</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.disagreeButton} onPress={handleDisagree}>
                <Text style={styles.disagreeText}>No, I do not agree</Text>
              </TouchableOpacity>
            </View>
          </View>
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
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>

       <Text style={styles.stepTitle}>{steps[currentStep]}</Text>

        {steps[currentStep] === "Name" && (
        <Text style={styles.subtitle}>
            Hi! We'd like to get to know you to make the NutriFit app personalized to you.
        </Text>
)}

        {renderStep()}

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentStep === steps.length - 1 ? "Finish" : "Next"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
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
  skip: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
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
  optionGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginRight: 10,
    marginBottom: 10,
  },
  optionButtonSelected: {
    backgroundColor: "#22c55e",
    borderColor: "#14532d",
  },
  optionText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#fff",
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
infoTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: "#14532d",
  marginBottom: 10,
  textAlign: "center",
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
weightContainer: {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 20,
},

weightInput: {
  width: 80,
  height: 64,               // Match dropdown height
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 10,
  paddingHorizontal: 10,
  fontSize: 16,
  color: "#111827",
  textAlign: "center",
  marginRight: 10,
},

inlineRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  marginBottom: 16,
},

smallInput: {
  width: 80, // >= 50px
  height: 44,
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 10,
  paddingHorizontal: 10,
  fontSize: 16,
  backgroundColor: "#f9fafb",
  color: "#111827",
  textAlign: "center",
},
fullPickerContainer: {
  width: 10, // or another suitable width like 160
  height: 60,
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 10,
  backgroundColor: "#f3f4f6",
  justifyContent: "center",
},

pickerContainer: {
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 10,
  backgroundColor: "#f3f4f6",
  width: 100,         // <-- Set fixed width
  height: 60,         // <-- Standard height
  justifyContent: "center",
},

picker: {
  width: "100%",
  height: 60,
},
pickerContainerFixed: {
  width: 100,
  height: 60,
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 10,
  backgroundColor: "#f3f4f6",
  justifyContent: "center",
},



});
