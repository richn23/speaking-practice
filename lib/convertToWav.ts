"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoading: Promise<FFmpeg> | null = null;

const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  // Prevent multiple simultaneous loads
  if (ffmpegLoading) {
    return ffmpegLoading;
  }

  ffmpegLoading = (async () => {
    const instance = new FFmpeg();

    console.log("[convertToWav] Loading FFmpeg WASM from CDN...");

    // Load ffmpeg WASM using toBlobURL for better browser compatibility
    await instance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    console.log("[convertToWav] FFmpeg WASM loaded in browser");
    ffmpegInstance = instance;
    return instance;
  })();

  return ffmpegLoading;
}

/**
 * Convert audio blob (WebM/OGG) to WAV format using ffmpeg-wasm in the browser
 * @param audioBlob - The audio blob to convert
 * @returns A new Blob in WAV format
 */
export async function convertToWav(audioBlob: Blob): Promise<Blob> {
  const ff = await getFFmpeg();

  const inputExt = audioBlob.type.includes("ogg") ? "ogg" : "webm";
  const inputFile = `input.${inputExt}`;
  const outputFile = "output.wav";

  console.log(`[convertToWav] Converting ${audioBlob.size} bytes of ${audioBlob.type}`);

  // Write input file
  const inputData = await fetchFile(audioBlob);
  await ff.writeFile(inputFile, inputData);

  // Convert to WAV (16kHz, mono, 16-bit PCM) - Azure's preferred format
  await ff.exec([
    "-i", inputFile,
    "-vn",
    "-acodec", "pcm_s16le",
    "-ar", "16000",
    "-ac", "1",
    "-y",
    outputFile,
  ]);

  // Read output file
  const outputData = await ff.readFile(outputFile);

  // Cleanup
  await ff.deleteFile(inputFile);
  await ff.deleteFile(outputFile);

  // Create a fresh ArrayBuffer copy to satisfy BlobPart type requirement
  const uint8 = outputData as Uint8Array;
  const arrayBuffer = new ArrayBuffer(uint8.byteLength);
  new Uint8Array(arrayBuffer).set(uint8);
  const wavBlob = new Blob([arrayBuffer], { type: "audio/wav" });
  console.log(`[convertToWav] Converted to WAV: ${wavBlob.size} bytes`);

  return wavBlob;
}

/**
 * Check if audio conversion is needed (non-WAV formats)
 */
export function needsConversion(mimeType: string): boolean {
  return !mimeType.includes("wav");
}
