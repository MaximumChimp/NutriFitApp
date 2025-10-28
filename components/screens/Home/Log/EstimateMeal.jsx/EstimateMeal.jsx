import { GEMINI_API_KEY } from "@env";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export default async function EstimateMeal(mealName, recipe) {
  try {
    const prompt = `
Estimate total calories, protein, carbs, and fat for this meal.
Respond ONLY with valid JSON like:
{"calories": number, "protein": number, "carbs": number, "fat": number}

Meal Name: ${mealName}
Recipe:
${recipe}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    // ✅ Correct property access
    const text = response.text;
    console.log("Gemini raw response:", text);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Gemini response");

    const parsed = JSON.parse(jsonMatch[0]);

    const { calories = 0, protein = 0, carbs = 0, fat = 0 } = parsed;
    return { calories, protein, carbs, fat };
  } catch (error) {
    console.error("Gemini estimation error:", error);
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
}
