import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = `You are a friendly English speaking coach helping A2+ (pre-intermediate) learners understand their speaking practice feedback.

You have access to:
- Their spoken transcript
- Their scores (overall and 5 subscores: Task Completion, Elaboration, Coherence, Grammar, Vocabulary)
- The task they completed
- Any corrections and feedback already given

Your role:
- Explain why they got a particular score in simple, encouraging language
- Give specific examples from their transcript
- Suggest concrete improvements they can practice
- Answer questions about English grammar, vocabulary, or speaking skills
- Provide study tips and advice for improving their English
- Be warm, supportive, and patient — remember they are learning

Rules:
- Keep explanations simple (A2+ level understanding)
- Be encouraging but honest
- Use examples from what they actually said
- If asked about something unrelated to English learning or their feedback, politely redirect: "I'm here to help with your English practice! Is there anything about your speaking feedback I can help explain?"
- Never be harsh or discouraging
- Keep responses concise (2-4 sentences usually, unless they ask for more detail)

Response style:
- Friendly and conversational
- Use simple vocabulary
- Avoid jargon
- Include emoji occasionally to be warm 😊`;

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

    // Build context summary for GPT
    const contextSummary = `
## Student's Attempt Context

**Task:** ${feedbackContext.taskTitle}
**Instructions:** ${feedbackContext.taskInstructions}
**Prompt:** ${feedbackContext.taskPrompt}

**What they said (transcript):**
"${feedbackContext.transcript}"

**Their Score:** ${feedbackContext.scoreOverall}/100 (${feedbackContext.performanceLabel})

**Subscores (each out of 5):**
- Task Completion: ${feedbackContext.scores.taskCompletion}/5
- Elaboration: ${feedbackContext.scores.elaboration}/5
- Coherence: ${feedbackContext.scores.coherence}/5
- Grammar: ${feedbackContext.scores.grammar}/5
- Vocabulary: ${feedbackContext.scores.vocabulary}/5

**Corrections given:**
${feedbackContext.corrections.length > 0 
  ? feedbackContext.corrections.map(c => `- "${c.original}" → "${c.corrected}" (${c.explanation})`).join("\n")
  : "None - their grammar was good!"}

**Vocabulary tip:** ${feedbackContext.vocabularyTip || "None given"}

**Strength noted:** ${feedbackContext.strength || "None noted"}
`;

    // Build messages array
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here is the context for this student's attempt:\n${contextSummary}\n\nPlease use this context to answer their questions.` },
      { role: "assistant", content: "Got it! I've reviewed the student's speaking attempt and feedback. I'm ready to help them understand their score and improve their English. 😊" },
    ];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current message
    messages.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 300,
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
