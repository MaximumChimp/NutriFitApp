export function getSmartSuggestions(userData, allMeals) {
  const {
    Goal,
    requiredCalories,
    HealthConditions = [],
    Allergies = [],
    calorieBreakdown = {}
  } = userData;

  const hasAllergies = Allergies.length > 0;
  const isWeightLoss = Goal === "Weight Loss";
  const isMuscleGain = Goal === "Muscle Gain";

  return allMeals
    .filter((meal) => {
      // Filter out meals that contain allergens
      if (hasAllergies && Allergies.some(allergy => meal.allergens?.includes(allergy))) {
        return false;
      }

      // Filter by calorie range (±20%)
      const withinCalories =
        meal.calories >= requiredCalories * 0.8 &&
        meal.calories <= requiredCalories * 1.2;

      if (!withinCalories) return false;

      // Match goals (optional tags on meal: "weightLoss", "muscleGain", "balanced")
      if (isWeightLoss && !meal.tags?.includes("weightLoss")) return false;
      if (isMuscleGain && !meal.tags?.includes("muscleGain")) return false;

      // Optional: match macros if available
      const { protein, carbs, fat } = meal;
      if (
        calorieBreakdown &&
        protein && carbs && fat &&
        (
          protein < calorieBreakdown.protein * 0.8 ||
          carbs < calorieBreakdown.carbs * 0.8 ||
          fat < calorieBreakdown.fat * 0.8
        )
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Optional: prioritize high protein for muscle gain
      if (isMuscleGain) return b.protein - a.protein;
      // Or lower calories for weight loss
      if (isWeightLoss) return a.calories - b.calories;
      return 0;
    });
}
