import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { 
  taskSkillsMap, 
  taskFunctionMap, 
  skillRubrics,
  type SkillType,
  type FunctionType 
} from "@/lib/scoring-types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Build the skills section of the prompt based on task type
function buildSkillsPrompt(taskType: string): string {
  const skills = taskSkillsMap[taskType] || ["range", "accuracy", "fluency"];
  
  let prompt = "Score each skill 0-5 using these criteria:\n\n";
  
  for (const skill of skills) {
    const rubric = skillRubrics[skill];
    prompt += `### ${skill.toUpperCase()}\n`;
    for (let i = 0; i <= 5; i++) {
      prompt += `${i}: ${rubric[i]}\n`;
    }
    prompt += "\n";
  }
  
  return prompt;
}

// Task-specific instructions
const taskInstructions: Record<string, string> = {
  qa: `
Q&A TASK - Student answers spoken questions about their daily life.
Focus on: Did they answer the question? Did they give enough detail? Was grammar OK?
Interaction is key - did they actually respond to what was asked?
`,
  long_talk: `
LONG TALK TASK - Student speaks for 45-60 seconds on a topic.
Focus on: Can they sustain speech? Is there a logical flow? Do they use linking words?
Coherence matters here - look for organisation and connectors.
`,
  mediation: `
MEDIATION TASK - Student listens to audio then summarises what they heard.
Focus on: Did they capture the key points? Can they relay information from others?
This tests comprehension AND production - did they understand and convey it?
`,
  image: `
IMAGE DESCRIPTION TASK - Student describes a picture for 30-60 seconds.
Focus on: Do they describe what they see? Is there detail? Is it organised?
Look for: people, actions, objects, location, speculation about context.
`,
  this_or_that: `
THIS OR THAT TASK - Quick opinion responses to either/or questions.
Focus on: Speed of response, ability to justify briefly, fluency under pressure.
Short answers are OK here - it's about quick, natural responses.
`,
  gateway: `
GATEWAY TASK - Extended opinion/argument (60-90 seconds).
Focus on: Can they state an opinion AND support it? Do they give examples?
This is the most demanding - look for structure, reasoning, and development.
`,
};

export async function POST(request: NextRequest) {
  try {
    const { transcript, taskType, taskTitle, prompt, expectedMinSeconds, expectedMaxSeconds } = await request.json();

    // Validate input
    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
    }

    // Check for empty/near-empty transcripts
    const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 3) {
      // Return zero scores for essentially empty responses
      const skills = taskSkillsMap[taskType] || ["range", "accuracy", "fluency"];
      const zeroScores: Record<string, number> = {};
      skills.forEach(skill => zeroScores[skill] = 0);
      
      return NextResponse.json({
        taskType,
        function: taskFunctionMap[taskType]?.primary || "informing",
        secondaryFunction: taskFunctionMap[taskType]?.secondary,
        skills: zeroScores,
        overall: 0,
        transcript,
        corrections: [],
        strengths: [],
        improvements: ["Try to speak more - even a few sentences helps!"],
        feedback: "I didn't hear enough speech to give feedback. Try again and speak for longer.",
      });
    }

    const skills = taskSkillsMap[taskType] || ["range", "accuracy", "fluency"];
    const functionInfo = taskFunctionMap[taskType] || { primary: "informing" };
    
    const systemPrompt = `You are an English speaking assessor for A2+ level learners.

${taskInstructions[taskType] || ""}

## YOUR TASK
Assess this student's spoken response. Be encouraging but honest.

${buildSkillsPrompt(taskType)}

## IMPORTANT SCORING RULES
- 0 means NO language or completely off-topic
- 1-2 means significant problems
- 3 is "adequate" - meeting basic expectations
- 4-5 is good to excellent
- For A2+ level, 3/5 is actually a reasonable score
- Don't be too generous - be fair and accurate

## RESPONSE FORMAT
Return ONLY valid JSON:
{
  "skills": {
    ${skills.map(s => `"${s}": <0-5>`).join(",\n    ")}
  },
  "corrections": [
    {"original": "what they said wrong", "corrected": "correct version", "explanation": "brief reason"}
  ],
  "strengths": ["one or two things they did well"],
  "improvements": ["one specific thing to work on"],
  "feedback": "2-3 sentence summary for the student"
}

Keep corrections to max 3. Be specific and helpful.`;

    const userPrompt = `Task: ${taskTitle}
Task Type: ${taskType}
Expected length: ${expectedMinSeconds}-${expectedMaxSeconds} seconds
${prompt ? `Prompt given: ${prompt}` : ""}

Student's transcript:
"${transcript}"

Assess this response:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    
    if (!responseText) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse JSON response
    let parsed;
    try {
      // Remove markdown code blocks if present
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse AI response:", responseText);
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
    }

    // Calculate overall score (average of skills, scaled to 100)
    const skillValues = Object.values(parsed.skills) as number[];
    const avgSkill = skillValues.reduce((a, b) => a + b, 0) / skillValues.length;
    const overall = Math.round((avgSkill / 5) * 100);

    return NextResponse.json({
      taskType,
      function: functionInfo.primary,
      secondaryFunction: functionInfo.secondary,
      skills: parsed.skills,
      overall,
      transcript,
      corrections: parsed.corrections || [],
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
      feedback: parsed.feedback || "",
    });

  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json({ error: "Feedback generation failed" }, { status: 500 });
  }
}
