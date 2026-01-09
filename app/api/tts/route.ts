import { NextRequest, NextResponse } from "next/server";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export async function POST(request: NextRequest) {
  try {
    const { word } = await request.json();

    if (!word) {
      return NextResponse.json({ error: "No word provided" }, { status: 400 });
    }

    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;

    if (!speechKey || !speechRegion) {
      return NextResponse.json({ error: "Azure credentials not configured" }, { status: 500 });
    }

    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
    speechConfig.speechSynthesisVoiceName = "en-GB-RyanNeural"; // British English voice

    return new Promise<Response>((resolve) => {
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

      synthesizer.speakTextAsync(
        word,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            const audioData = result.audioData;
            synthesizer.close();

            resolve(
              new NextResponse(audioData, {
                headers: {
                  "Content-Type": "audio/wav",
                  "Content-Length": audioData.byteLength.toString(),
                },
              })
            );
          } else {
            synthesizer.close();
            resolve(NextResponse.json({ 
              error: "Speech synthesis failed",
              reason: result.reason 
            }, { status: 500 }));
          }
        },
        (error) => {
          synthesizer.close();
          resolve(NextResponse.json({ error: error }, { status: 500 }));
        }
      );
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}

