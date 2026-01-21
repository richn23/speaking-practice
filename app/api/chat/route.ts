import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Task-specific criteria configuration
const taskCriteriaConfig: Record<string, {
  criteria: string[];
  scoreKeys: string[];
}> = {
  qa: {
    criteria: ["Task Achievement", "Elaboration", "Range", "Accuracy"],
    scoreKeys: ["taskCompletion", "elaboration", "vocabulary", "grammar"],
  },
  long_talk: {
    criteria: ["Task Achievement", "Elaboration", "Cohesion", "Range", "Accuracy"],
    scoreKeys: ["taskCompletion", "elaboration", "coherence", "vocabulary", "grammar"],
  },
  mediation: {
    criteria: ["Task Achievement", "Comprehension", "Cohesion", "Range", "Accuracy"],
    scoreKeys: ["taskCompletion", "comprehension", "coherence", "vocabulary", "grammar"],
  },
  image: {
    criteria: ["Task Achievement", "Elaboration", "Cohesion", "Range", "Accuracy"],
    scoreKeys: ["taskCompletion", "elaboration", "coherence", "vocabulary", "grammar"],
  },
  this_or_that: {
    criteria: ["Task Achievement", "Elaboration", "Fluency", "Range", "Accuracy"],
    scoreKeys: ["taskCompletion", "elaboration", "fluency", "vocabulary", "grammar"],
  },
  gateway: {
    criteria: ["Task Achievement", "Elaboration", "Cohesion", "Range", "Accuracy"],
    scoreKeys: ["taskCompletion", "elaboration", "coherence", "vocabulary", "grammar"],
  },
};

// Task-specific rubric explanations (simplified for A2 learners)
const taskRubricExplanations: Record<string, string> = {
  qa: `
## What the scores mean for Q&A tasks:

**Task Achievement** (Did you answer the question?)
- 5 = You answered well with good details
- 4 = You answered clearly, maybe missing a small thing
- 3 = You answered but it was short or a bit unclear
- 2 = You only answered part of it
- 1 = You didn't really answer the question

**Elaboration** (Did you say enough?)
- 5 = You gave lots of details and examples
- 4 = You gave some good details
- 3 = You said enough but could say more
- 2 = Very short answers
- 1 = Only one or two words

**Range** (Vocabulary - Did you use good words?)
- 5 = You used many different words well
- 4 = Good words, sometimes you repeated
- 3 = Basic words, but OK
- 2 = Very few words, lots of repeating
- 1 = Not enough words to say what you mean

**Accuracy** (Grammar - Is your grammar correct?)
- 5 = Very few mistakes
- 4 = Some small mistakes but easy to understand
- 3 = Mistakes but I can still understand you
- 2 = Many mistakes, sometimes hard to understand
- 1 = Too many mistakes, very hard to understand
`,
  long_talk: `
## What the scores mean for Long Talk tasks:

**Task Achievement** (Did you talk about the topic for long enough?)
- 5 = You talked for 45-60 seconds with a good beginning, middle, and end
- 4 = You talked for 35-50 seconds, covered most of the topic
- 3 = You talked for 25-40 seconds, some things missing
- 2 = You talked for 15-30 seconds, stopped early
- 1 = Under 15 seconds or not about the topic

**Elaboration** (Did you give details?)
- 5 = Lots of details and examples
- 4 = Good details most of the time
- 3 = Some details but could say more
- 2 = Very short, not many details
- 1 = Almost no details

**Cohesion** (Is it organised? Did you use connecting words?)
- 5 = Clear structure, good words like "first", "then", "because"
- 4 = Good structure, some connecting words
- 3 = OK structure, few connecting words
- 2 = Hard to follow, ideas jump around
- 1 = No structure, random ideas

**Range** (Vocabulary)
- 5 = Many different words for the topic
- 4 = Good words, sometimes repeated
- 3 = Basic words but OK
- 2 = Very few words
- 1 = Not enough words

**Accuracy** (Grammar)
- 5 = Very few mistakes
- 4 = Some mistakes but clear
- 3 = Mistakes but understandable
- 2 = Many mistakes
- 1 = Too many mistakes
`,
  mediation: `
## What the scores mean for Listen & Summarise tasks:

**Task Achievement** (Did you summarise what you heard?)
- 5 = You told us about all 3 speakers correctly
- 4 = You told us most things, maybe missed one small detail
- 3 = You told us some things, some gaps or small mistakes
- 2 = You missed a lot or mixed up the speakers
- 1 = You didn't really summarise what they said

**Comprehension** (Did you understand what you heard?)
- 5 = You understood everything correctly
- 4 = You understood the main ideas, missed small things
- 3 = You understood some parts, some mistakes
- 2 = You missed or changed important things
- 1 = You didn't understand what they said

**Cohesion** (Is it organised?)
- 5 = Clear structure, good connecting words
- 4 = Good structure, some connecting words
- 3 = OK structure
- 2 = Hard to follow
- 1 = No structure

**Range** (Vocabulary)
- 5 = Good variety of words
- 4 = Good words, some repeating
- 3 = Basic words
- 2 = Very few words
- 1 = Not enough words

**Accuracy** (Grammar)
- 5 = Very few mistakes
- 4 = Some mistakes but clear
- 3 = Mistakes but understandable
- 2 = Many mistakes
- 1 = Too many mistakes
`,
  image: `
## What the scores mean for Picture Description tasks:

**Task Achievement** (Did you describe the picture well?)
- 5 = You talked about people, place, and what's happening
- 4 = You described most things, maybe missed one part
- 3 = You described some things but not much detail
- 2 = You only said one or two things
- 1 = You didn't really describe the picture

**Elaboration** (Did you give details?)
- 5 = Lots of details about what you see
- 4 = Good details most of the time
- 3 = Some details
- 2 = Very few details
- 1 = Almost no details

**Cohesion** (Is it organised?)
- 5 = Clear structure, good connecting words
- 4 = Good structure
- 3 = OK structure
- 2 = Hard to follow
- 1 = No structure

**Range** (Vocabulary)
- 5 = Good variety of describing words
- 4 = Good words
- 3 = Basic words
- 2 = Very few words
- 1 = Not enough words

**Accuracy** (Grammar)
- 5 = Very few mistakes
- 4 = Some mistakes but clear
- 3 = Mistakes but understandable
- 2 = Many mistakes
- 1 = Too many mistakes
`,
  this_or_that: `
## What the scores mean for Quick Opinions tasks:

**Task Achievement** (Did you choose and give a reason for each one?)
- 5 = You chose and gave a reason for all 5
- 4 = You did 4 well, maybe one had no reason
- 3 = You did most but some had no reasons
- 2 = You chose but rarely gave reasons
- 1 = You didn't really engage with the choices

**Elaboration** (Did you explain your choices?)
- 5 = Good explanations with examples
- 4 = Good explanations most of the time
- 3 = Some explanations
- 2 = Very short, almost no explanation
- 1 = No explanations

**Fluency** (Did you speak smoothly without stopping too much?)
- 5 = Smooth speaking, natural speed, few "um" or "uh"
- 4 = Generally smooth, sometimes paused but continued well
- 3 = Some pauses and "um/uh" but you kept going
- 2 = Many pauses, hard to keep going
- 1 = Very stop-start, lots of long pauses

Note: It's normal to pause a little at A2 level! We want to see you keep trying.

**Range** (Vocabulary)
- 5 = Good variety of words
- 4 = Good words
- 3 = Basic words
- 2 = Very few words
- 1 = Not enough words

**Accuracy** (Grammar)
- 5 = Very few mistakes
- 4 = Some mistakes but clear
- 3 = Mistakes but understandable
- 2 = Many mistakes
- 1 = Too many mistakes
`,
  gateway: `
## What the scores mean for Gateway tasks:

**Task Achievement** (Did you cover everything?)
- 5 = You talked for 60-90 seconds and covered all parts
- 4 = Good coverage with small gaps
- 3 = Covered some parts, noticeable gaps
- 2 = Missing important parts
- 1 = Didn't address the task

**Elaboration** (Did you give details?)
- 5 = Lots of details and examples
- 4 = Good details
- 3 = Some details
- 2 = Few details
- 1 = No details

**Cohesion** (Is it organised?)
- 5 = Clear structure, good connecting words
- 4 = Good structure
- 3 = OK structure
- 2 = Hard to follow
- 1 = No structure

**Range** (Vocabulary)
- 5 = Good variety of words
- 4 = Good words
- 3 = Basic words
- 2 = Few words
- 1 = Not enough words

**Accuracy** (Grammar)
- 5 = Very few mistakes
- 4 = Some mistakes but clear
- 3 = Mistakes but understandable
- 2 = Many mistakes
- 1 = Too many mistakes
`,
};

const systemPrompt = `You are a friendly English speaking coach for A2 level learners.

IMPORTANT LANGUAGE RULES:
- Detect what language the student writes in
- Reply in the SAME language they use
- If they write in Arabic, reply in Arabic
- If they write in English, reply in English
- Always use very simple words (A1-A2 level)

You know about:
- Their spoken words (transcript)
- Their scores (overall and subscores)
- Their grammar mistakes and corrections
- Their pronunciation (which words were unclear)
- Their fluency (how smooth they spoke)
- The RUBRIC that explains what each score means

Your job:
- Explain their score in simple words
- Use the RUBRIC to explain what scores mean
- Give examples from what they said
- Help them improve
- Answer questions about English

Rules:
- Use SHORT sentences
- Use SIMPLE words only
- Be friendly and kind
- Use emoji sometimes 😊
- Maximum 3-4 sentences per reply
- Never use difficult words like "comprehensive", "demonstrate", "effectively"
- When explaining a score, tell them what that number means using the rubric

Example good reply:
"You got 3/5 for grammar. That means you made some mistakes but I can still understand you. You said 'I go yesterday' but we say 'I went yesterday'. Try using past tense next time! 😊"

Example bad reply (too complex):
"Your grammatical accuracy score reflects some challenges with past tense conjugation that impacted your overall performance."`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FeedbackContext {
  transcript: string;
  taskTitle: string;
  taskInstructions: string;
  taskPrompt: string;
  scoreOverall: number;
  performanceLabel: string;
  scores: {
    taskCompletion: number;
    elaboration: number;
    coherence?: number;
    comprehension?: number;
    fluency?: number;
    grammar: number;
    vocabulary: number;
  };
  corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  vocabularyTip: string;
  strength: string;
  pronunciationData?: {
    overallScore: number;
    fluencyScore?: number;
    problemWords: Array<{
      word: string;
      score: number;
      ipa?: string;
      heardAs?: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory, taskType, feedbackContext } = body as {
      message: string;
      conversationHistory: ChatMessage[];
      taskType?: string;
      feedbackContext: FeedbackContext;
    };

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    // Get the config and rubric for this task type
    const effectiveTaskType = taskType || "long_talk";
    const config = taskCriteriaConfig[effectiveTaskType] || taskCriteriaConfig.long_talk;
    const rubricExplanation = taskRubricExplanations[effectiveTaskType] || taskRubricExplanations.long_talk;

    // Build pronunciation section
    let pronunciationSection = "No pronunciation data available.";
    if (feedbackContext.pronunciationData) {
      const pronData = feedbackContext.pronunciationData;
      pronunciationSection = `Pronunciation score: ${pronData.overallScore}/100`;
      
      if (pronData.fluencyScore !== undefined) {
        pronunciationSection += `\nFluency score: ${pronData.fluencyScore}/100`;
      }
      
      if (pronData.problemWords && pronData.problemWords.length > 0) {
        pronunciationSection += `\n\nWords they had trouble with:`;
        pronData.problemWords.forEach(word => {
          pronunciationSection += `\n- "${word.word}"`;
          if (word.heardAs) {
            pronunciationSection += ` (we heard: ${word.heardAs})`;
          }
          if (word.ipa) {
            pronunciationSection += ` (correct: ${word.ipa})`;
          }
        });
      } else {
        pronunciationSection += `\nNo problem words - pronunciation was clear!`;
      }
    }

    // Build scores section based on task type
    const buildScoresSection = () => {
      const scores = feedbackContext.scores;
      const lines: string[] = [];
      
      config.criteria.forEach((criterion, index) => {
        const key = config.scoreKeys[index] as keyof typeof scores;
        const value = scores[key] ?? 0;
        lines.push(`- ${criterion}: ${value}/5`);
      });
      
      return lines.join("\n");
    };

    const contextSummary = `
## Student Info

Task Type: ${effectiveTaskType}
Task: ${feedbackContext.taskTitle}
What they said: "${feedbackContext.transcript}"

Overall Score: ${feedbackContext.scoreOverall}/100 (${feedbackContext.performanceLabel})

Subscores (each out of 5):
${buildScoresSection()}

Grammar Corrections:
${feedbackContext.corrections.length > 0 
  ? feedbackContext.corrections.map(c => `- They said "${c.original}" → Should be "${c.corrected}" (${c.explanation})`).join("\n")
  : "No corrections - grammar was good!"}

Pronunciation & Fluency:
${pronunciationSection}

Vocabulary tip: ${feedbackContext.vocabularyTip || "None"}
Strength: ${feedbackContext.strength || "None"}

---

## RUBRIC - Use this to explain what scores mean:
${rubricExplanation}
`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here is the student info and the rubric:\n${contextSummary}\n\nUse the RUBRIC to explain what their scores mean. Remember: simple words only!` },
      { role: "assistant", content: "OK! I will help the student understand their scores using simple words. 😊" },
    ];

    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 200,
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply) {
      return NextResponse.json({ error: "No response generated" }, { status: 500 });
    }

    return NextResponse.json({ reply });

  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
