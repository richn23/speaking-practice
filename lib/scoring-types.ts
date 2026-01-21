// Scoring Types for Speaking Assessment
// Two dimensions: Functions (what you DO) and Skills (HOW WELL you do it)

// ===================
// FUNCTIONS - What communicative purpose does the task serve?
// ===================
export type FunctionType = 
  | "describing"   // Picture description
  | "narrating"    // Long talk, storytelling
  | "informing"    // Q&A, giving information
  | "mediating"    // Listen & summarise, relaying info
  | "opinion";     // This or That, Gateway (arguing a point)

// Task to Function mapping
export const taskFunctionMap: Record<string, { primary: FunctionType; secondary?: FunctionType }> = {
  qa: { primary: "informing" },
  long_talk: { primary: "narrating" },
  mediation: { primary: "mediating" },
  image: { primary: "describing" },
  this_or_that: { primary: "opinion" },
  gateway: { primary: "opinion", secondary: "informing" },
};

// ===================
// SKILLS - Language quality criteria (scored 0-5)
// ===================
export type SkillType = 
  | "range"       // Vocabulary variety, topic-appropriate words
  | "accuracy"    // Grammar, word forms, sentence structure
  | "fluency"     // Smoothness, natural pace, minimal hesitation
  | "coherence"   // Linking words, logical flow, organisation
  | "interaction"; // Responding appropriately (Q&A mainly)

// Which skills apply to which task types
export const taskSkillsMap: Record<string, SkillType[]> = {
  qa: ["range", "accuracy", "fluency", "interaction"],
  long_talk: ["range", "accuracy", "fluency", "coherence"],
  mediation: ["range", "accuracy", "fluency", "coherence"],
  image: ["range", "accuracy", "fluency", "coherence"],
  this_or_that: ["range", "accuracy", "fluency"],
  gateway: ["range", "accuracy", "fluency", "coherence"],
};

// ===================
// SKILL RUBRIC DEFINITIONS (0-5 scale)
// ===================
export const skillRubrics: Record<SkillType, Record<number, string>> = {
  range: {
    0: "No language produced or completely off-topic",
    1: "Very limited vocabulary; only isolated words",
    2: "Basic vocabulary; significant gaps affect meaning",
    3: "Adequate vocabulary for familiar topics; some gaps",
    4: "Good range; appropriate word choices with minor gaps",
    5: "Wide range; precise and varied vocabulary throughout",
  },
  accuracy: {
    0: "No language produced",
    1: "Errors make meaning very difficult to understand",
    2: "Frequent errors; meaning often unclear",
    3: "Some errors but meaning is generally clear",
    4: "Good control; occasional errors don't impede",
    5: "High accuracy; rare minor errors only",
  },
  fluency: {
    0: "No speech or only silence",
    1: "Very fragmented; long pauses; hard to follow",
    2: "Frequent hesitation; slow with noticeable pauses",
    3: "Some hesitation but maintains communication",
    4: "Generally smooth; occasional pauses for thought",
    5: "Smooth and natural pace throughout",
  },
  coherence: {
    0: "No connected speech",
    1: "Ideas disconnected; no linking",
    2: "Limited linking; hard to follow sequence",
    3: "Basic linking (and, but, then); followable",
    4: "Good use of connectors; clear organisation",
    5: "Well-structured; varied connectors; easy to follow",
  },
  interaction: {
    0: "No response to questions",
    1: "Responses don't address the question",
    2: "Partial response; misses key parts of question",
    3: "Addresses question but may lack detail",
    4: "Responds appropriately with relevant detail",
    5: "Fully addresses question with elaboration",
  },
};

// ===================
// FUNCTION DESCRIPTORS (for reporting)
// ===================
export const functionDescriptors: Record<FunctionType, string> = {
  describing: "Describing people, places, objects, and scenes",
  narrating: "Telling stories and recounting experiences",
  informing: "Giving and exchanging information",
  mediating: "Relaying and summarising information from others",
  opinion: "Expressing and justifying opinions",
};

// ===================
// SCORE INTERFACES
// ===================
export interface SkillScores {
  range: number;
  accuracy: number;
  fluency: number;
  coherence?: number;    // Not all tasks have this
  interaction?: number;  // Only Q&A tasks
}

export interface TaskScore {
  taskId: string;
  taskType: string;
  function: FunctionType;
  secondaryFunction?: FunctionType;
  skills: SkillScores;
  overall: number;       // Weighted average of skills
  transcript: string;
  corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  strengths: string[];
  improvements: string[];
}

export interface UnitReport {
  unitId: string;
  completedAt: string;
  
  // Function scores (aggregated from tasks)
  functions: Record<FunctionType, {
    score: number;
    tasksCompleted: number;
  }>;
  
  // Skill scores (averaged across all tasks)
  skills: Record<SkillType, {
    score: number;
    attempts: number;
  }>;
  
  // Individual task scores
  tasks: TaskScore[];
  
  // Overall assessment
  overallScore: number;
  cefrEstimate: string;
}

// ===================
// HELPER FUNCTIONS
// ===================
export function calculateOverallScore(skills: SkillScores): number {
  const values = Object.values(skills).filter((v): v is number => v !== undefined);
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round((avg / 5) * 100);
}

export function getSkillsForTask(taskType: string): SkillType[] {
  return taskSkillsMap[taskType] || ["range", "accuracy", "fluency"];
}

export function getFunctionForTask(taskType: string): { primary: FunctionType; secondary?: FunctionType } {
  return taskFunctionMap[taskType] || { primary: "informing" };
}
