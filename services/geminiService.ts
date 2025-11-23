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

export const analyzeStudentImage = async (
  base64Image: string, // Kept for interface compatibility
  grade: GradeLevel,
  taskType: TaskType,
  starRange: { min: number; max: number }
): Promise<RewardResponse> => {
  
  // Simulate Processing Delay (1.5s - 2.5s) for realistic UX
  const delay = 1500 + Math.random() * 1000;
  await sleep(delay);

  // Determine stars based on range
  // Skew probability slightly towards the maximum for encouragement
  const possibleStars = [];
  for (let i = starRange.min; i <= starRange.max; i++) {
      possibleStars.push(i);
  }
  if (starRange.max > starRange.min) {
      possibleStars.push(starRange.max); // Add max again to increase weight
  }
  
  const stars = possibleStars[Math.floor(Math.random() * possibleStars.length)];

  return {
    detected: true,
    message: getFallbackMessage(taskType),
    stars: stars,
    // Generic center bounding box [ymin, xmin, ymax, xmax] 0-1000
    boundingBox: [200, 200, 800, 800] 
  };
};