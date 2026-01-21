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

// Task-specific rubric definitions
const taskRubrics: Record<string, string> = {
  qa: `
## TASK ACHIEVEMENT (Q&A)
*Did they answer each question appropriately?*
| Score | Description |
| 5 | Answers the question directly with relevant detail. Response feels complete. |
| 4 | Answers the question clearly. May lack a small detail but is appropriate. |
| 3 | Answers the question but response is thin or slightly off-focus. |
| 2 | Partial answer. Missing key information or drifts from the question. |
| 1 | Attempts to answer but response is largely incomprehensible or irrelevant. |
| 0 | No attempt. Silent, off-topic, or completely incomprehensible. |
`,
  long_talk: `
## TASK ACHIEVEMENT (Long Talk)
*Did they speak for the required time and cover the topic?*
| Score | Description |
| 5 | Speaks for 45-60s. Covers the topic fully with clear beginning, middle, end. |
| 4 | Speaks for 35-50s. Covers most of the topic. Minor gaps in coverage. |
| 3 | Speaks for 25-40s. Covers the topic partially. Some aspects missing. |
| 2 | Speaks for 15-30s. Limited coverage. Stops early or goes off topic. |
| 1 | Under 15s or barely addresses the topic. |
| 0 | No attempt. Silent, completely off-topic, or incomprehensible throughout. |
`,
  mediation: `
## TASK ACHIEVEMENT (Mediation)
*Did they summarise the key information from all speakers?*
| Score | Description |
| 5 | Summarises all 3 speakers accurately. Key points clearly conveyed. |
| 4 | Summarises most information. One speaker or minor detail missing. |
| 3 | Summarises some information. Gaps in coverage or minor inaccuracies. |
| 2 | Limited summary. Misses significant information or confuses speakers. |
| 1 | Attempts summary but major misunderstanding or most content missing. |
| 0 | No attempt. Silent, completely off-topic, or incomprehensible. |

## COMPREHENSION (Mediation only)
*Did they understand what they heard?*
| Score | Description |
| 5 | Demonstrates full understanding. Key points accurately captured. |
| 4 | Good understanding. Minor details missed but main ideas correct. |
| 3 | Partial understanding. Some correct points but gaps or small errors. |
| 2 | Limited understanding. Misses or distorts key information. |
| 1 | Little understanding demonstrated. Major misinterpretation. |
| 0 | No understanding demonstrated. Silent or completely wrong. |
`,
  image: `
## TASK ACHIEVEMENT (Image Description)
*Did they describe the picture with appropriate detail?*
| Score | Description |
| 5 | Describes people, place, and actions clearly. Adds context or speculation. |
| 4 | Describes most elements. May miss one aspect (e.g., place or actions). |
| 3 | Partial description. Covers some elements but lacks detail. |
| 2 | Limited description. Only mentions one or two things in the image. |
| 1 | Attempts description but barely relevant or very unclear. |
| 0 | No attempt. Silent, completely off-topic, or incomprehensible. |
`,
  this_or_that: `
## TASK ACHIEVEMENT (This or That)
*Did they state a preference and give a reason for each pair?*
| Score | Description |
| 5 | States clear preference + reason for all 5 pairs. |
| 4 | States preference + reason for 4 pairs. One may lack a reason. |
| 3 | States preference for most pairs. Reasons are weak or missing for 2+. |
| 2 | States preferences but rarely gives reasons. Or misses several pairs. |
| 1 | Attempts task but engages with only 1-2 pairs meaningfully. |
| 0 | No attempt. Silent, completely off-topic, or incomprehensible. |

## FLUENCY (This or That only)
*Did they speak smoothly without excessive hesitation?*
| Score | Description |
| 5 | Speaks smoothly with natural pace. Minimal hesitation or filler words. |
| 4 | Generally fluent. Occasional pauses but recovers well. |
| 3 | Some hesitation. Noticeable pauses or filler words (um, uh, like) but manages. |
| 2 | Frequent hesitation. Long pauses. Struggles to maintain flow. |
| 1 | Very halting. Constant stops. Difficult to follow due to broken delivery. |
| 0 | No speech. Silent or only filler words/sounds. |

**Note:** At A2+ level, some hesitation is normal. We're looking for ability to keep going, not native-like fluency.
`,
  gateway: `
## TASK ACHIEVEMENT (Gateway)
*Extended talk combining multiple skills. Did they address the full scope?*
| Score | Description |
| 5 | Addresses all aspects comprehensively (60-90s). Well-structured response. |
| 4 | Addresses most aspects. Good coverage with minor gaps. |
| 3 | Addresses some aspects. Noticeable gaps in coverage. |
| 2 | Limited response. Significant aspects missing. |
| 1 | Attempts task but barely addresses it. |
| 0 | No attempt. Silent, completely off-topic, or incomprehensible. |
`,
};

// Common rubric sections used by multiple task types
const commonRubrics = `
## ELABORATION
*Did they expand beyond the minimum? Add detail, examples, or explanation?*
| Score | Description |
| 5 | Consistently adds detail, examples, or personal context. Response feels rich. |
| 4 | Usually elaborates. Most responses have some added detail. |
| 3 | Some elaboration. Responses are functional but could say more. |
| 2 | Minimal elaboration. Responses are short and bare. |
| 1 | Almost no elaboration. Single words or very short phrases. |
| 0 | No elaboration possible. Silent or incomprehensible. |

**Examples at A2+ level:**
- Score 5: "I usually wake up at 7, but on weekends I sleep until 9 because I stay up late watching TV."
- Score 3: "I wake up at 7. Then I have breakfast."
- Score 1: "Seven."
- Score 0: [silence] or "Um... uh..."

## COHESION
*Is the response organised and connected logically?*
| Score | Description |
| 5 | Clear structure. Uses connectors naturally (first, then, because, so, but). |
| 4 | Good structure. Uses some connectors. Flow is easy to follow. |
| 3 | Acceptable structure. Limited connectors. Some jumps but understandable. |
| 2 | Weak structure. Ideas feel disconnected. Hard to follow at times. |
| 1 | Very weak structure. Random ideas with little logical connection. |
| 0 | No structure assessable. Silent or incomprehensible. |

**Connectors expected at A2+:** first, then, after that, finally, next, because, so, but, however, and, also

## RANGE (Vocabulary)
*Do they use a variety of words appropriate to the topic?*
| Score | Description |
| 5 | Good variety of vocabulary for A2+ level. Uses topic-specific words naturally. |
| 4 | Adequate variety. Some good word choices. Occasional repetition. |
| 3 | Limited variety. Relies on basic/common words. Gets the job done. |
| 2 | Very limited. Repeats same words. Struggles to express ideas. |
| 1 | Extremely limited. Cannot express basic ideas due to vocabulary gaps. |
| 0 | No vocabulary assessable. Silent or incomprehensible. |

**A2+ vocabulary expectations:**
- Daily routine: wake up, get ready, commute, have a break, relax, stay up late
- Preferences: prefer, enjoy, like...more than, can't stand
- Description: wearing, holding, looks like, seems, probably

## ACCURACY (Grammar)
*Do they use grammar correctly for their level?*
| Score | Description |
| 5 | Good control of A2 grammar. Errors rare and don't impede understanding. |
| 4 | Generally accurate. Some errors but meaning is clear. |
| 3 | Noticeable errors but communication is still successful. |
| 2 | Frequent errors. Sometimes hard to understand the intended meaning. |
| 1 | Errors severely impede communication. Very difficult to understand. |
| 0 | No grammar assessable. Silent or incomprehensible. |

**A2+ grammar expectations:**
- Present simple (routines): "I usually go to work at 8."
- Present continuous (now/description): "She is wearing a red dress."
- Past simple (basic): "Yesterday I went to the park."
- Basic modals: can, have to, want to
- Prepositions of time/place: at, in, on, to, from
`;

// Build the system prompt dynamically based on task type
function buildSystemPrompt(taskType: string): string {
  const config = taskCriteriaConfig[taskType] || taskCriteriaConfig.long_talk;
  const taskRubric = taskRubrics[taskType] || taskRubrics.long_talk;
  const criteriaList = config.criteria.join(", ");
  const scoreKeysList = config.scoreKeys.join(", ");
  const numCriteria = config.criteria.length;

  return `
You are an English speaking assessor for A2+ (pre-intermediate) learners. You score spoken responses and give helpful, level-appropriate feedback.

## TASK TYPE: ${taskType.toUpperCase()}
## CRITERIA: ${criteriaList}
## NUMBER OF CRITERIA: ${numCriteria}

${taskRubric}

${commonRubrics}

## SCORING RULES
1. Score each criterion 0-5 using the rubrics above.
2. Score keys to use: ${scoreKeysList}
3. Be fair but encouraging. A2+ learners are still developing.
4. Use the exact score key names in your JSON response.

## CRITICAL: WHEN TO GIVE 0
- If the transcript is empty, silent, or contains only filler words (um, uh, hmm, etc.) → ALL scores = 0
- If the response is completely off-topic and does not address the task at all → ALL scores = 0
- If the response is incomprehensible throughout → ALL scores = 0
- A score of 1 means they ATTEMPTED the task but did it very poorly
- A score of 0 means NO meaningful attempt was made

## OVERALL SCORE CALCULATION
- Sum all subscores and calculate: (sum / ${numCriteria * 5}) * 100
- Round to nearest integer.
Labels: 80-100 "Strong performance", 60-79 "Developing", 40-59 "Below target", 0-39 "Needs support".

## CORRECTIONS (max 2)
- Only include if there ARE errors in A2 structures. If error-free or no speech, return empty array.
- ONLY correct when there is a clear error. Avoid stylistic preferences.
- For each: original (exact), corrected, explanation (<=8 words, simple).

## VOCABULARY TIP
- One actionable tip using A2 vocab only. If vocab is already good: "Good vocabulary range for this topic."
- If no speech: "Try to speak more next time. Start with simple sentences."

## STRETCH SUGGESTION
- Only if overall >=70. One B1 structure to try next time. If score <70, set to null.

## STRENGTH
- One specific positive tied to their transcript.
- If no meaningful speech: "You started the recording - that's the first step! Try again and speak about the topic."

## RESPONSE FORMAT (JSON ONLY):
{
  "scoreOverall": number,
  "performanceLabel": "Strong performance" | "Developing" | "Below target" | "Needs support",
  "subscores": {
    ${config.scoreKeys.map(k => `"${k}": number`).join(",\n    ")}
  },
  "corrections": [{ "original": string, "corrected": string, "explanation": string }],
  "vocabularyTip": string,
  "stretchSuggestion": string | null,
  "strength": string
}

If no errors: "corrections": []
If score <70: "stretchSuggestion": null
`;
}

// =============================================================================
// TRANSCRIPT VALIDATION - Catches hallucinations and prompt leakage
// =============================================================================
function validateTranscript(transcript: string): { valid: boolean; reason?: string; isEmpty?: boolean } {
  if (!transcript || typeof transcript !== "string") {
    return { valid: false, reason: "There was a problem with your recording. Please try again." };
  }

  const trimmed = transcript.trim();
  const normalized = trimmed.toLowerCase();

  // Check minimum length (less than 10 characters is too short)
  if (trimmed.length < 10) {
    return { valid: false, reason: "Your recording was too short. Please speak for at least 15-20 seconds." };
  }

  // Check minimum word count
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 5) {
    return { valid: false, reason: "Your recording was too short. Please speak for at least 15-20 seconds." };
  }

  // Check for system prompt leakage
  const promptLeakagePhrases = [
    "do not correct",
    "do not fix",
    "do not remove",
    "do not clean up",
    "keep every error",
    "this is a language learner assessment",
    "filler words like um",
    "false starts or repetitions",
  ];
  for (const phrase of promptLeakagePhrases) {
    if (normalized.includes(phrase)) {
      return { valid: false, reason: "There was a problem with your recording. Please try again." };
    }
  }

  // Check for common Whisper hallucinations
  const hallucinationPhrases = [
    "thank you for watching",
    "thanks for watching",
    "please subscribe",
    "like and subscribe",
    "see you next time",
    "watching my video",
    "thanks for listening",
    "thank you for listening",
    "don't forget to subscribe",
    "hit the bell",
    "in the next video",
    "bye for now",
    "see you in the next",
    "music playing",
    "[music]",
    "[applause]",
    "subtitles by",
    "captions by",
  ];
  for (const phrase of hallucinationPhrases) {
    if (normalized.includes(phrase)) {
      return { valid: false, reason: "There was a problem with your recording. Please try again." };
    }
  }

  // Check for repeated phrases (hallucination indicator)
  // Matches any phrase of 10+ characters repeated 3+ times
  const repeatedPhrasePattern = /(.{10,})\1{2,}/gi;
  if (repeatedPhrasePattern.test(trimmed)) {
    return { valid: false, reason: "There was a problem with your recording. Please try again." };
  }

  // Check for specific repetitive nonsense patterns
  const repetitivePatterns = [
    /we['']re going to be able to do it/gi,
    /I['']m going to be able to/gi,
  ];
  for (const pattern of repetitivePatterns) {
    const matches = trimmed.match(pattern) || [];
    if (matches.length >= 2) {
      return { valid: false, reason: "There was a problem with your recording. Please try again." };
    }
  }

  // Check if transcript is mostly filler words (indicates silence/no real content)
  const fillerPattern = /^[\s]*(um+|uh+|hmm+|ah+|er+|oh+|like|you know|so|well|\.+|\,+|\s+)+[\s]*$/i;
  if (fillerPattern.test(trimmed)) {
    return { valid: true, isEmpty: true }; // Valid but empty - will get 0 scores
  }

  // Check word count - if very short, flag as potentially empty
  const meaningfulWords = trimmed.split(/\s+/).filter(word => 
    !['um', 'uh', 'hmm', 'ah', 'er', 'oh', 'like', 'so', 'well', 'and', 'the', 'a', 'an'].includes(word.toLowerCase().replace(/[.,!?]/g, ''))
  );
  if (meaningfulWords.length < 3) {
    return { valid: true, isEmpty: true }; // Valid but essentially empty
  }

  return { valid: true, isEmpty: false };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, taskType, taskTitle, taskInstructions, taskPrompt, taskItems, transcript } = body;

    // Get config for this task type
    const config = taskCriteriaConfig[taskType] || taskCriteriaConfig.long_talk;

    // =============================================================================
    // STEP 1: Validate transcript (catches hallucinations, prompt leakage, etc.)
    // =============================================================================
    const validation = validateTranscript(transcript);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: validation.reason 
      }, { status: 400 });
    }

    // =============================================================================
    // STEP 1.5: Handle empty/filler-only transcripts - return 0 scores immediately
    // =============================================================================
    if (validation.isEmpty) {
      const zeroScores: Record<string, number> = {};
      config.scoreKeys.forEach(key => {
        zeroScores[key] = 0;
      });

      const feedback = {
        scoreOverall: 0,
        performanceLabel: "Needs support",
        scores: zeroScores,
        corrections: [],
        vocabularyTip: "Try to speak more next time. Start with simple sentences about the topic.",
        stretchSuggestion: null,
        strength: "You started the recording - that's the first step! Try again and speak about the topic.",
      };
      console.log(`[feedback] Task: ${taskType}, Empty transcript detected, returning 0 scores`);
      return NextResponse.json({ feedback });
    }

    // Simple off-topic / meta-speech heuristic before calling GPT
    const normalizedTranscript = transcript.toLowerCase();
    const offTopicSignals = ["feedback", "teacher", "class", "cheat", "cheating", "request", "previous teacher"];
    const routineSignals = ["morning", "evening", "breakfast", "lunch", "dinner", "work", "school", "weekend", "routine", "day"];
    const hasOffTopicSignal = offTopicSignals.some((w) => normalizedTranscript.includes(w));
    const hasRoutineSignal = routineSignals.some((w) => normalizedTranscript.includes(w));
    if (hasOffTopicSignal && !hasRoutineSignal) {
      const zeroScores: Record<string, number> = {};
      config.scoreKeys.forEach(key => {
        zeroScores[key] = 0;
      });

      const feedback = {
        scoreOverall: 0,
        performanceLabel: "Try again",
        scores: zeroScores,
        corrections: [],
        vocabularyTip: null,
        stretchSuggestion: null,
        strength: null,
        invalidReason: "Your response was not on topic. Please try again and answer the prompt.",
      };
      return NextResponse.json({ feedback });
    }

    // Format task items if provided (for qa, this_or_that tasks)
    const formattedItems = taskItems?.length
      ? taskItems.map((item: { orderIndex: number; promptText: string }, idx: number) => 
          `${item.orderIndex ?? idx + 1}. ${item.promptText}`
        ).join("\n")
      : null;

    const userContent = `
Task ID: ${taskId ?? "unknown"}
Task Type: ${taskType ?? "unknown"}
Task Title: ${taskTitle ?? "unknown"}
Task Instructions: ${taskInstructions ?? "not provided"}
Task Prompt: ${taskPrompt ?? "not provided"}
${formattedItems ? `\nTask Items (${taskItems.length} total - student must address ALL):\n${formattedItems}` : ""}
Transcript:
${transcript}
    `;

    // Build the system prompt dynamically based on task type
    const systemPrompt = buildSystemPrompt(taskType || "long_talk");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No feedback generated" }, { status: 500 });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Feedback JSON parse error:", e, content);
      return NextResponse.json({ error: "Invalid feedback format" }, { status: 500 });
    }

    const scores = parsed.subscores ?? parsed.scores;

    // Calculate overall score server-side — never trust GPT's arithmetic
    let calculatedOverall = 0;
    if (scores) {
      const numCriteria = config.scoreKeys.length;
      const maxScore = numCriteria * 5;
      let sum = 0;
      config.scoreKeys.forEach(key => {
        sum += scores[key] || 0;
      });
      calculatedOverall = Math.round((sum / maxScore) * 100);
    }

    // Determine performance label based on calculated score
    const getPerformanceLabel = (score: number): string => {
      if (score >= 80) return "Strong performance";
      if (score >= 60) return "Developing";
      if (score >= 40) return "Below target";
      return "Needs support";
    };

    const feedback = {
      scoreOverall: calculatedOverall,
      performanceLabel: getPerformanceLabel(calculatedOverall),
      scores: scores,
      corrections: parsed.corrections ?? [],
      vocabularyTip: parsed.vocabularyTip,
      stretchSuggestion: parsed.stretchSuggestion,
      strength: parsed.strength,
    };

    console.log(`[feedback] Task: ${taskType}, Subscores: ${JSON.stringify(scores)}, Calculated overall: ${calculatedOverall}`);

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json({ error: "Feedback generation failed" }, { status: 500 });
  }
}
