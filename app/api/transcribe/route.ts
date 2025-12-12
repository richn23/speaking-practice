import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log("Transcribe API called");

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      console.log("No audio file received");
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    console.log("Audio file received:", audioFile.name, audioFile.size, "bytes");

    if (audioFile.size < 1000) {
      console.log("Audio file too small");
      return NextResponse.json({ error: "Audio too short", transcript: "" }, { status: 200 });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    const hallucinations = [
      "thank you for watching",
      "thanks for watching",
      "please subscribe",
      "like and subscribe",
      "see you next time",
      "bye bye",
    ];

    const lowerText = (transcription.text || "").toLowerCase().trim();

    if (hallucinations.some((h) => lowerText.includes(h))) {
      return NextResponse.json({
        transcript: "",
        error: "no_speech",
        message: "You didn't speak for long enough, try again.",
      });
    }

    const wordCount = (transcription.text || "").trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 5) {
      return NextResponse.json({
        transcript: "",
        error: "too_short",
        message: "You didn't speak for long enough, try again.",
      });
    }

    // Check for non-English scripts (hallucination indicator)
    const nonEnglishPattern = /[\u3000-\u9fff\uac00-\ud7af\u0600-\u06ff]/;
    if (nonEnglishPattern.test(transcription.text || "")) {
      return NextResponse.json({
        transcript: "",
        error: "no_speech",
        message: "You didn't speak for long enough, try again.",
      });
    }

    console.log("Transcription result:", transcription.text);

    return NextResponse.json({ transcript: transcription.text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "Transcription failed." }, { status: 500 });
  }
}

