import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = `You are a friendly English speaking coach for A2 level learners.

IMPORTANT LANGUAGE RULES:
- Detect what language the student writes in
- Reply in the SAME language they use
- If they write in Arabic, reply in Arabic
- If they write in English, reply in English
- Always use very simple words (A1-A2 level)

You know about:
- Their spoken words (transcript)
- Their scores
- Their mistakes and corrections

Your job:
- Explain their score in simple words
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

Example good reply:
"You got 3/5 for grammar. You said 'I go yesterday' but we say 'I went yesterday'. The word 'went' is past tense. Try again! 😊"

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
    coherence: number;
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory, feedbackContext } = body as {
      message: string;
      conversationHistory: ChatMessage[];
      feedbackContext: FeedbackContext;
    };

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    const contextSummary = `
## Student Info

Task: ${feedbackContext.taskTitle}
What they said: "${feedbackContext.transcript}"

Score: ${feedbackContext.scoreOverall}/100

Scores (each out of 5):
- Task Completion: ${feedbackContext.scores.taskCompletion}/5
- Elaboration: ${feedbackContext.scores.elaboration}/5
- Coherence: ${feedbackContext.scores.coherence}/5
- Grammar: ${feedbackContext.scores.grammar}/5
- Vocabulary: ${feedbackContext.scores.vocabulary}/5

Corrections:
${feedbackContext.corrections.length > 0 
  ? feedbackContext.corrections.map(c => `- They said "${c.original}" → Should be "${c.corrected}" (${c.explanation})`).join("\n")
  : "No corrections - grammar was good!"}

Vocabulary tip: ${feedbackContext.vocabularyTip || "None"}
Strength: ${feedbackContext.strength || "None"}
`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here is the student info:\n${contextSummary}\n\nUse this to answer their questions. Remember: simple words only!` },
      { role: "assistant", content: "OK! I will help the student with simple words. 😊" },
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