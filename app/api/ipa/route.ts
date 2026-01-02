import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { words } = await request.json();

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: "No words provided" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a pronunciation guide. Given a list of English words, return their IPA (International Phonetic Alphabet) transcriptions using British English pronunciation.

Return JSON format:
{
  "words": [
    { "word": "example", "ipa": "/ɪɡˈzɑːmpl/" }
  ]
}`,
        },
        {
          role: "user",
          content: `Provide IPA for these words: ${words.join(", ")}`,
        },
      ],
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response" }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("IPA lookup error:", error);
    return NextResponse.json({ error: "IPA lookup failed" }, { status: 500 });
  }
}

