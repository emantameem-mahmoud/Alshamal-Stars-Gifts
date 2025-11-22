export interface RewardResponse {
  detected: boolean;
  message: string;
  stars: number;
  boundingBox?: number[]; // [ymin, xmin, ymax, xmax] normalized 0-1000
}

export enum AnalysisStatus {
  IDLE,
  CAPTURING,
  ANALYZING,
  DETECTED,
  SUCCESS,
  ERROR
}

export type GradeLevel = '1-3' | '4-6';
export type TaskType = 'general' | 'academic' | 'creative';