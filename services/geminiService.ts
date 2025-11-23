import { GoogleGenAI, Type } from "@google/genai";
import { RewardResponse, GradeLevel, TaskType } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const FALLBACK_MESSAGES = {
  academic: [
    "مجهود دراسي رائع!",
    "إجابة متميزة، أحسنتِ!",
    "خط رائع وترتيب جميل!",
    "تركيز ممتاز في الحصة!",
    "حل صحيح ودقيق!",
    "دفتر منظم وجميل!",
    "استيعاب سريع وممتاز!"
  ],
  creative: [
    "إبداع وتألق مميز!",
    "عمل فني رائع!",
    "أفكار مبتكرة وجميلة!",
    "لمسات فنية ساحرة!",
    "خيال واسع ومميز!",
    "تناسق ألوان جميل!",
    "موهبة واعدة!"
  ],
  general: [
    "سلوك ممتاز، أحسنتِ!",
    "طالبة مهذبة ومتميزة!",
    "نظافة وترتيب رائع!",
    "مشاركة فعالة ومميزة!",
    "مبادرة رائعة!",
    "التزام بالنظام ممتاز!",
    "شخصية قيادية رائعة!"
  ]
};

const getFallbackMessage = (type: TaskType): string => {
  const messages = FALLBACK_MESSAGES[type] || FALLBACK_MESSAGES.general;
  return messages[Math.floor(Math.random() * messages.length)];
};

// Fallback logic extracted to be reused
const runSimulation = async (
  grade: GradeLevel,
  taskType: TaskType,
  starRange: { min: number; max: number }
): Promise<RewardResponse> => {
  // Simulate Processing Delay
  const delay = 1000 + Math.random() * 1000;
  await sleep(delay);

  // Determine stars based on range
  const possibleStars = [];
  for (let i = starRange.min; i <= starRange.max; i++) {
      possibleStars.push(i);
  }
  if (starRange.max > starRange.min) {
      possibleStars.push(starRange.max);
  }
  
  const stars = possibleStars[Math.floor(Math.random() * possibleStars.length)];

  return {
    detected: true,
    message: getFallbackMessage(taskType),
    stars: stars,
    boundingBox: [200, 200, 800, 800] 
  };
};

export const analyzeStudentImage = async (
  base64Image: string,
  grade: GradeLevel,
  taskType: TaskType,
  starRange: { min: number; max: number }
): Promise<RewardResponse> => {
  
  try {
    // 1. Check for API Key
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("No API Key found, running simulation mode.");
      return runSimulation(grade, taskType, starRange);
    }

    // 2. Setup Gemini
    const ai = new GoogleGenAI({ apiKey });
    
    // 3. Prepare Image
    // Remove header "data:image/jpeg;base64," if present
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    // 4. Call API
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `
              Analyze this image for a primary school student context (Grade ${grade}, Context: ${taskType}).
              If you see a student, their work, or good behavior, provide an encouraging short message in Arabic and a star rating.
              Star rating should be between ${starRange.min} and ${starRange.max}.
              If the image is unclear or not relevant, set detected to false.
              Return a bounding box [ymin, xmin, ymax, xmax] (0-1000) for the face or main object.
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detected: { type: Type.BOOLEAN },
            message: { type: Type.STRING },
            stars: { type: Type.INTEGER },
            boundingBox: { 
              type: Type.ARRAY,
              items: { type: Type.INTEGER }
            }
          }
        }
      }
    });

    // 5. Parse Response
    if (response.text) {
      const result = JSON.parse(response.text);
      
      // Validate stars are within range
      let stars = result.stars || starRange.min;
      if (stars < starRange.min) stars = starRange.min;
      if (stars > starRange.max) stars = starRange.max;

      return {
        detected: result.detected ?? true,
        message: result.message || getFallbackMessage(taskType),
        stars: stars,
        boundingBox: result.boundingBox || [200, 200, 800, 800]
      };
    }
    
    throw new Error("Empty response from Gemini");

  } catch (error) {
    console.error("Gemini Analysis Failed, falling back to simulation:", error);
    return runSimulation(grade, taskType, starRange);
  }
};