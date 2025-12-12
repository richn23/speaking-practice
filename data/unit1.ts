export type TaskItem = {
  id: string;
  promptText: string;
  orderIndex: number;
};

export type Task = {
  id: string;
  unitId: number;
  orderIndex: number;
  taskType: "qa" | "long_talk" | "image" | "this_or_that" | "gateway";
  title: string;
  instructions: string;
  prompt?: string;
  items?: TaskItem[];
  expectedMinSeconds: number;
  expectedMaxSeconds: number;
  hasAudio: boolean;
  audioEnabled: boolean;
};

export type Unit = {
  id: number;
  level: string;
  title: string;
  description: string;
  objectives: string[];
  canDo: string[];
  tasks: Task[];
};

const unitId = 1;

export const unit1: Unit = {
  id: unitId,
  level: "Pre-intermediate",
  title: "About You & Daily Life",
  description:
    "Build confidence with structured, short spoken tasks and extend responses to 30–60 seconds.",
  objectives: [
    "Answer everyday questions about routines and preferences.",
    "Give short talks (30–60s) about your daily life and weekends.",
    "Describe images with clear details and basic context.",
    "Share quick opinions and compare simple choices.",
  ],
  canDo: [
    "Talk for 30–60 seconds about a typical day with smooth flow.",
    "Describe a picture with key details and simple context.",
    "Give quick opinions on everyday topics with 2–3 sentences.",
  ],
  tasks: [
    {
      id: "qa-1",
      unitId,
      orderIndex: 1,
      taskType: "qa",
      title: "Daily Life Q&A",
      instructions: "Answer each question with 2–3 sentences about your daily routine.",
      items: [
        { id: "qa-1-q1", orderIndex: 1, promptText: "What time do you usually wake up?" },
        { id: "qa-1-q2", orderIndex: 2, promptText: "What do you normally eat for breakfast?" },
        { id: "qa-1-q3", orderIndex: 3, promptText: "How do you get to work or school?" },
        { id: "qa-1-q4", orderIndex: 4, promptText: "What do you do in the afternoon?" },
        { id: "qa-1-q5", orderIndex: 5, promptText: "What do you usually do in the evening?" },
        { id: "qa-1-q6", orderIndex: 6, promptText: "What do you like doing at the weekend?" },
      ],
      expectedMinSeconds: 30,
      expectedMaxSeconds: 60,
      hasAudio: true,
      audioEnabled: true,
    },
    {
      id: "longtalk-a",
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
    {
      id: "longtalk-b",
      unitId,
      orderIndex: 3,
      taskType: "long_talk",
      title: "Long Talk 2",
      instructions:
        "Prompt stays visible. Speak for 30–60 seconds about your typical weekday. Mention morning, afternoon, and evening activities.",
      expectedMinSeconds: 30,
      expectedMaxSeconds: 60,
      hasAudio: true,
      audioEnabled: true,
    },
    {
      id: "image-1",
      unitId,
      orderIndex: 4,
      taskType: "image",
      title: "Picture Description",
      instructions:
        "Describe the picture in 4–6 sentences. Mention what you see, actions, and possible context. Audio instruction enabled.",
      expectedMinSeconds: 30,
      expectedMaxSeconds: 60,
      hasAudio: true,
      audioEnabled: true,
    },
    {
      id: "thisorthat-1",
      unitId,
      orderIndex: 5,
      taskType: "this_or_that",
      title: "Quick Opinions",
      instructions: "Give a quick opinion (2–3 sentences) for each choice.",
      items: [
        { id: "tot-1-q1", orderIndex: 1, promptText: "Staying home or going out?" },
        { id: "tot-1-q2", orderIndex: 2, promptText: "Coffee or tea?" },
        { id: "tot-1-q3", orderIndex: 3, promptText: "Working alone or working with others?" },
        { id: "tot-1-q4", orderIndex: 4, promptText: "Studying in the morning or at night?" },
        { id: "tot-1-q5", orderIndex: 5, promptText: "Eating at home or eating out?" },
      ],
      expectedMinSeconds: 20,
      expectedMaxSeconds: 40,
      hasAudio: true,
      audioEnabled: false,
    },
    {
      id: "gateway-1",
      unitId,
      orderIndex: 6,
      taskType: "gateway",
      title: "A Day in Your Life",
      instructions:
        "Capstone: Combine what you practiced. Give a 45–60 second talk about a full day in your life.",
      expectedMinSeconds: 45,
      expectedMaxSeconds: 60,
      hasAudio: true,
      audioEnabled: false,
    },
  ],
};

