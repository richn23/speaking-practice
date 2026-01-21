// Unit 1: Daily Routines & Lifestyle
// A2+ (Pre-intermediate) Speaking Practice

const unitId = "unit-1";

export type TaskType = "qa" | "long_talk" | "mediation" | "image" | "this_or_that" | "gateway";

export interface TaskItem {
  id: string;
  orderIndex: number;
  promptText: string;
  audioUrl?: string;
}

export interface Task {
  id: string;
  unitId: string;
  orderIndex: number;
  taskType: TaskType;
  title: string;
  instructions: string;
  prompt?: string;
  statement?: string;  // For gateway tasks - the opinion statement
  items?: TaskItem[];
  imageUrl?: string;
  audioUrl?: string;
  maxReplays?: number;
  expectedMinSeconds?: number;
  expectedMaxSeconds?: number;
  hasAudio?: boolean;
  audioEnabled?: boolean;
}

export interface Unit {
  id: string;
  level: string;
  title: string;
  description: string;
  objectives: string[];
  canDo: string[];
  tasks: Task[];
}

export const unit1: Unit = {
  id: unitId,
  level: "A2+",
  title: "Daily Routines & Lifestyle",
  description:
    "Build confidence talking about your daily life, habits, and opinions. Practice describing routines, giving short talks, and sharing your views on everyday topics.",
  objectives: [
    "Answer everyday questions about routines and preferences.",
    "Give short talks (30–60s) about your daily life and weekends.",
    "Describe images with clear details and basic context.",
    "Share quick opinions and compare simple choices.",
    "Combine skills in an extended response.",
  ],
  canDo: [
    "Talk for 30–60 seconds about a typical day with smooth flow.",
    "Describe a picture with key details and simple context.",
    "Give quick opinions on everyday topics with 2–3 sentences.",
    "Summarise what others say about their routines.",
    "Give an extended opinion with supporting reasons.",
  ],
  tasks: [
    // Task 1: Q&A
    {
      id: "qa-1",
      unitId,
      orderIndex: 1,
      taskType: "qa",
      title: "Daily Life Q&A",
      instructions: "Answer each question with 2–3 sentences about your daily routine.",
      items: [
        { id: "qa-1-q1", orderIndex: 1, promptText: "What time do you usually wake up?", audioUrl: "https://hmvbvtsgvqhjmmhdxqsw.supabase.co/storage/v1/object/public/audio/unit1/qa-1-q1.mp3" },
        { id: "qa-1-q2", orderIndex: 2, promptText: "What do you normally eat for breakfast?", audioUrl: "https://hmvbvtsgvqhjmmhdxqsw.supabase.co/storage/v1/object/public/audio/unit1/qa-1-q2.mp3" },
        { id: "qa-1-q3", orderIndex: 3, promptText: "How do you get to work or school?", audioUrl: "https://hmvbvtsgvqhjmmhdxqsw.supabase.co/storage/v1/object/public/audio/unit1/qa-1-q3.mp3" },
        { id: "qa-1-q4", orderIndex: 4, promptText: "What do you do in the afternoon?", audioUrl: "https://hmvbvtsgvqhjmmhdxqsw.supabase.co/storage/v1/object/public/audio/unit1/qa-1-q4.mp3" },
        { id: "qa-1-q5", orderIndex: 5, promptText: "What do you usually do in the evening?", audioUrl: "https://hmvbvtsgvqhjmmhdxqsw.supabase.co/storage/v1/object/public/audio/unit1/qa-1-q5.mp3" },
        { id: "qa-1-q6", orderIndex: 6, promptText: "What do you like doing at the weekend?", audioUrl: "https://hmvbvtsgvqhjmmhdxqsw.supabase.co/storage/v1/object/public/audio/unit1/qa-1-q6.mp3" },
      ],
      expectedMinSeconds: 30,
      expectedMaxSeconds: 60,
      hasAudio: true,
      audioEnabled: true,
    },

    // Task 2: Long Talk
    {
      id: "longtalk-1",
      unitId,
      orderIndex: 2,
      taskType: "long_talk",
      title: "My Daily Routine",
      instructions: "Speak for 45–60 seconds about your typical day.",
      prompt:
        "Think about:\n" +
        "• What time you wake up and your first activity\n" +
        "• Meals or coffee: where, what, and with who\n" +
        "• Morning plans: work, study, errands\n" +
        "• Afternoon: tasks, exercise, or hobbies\n" +
        "• Evening routine: dinner, relaxing, screens or books\n" +
        "• One thing you always do and one thing that changes",
      expectedMinSeconds: 45,
      expectedMaxSeconds: 60,
      hasAudio: true,
      audioEnabled: true,
    },

    // Task 3: Mediation (Listen & Summarise)
    {
      id: "mediation-1",
      unitId,
      orderIndex: 3,
      taskType: "mediation",
      title: "Listen & Summarise",
      instructions:
        "Listen to three people talking about their daily routines. You can replay the audio once. Take notes if you wish. Then summarise what you heard.",
      audioUrl: "https://hmvbvtsgvqhjmmhdxqsw.supabase.co/storage/v1/object/public/audio/unit1/mediation-1.mp3",
      maxReplays: 1,
      expectedMinSeconds: 30,
      expectedMaxSeconds: 90,
      hasAudio: true,
      audioEnabled: true,
    },

    // Task 4: Image Description
    {
      id: "image-1",
      unitId,
      orderIndex: 4,
      taskType: "image",
      title: "Picture Description",
      instructions:
        "Describe the picture in 4–6 sentences. Mention what you see, actions, and possible context.",
      imageUrl: "/images/picture-description.png",
      expectedMinSeconds: 30,
      expectedMaxSeconds: 60,
      hasAudio: true,
      audioEnabled: true,
    },

    // Task 5: This or That (Quick Opinions)
    {
      id: "thisorthat-1",
      unitId,
      orderIndex: 5,
      taskType: "this_or_that",
      title: "Quick Opinions",
      instructions:
        "For each pair, say which you prefer and why. Try to answer quickly and keep talking!",
      items: [
        { id: "tot-1-1", orderIndex: 1, promptText: "Morning person or night owl?" },
        { id: "tot-1-2", orderIndex: 2, promptText: "Cook at home or eat out?" },
        { id: "tot-1-3", orderIndex: 3, promptText: "Exercise in the morning or evening?" },
        { id: "tot-1-4", orderIndex: 4, promptText: "Busy weekends or relaxing weekends?" },
        { id: "tot-1-5", orderIndex: 5, promptText: "Work from home or work in an office?" },
      ],
      expectedMinSeconds: 60,
      expectedMaxSeconds: 120,
      hasAudio: true,
      audioEnabled: true,
    },

    // Task 6: Gateway (Boss Level)
    {
      id: "gateway-1",
      unitId,
      orderIndex: 6,
      taskType: "gateway",
      title: "Unit Challenge: Routine & Lifestyle",
      instructions:
        "This is your unit challenge! Speak for 60–90 seconds giving your opinion on the topic below. Use the key points to guide your answer.",
      statement: "A good daily routine is important for a happy life.",
      prompt:
        "Include these points in your response:\n" +
        "• Describe your typical daily routine\n" +
        "• Say what you like or dislike about your routine\n" +
        "• Give your opinion: do you agree with the statement?\n" +
        "• Explain why you agree or disagree with an example",
      expectedMinSeconds: 60,
      expectedMaxSeconds: 90,
      hasAudio: true,
      audioEnabled: true,
    },
  ],
};
