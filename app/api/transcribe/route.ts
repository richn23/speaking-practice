export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SilenceCheckResult = {
  silentRatio: number;
  silentFrames: number;
  totalFrames: number;
  totalDurationSec: number;
};

const NO_SPEECH_MESSAGE = "Audio is unclear or too short—please try recording again.";

const FRAME_MS = Number(process.env.VAD_FRAME_MS ?? "20");
const FRAME_DURATION_SEC = Number.isFinite(FRAME_MS) && FRAME_MS > 0 ? FRAME_MS / 1000 : 0.02;
const SAMPLE_RATE = 16000;
const SAMPLES_PER_FRAME = SAMPLE_RATE * FRAME_DURATION_SEC; // ~320 @20ms
const BYTES_PER_SAMPLE = 4; // f32le
const FRAME_BYTES = Math.max(1, Math.floor(SAMPLES_PER_FRAME * BYTES_PER_SAMPLE)); // guard
const SILENCE_DBFS = Number(process.env.VAD_SILENCE_DBFS ?? "-45");
const SILENCE_THRESHOLD = Math.pow(10, SILENCE_DBFS / 20); // linear RMS threshold
const SILENCE_RATIO_GATE = Number.isFinite(Number(process.env.VAD_SILENCE_RATIO_CUTOFF))
  ? Number(process.env.VAD_SILENCE_RATIO_CUTOFF)
  : 0.85;
const MIN_DURATION_SEC = Number.isFinite(Number(process.env.VAD_MIN_DURATION_SECONDS))
  ? Number(process.env.VAD_MIN_DURATION_SECONDS)
  : 0.8;

async function detectSilenceEnergy(tempPath: string): Promise<SilenceCheckResult | null> {
  if (!ffmpegPath) {
    console.warn("[silence-gate] ffmpeg-static unavailable; skipping silence check");
    return null;
  }

  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegPath, [
      "-i",
      tempPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      String(SAMPLE_RATE),
      "-f",
      "f32le",
      "pipe:1",
    ]);

    let remainder = Buffer.alloc(0);
    let totalFrames = 0;
    let silentFrames = 0;

    ff.stdout.on("data", (chunk: Buffer) => {
      remainder = Buffer.concat([remainder, chunk]);
      while (remainder.length >= FRAME_BYTES) {
        const frame = remainder.subarray(0, FRAME_BYTES);
        remainder = remainder.subarray(FRAME_BYTES);

        const view = new Float32Array(frame.buffer, frame.byteOffset, frame.byteLength / BYTES_PER_SAMPLE);
        let sumSq = 0;
        for (let i = 0; i < view.length; i += 1) {
          const v = view[i];
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / view.length);
        totalFrames += 1;
        if (rms < SILENCE_THRESHOLD) {
          silentFrames += 1;
        }
      }
    });

    ff.on("error", (err) => reject(err));

    ff.on("close", (code) => {
      if (code !== 0) {
        return resolve(null);
      }
      if (totalFrames === 0) {
        return resolve(null);
      }
      const totalDurationSec = totalFrames * FRAME_DURATION_SEC;
      const silentRatio = silentFrames / totalFrames;
      resolve({ silentRatio, silentFrames, totalFrames, totalDurationSec });
    });
  });
}

async function saveToTmp(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const tempPath = path.join("/tmp", `audio-${Date.now()}-${Math.random().toString(16).slice(2)}.webm`);
  await fs.writeFile(tempPath, buffer);
  return tempPath;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    const tempPath = await saveToTmp(audioFile);

    let silenceResult: SilenceCheckResult | null = null;
    let silenceFallback = false;
    try {
      silenceResult = await detectSilenceEnergy(tempPath);
    } catch (err) {
      console.warn("Silence detection failed; skipping gate", err);
      silenceFallback = true;
    }

    if (silenceResult) {
      const { silentRatio, totalDurationSec } = silenceResult;
      const mostlySilent =
        totalDurationSec < MIN_DURATION_SEC || Number.isNaN(silentRatio) || silentRatio >= SILENCE_RATIO_GATE;
      if (mostlySilent) {
        console.log(
          `Silence gate triggered: ratio=${silentRatio.toFixed(3)} duration=${totalDurationSec.toFixed(
            2,
          )}s frames=${silenceResult.totalFrames} thresholds={frame_ms:${FRAME_MS},dbfs:${SILENCE_DBFS},ratio:${SILENCE_RATIO_GATE},min_sec:${MIN_DURATION_SEC}}`,
        );
        await fs.unlink(tempPath).catch(() => {});
        return NextResponse.json(
          {
            transcript: "",
            no_speech: true,
            reason: "mostly_silence",
            silenceRatio: silentRatio,
            durationSeconds: totalDurationSec,
            overallScore: 0,
            performanceLabel: "Try again",
            cefr: "Pre-A1",
            subscores: {
              taskCompletion: 0,
              elaboration: 0,
              coherence: 0,
              grammar: 0,
              vocabulary: 0,
            },
            feedback: NO_SPEECH_MESSAGE,
          },
          { status: 200 },
        );
      }
    } else {
      console.log("Silence check skipped (ffmpeg unavailable or failed)", { silence_gate_fallback: true });
      silenceFallback = true;
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
      temperature: 0, // stable, avoid creative outputs
      prompt:
        "Context: short English answers about daily routines and daily life. If the audio is unclear or too short, please return an empty transcript so the user can try recording again.",
    });

    await fs.unlink(tempPath).catch(() => {});

    const text = transcription.text?.trim() ?? "";

    const wordCount = text ? text.split(/\s+/).length : 0;
    const hallucinationHits = /(thank you for watching|subscribe|like and subscribe|foreign)/i.test(text);
    if (!text || wordCount < 3 || hallucinationHits) {
      return NextResponse.json({ transcript: "", error: "no_speech", message: NO_SPEECH_MESSAGE }, { status: 200 });
    }

    return NextResponse.json({ transcript: text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}

