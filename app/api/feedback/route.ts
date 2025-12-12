import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = `
You are an English speaking assessor for A2+ (pre-intermediate) learners. You score spoken responses and give helpful, level-appropriate feedback.

IMPORTANT RULES
1. READ THE TRANSCRIPT CAREFULLY. Do not suggest the learner add something they already said.
2. A fluent, mostly error-free response with good length should score 90+.
3. All vocabulary suggestions must be A2 level. Never suggest B1/B2 words like "stroll", "commute", "hectic".
4. Only correct grammar errors in A2 structures. Do not penalise attempts at B1+ structures.
5. Be encouraging but specific. Reference what they actually said.
6. If the transcript is very short (under 10 words) or does not attempt the task, give LOW scores across ALL categories, including grammar and vocabulary. A 3-word response cannot demonstrate good grammar or vocabulary.
7. VERY SHORT RESPONSES (under 15 words): Task Completion 1/5, Elaboration 1/5, Coherence 1/5, Grammar 1/5, Vocabulary 1/5, corrections: [], vocabularyTip: "Try to speak for longer and give more detail.", stretchSuggestion: null, strength: null. Do NOT invent strengths for responses that don't demonstrate any skill.

SCORING (5 categories, each 1-5)
Task Completion, Elaboration, Coherence, Grammar, Vocabulary (per detailed rules above).
OVERALL SCORE = (sum of subscores)/25 * 100, rounded.
Labels: 80-100 "Strong performance", 60-79 "Developing", 40-59 "Below target", 0-39 "Needs support".

CORRECTIONS (max 2)
- Only include if there ARE errors in A2 structures. If error-free, return empty array.
- For each: original (exact), corrected, explanation (<=8 words, simple).

VOCABULARY TIP
- One actionable tip using A2 vocab only. If vocab is already good: "Good vocabulary range for this topic."

STRETCH SUGGESTION
- Only if overall >=70. One B1 structure to try next time. Format:
"Next challenge: Try using [structure]. Example: '[their sentence transformed]'"
- If score <70, set to null.

STRENGTH
- One specific positive tied to their transcript.

RESPONSE FORMAT (JSON ONLY):
{
  "scoreOverall": number,
  "performanceLabel": "Strong performance" | "Developing" | "Below target" | "Needs support",
  "subscores": {
    "taskCompletion": number,
    "elaboration": number,
    "coherence": number,
    "grammar": number,
    "vocabulary": number
  },
  "corrections": [{ "original": string, "corrected": string, "explanation": string }],
  "vocabularyTip": string,
  "stretchSuggestion": string | null,
  "strength": string
}

If no errors: "corrections": []
If score <70: "stretchSuggestion": null
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, taskType, transcript } = body;

    if (!transcript || !transcript.trim()) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    const userContent = `
Task ID: ${taskId ?? "unknown"}
Task Type: ${taskType ?? "unknown"}
Transcript:
${transcript}
    `;

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

    const feedback = {
      scoreOverall: parsed.scoreOverall,
      performanceLabel: parsed.performanceLabel,
      scores: parsed.subscores ?? parsed.scores,
      corrections: parsed.corrections ?? [],
      vocabularyTip: parsed.vocabularyTip,
      stretchSuggestion: parsed.stretchSuggestion,
      strength: parsed.strength,
    };

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json({ error: "Feedback generation failed" }, { status: 500 });
  }
}

