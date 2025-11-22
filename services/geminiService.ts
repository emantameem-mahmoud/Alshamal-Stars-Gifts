import { GoogleGenAI, Type } from "@google/genai";
import { RewardResponse, GradeLevel, TaskType } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeStudentImage = async (
  base64Image: string,
  grade: GradeLevel,
  taskType: TaskType,
  starRange: { min: number; max: number }
): Promise<RewardResponse> => {
  const cleanBase64 = base64Image.split(',')[1] || base64Image;

  const gradeInstruction = grade === '1-3' 
    ? "Target Audience: Lower Primary (Grades 1-3). Use very simple, playful Arabic, lots of emojis." 
    : "Target Audience: Upper Primary (Grades 4-6). Use inspiring, slightly more mature Arabic, praising effort and excellence.";

  const taskInstruction = taskType === 'creative'
    ? "Focus: Creativity and Art. Reward colors, imagination, and uniqueness."
    : taskType === 'academic'
    ? "Focus: Academic Work (Handwriting, Math, Reading). Reward neatness, focus, and correctness."
    : "Focus: General Behavior/Participation. Reward smiling, uniform, helping others.";

  const systemInstruction = `
  You are an AI supervisor for "Al Shamal Primary School for Girls".
  
  ${gradeInstruction}
  ${taskInstruction}

  Your Goal: Reinforce positive behavior/work with highly personalized feedback.
  
  Tasks:
  1. DETECT: Look for a student or student work in the image.
  2. ANALYZE: Determine quality/effort. Look for specific attributes:
     - If a student: Are they smiling? Wearing uniform? Participating?
     - If work: Is it neat? Colorful? Organized?
  3. LOCATE: Identify the bounding box [ymin, xmin, ymax, xmax] (0-1000 scale) of the main subject (face or work).
  4. RESPOND: Generate JSON.

  Output Rules:
  - message: Arabic, short (max 15 words), HIGHLY PERSONALIZED. Mention specific details seen (e.g., "Beautiful smile!", "Great use of red color!", "Very neat handwriting!").
  - stars: Integer between ${starRange.min} and ${starRange.max}. STRICTLY enforce this range.
  - detected: Boolean. False if image is black, blurry, or empty.
  - boundingBox: [ymin, xmin, ymax, xmax] for the main subject.
  `;

  let attempt = 0;
  const maxRetries = 5;
  let delay = 4000; // Increased from 2000 to reduce 429 likelihood

  while (attempt <= maxRetries) {
    try {
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
              text: "Analyze this image for a student reward."
            }
          ]
        },
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detected: { type: Type.BOOLEAN },
              message: { type: Type.STRING },
              stars: { type: Type.INTEGER },
              boundingBox: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: "[ymin, xmin, ymax, xmax] normalized 0-1000"
              }
            },
            required: ["detected", "message", "stars"]
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as RewardResponse;
      }
      
      throw new Error("No response text from Gemini");

    } catch (error: any) {
      console.error(`Gemini Analysis Attempt ${attempt + 1} failed:`, error);

      const errorCode = error?.error?.code || error?.status || error?.code;
      const errorMessage = error?.error?.message || error?.message || JSON.stringify(error);
      
      // Check for Rate Limit (429) or Service Unavailable (503)
      const isRateLimit = errorCode === 429 || errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED");
      const isServiceUnavailable = errorCode === 503 || errorMessage.includes("503") || errorMessage.includes("overloaded");

      if ((isRateLimit || isServiceUnavailable) && attempt < maxRetries) {
        // Exponential backoff with jitter
        const jitter = Math.random() * 1000;
        const waitTime = delay + jitter;
        console.log(`Rate limited. Waiting ${Math.round(waitTime)}ms before retry...`);
        await sleep(waitTime);
        
        delay *= 2; // Increase delay factor from 1.5 to 2 for more aggressive backoff
        attempt++;
        continue;
      }

      // If specific rate limit error and retries exhausted
      if (isRateLimit) {
        return {
          detected: false,
          message: "الخدمة مشغولة جداً حالياً (429). يرجى الانتظار قليلاً والمحاولة لاحقاً.",
          stars: 0
        };
      }

      // Generic error on last attempt
      if (attempt === maxRetries) {
         return {
            detected: false,
            message: "تعذر الاتصال بالخدمة. يرجى التحقق من الإنترنت.",
            stars: 0
         };
      }
      
      // For non-retriable errors, break immediately
      break; 
    }
  }
  
  return {
    detected: false,
    message: "حدث خطأ غير متوقع.",
    stars: 0
  };
};