import { NextRequest, NextResponse } from "next/server";

interface PhonemeResult {
  Phoneme: string;
  AccuracyScore?: number;
  PronunciationAssessment?: { AccuracyScore: number };
}

interface WordResult {
  Word: string;
  AccuracyScore?: number;
  PronunciationAssessment?: { AccuracyScore: number };
  Phonemes?: PhonemeResult[];
  ErrorType?: string;  // "None", "Mispronunciation", "Omission", "Insertion"
}

interface ProblemWord {
  word: string;
  score: number;
  problemPhonemes?: string[];
  heardAs?: string;  // Concatenated phonemes Azure detected, e.g., "/breɪkfəst/"
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      console.error("[pronunciation] No audio file provided");
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioData = new Uint8Array(arrayBuffer);

    console.log(`[pronunciation] Received audio: ${audioData.length} bytes, type: ${audioFile.type}`);

    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION;

    if (!speechKey || !speechRegion) {
      console.error("[pronunciation] Azure credentials not configured");
      return NextResponse.json({ error: "Azure credentials not configured" }, { status: 500 });
    }

    // Pronunciation assessment config - use Phoneme granularity for detailed feedback
    const pronunciationConfig = {
      referenceText: "",
      gradingSystem: "HundredMark",
      granularity: "Phoneme",  // Changed from Word to Phoneme
      dimension: "Comprehensive",
      enableMiscue: true,
    };

    const pronunciationConfigBase64 = Buffer.from(JSON.stringify(pronunciationConfig)).toString("base64");

    // Use Azure Speech REST API
    const endpoint = `https://${speechRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;
    
    const params = new URLSearchParams({
      language: "en-US",
      format: "detailed",
    });

    // Determine content type - expect WAV from client-side conversion
    const contentType = audioFile.type || "audio/wav";
    console.log(`[pronunciation] Calling Azure REST API with ${contentType} (phoneme-level)`);

    const response = await fetch(`${endpoint}?${params}`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": speechKey,
        "Content-Type": contentType,
        "Pronunciation-Assessment": pronunciationConfigBase64,
        "Accept": "application/json",
      },
      body: audioData,
    });

    const responseText = await response.text();
    console.log(`[pronunciation] Azure response status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`[pronunciation] Azure API error: ${response.status} - ${responseText}`);
      return NextResponse.json({
        overallScore: 0,
        accuracyScore: 0,
        fluencyScore: 0,
        completenessScore: 0,
        problemWords: [],
        error: `Azure API error: ${response.status}`,
      });
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error("[pronunciation] Failed to parse Azure response:", responseText);
      return NextResponse.json({
        overallScore: 0,
        accuracyScore: 0,
        fluencyScore: 0,
        completenessScore: 0,
        problemWords: [],
        error: "Failed to parse response",
      });
    }

    console.log(`[pronunciation] Azure result:`, JSON.stringify(result, null, 2));

    // Check if recognition was successful
    if (result.RecognitionStatus !== "Success") {
      console.log(`[pronunciation] Recognition status: ${result.RecognitionStatus}`);
      return NextResponse.json({
        overallScore: 0,
        accuracyScore: 0,
        fluencyScore: 0,
        completenessScore: 0,
        problemWords: [],
      });
    }

    // Extract pronunciation assessment from NBest results
    const nBest = result.NBest?.[0];

    if (!nBest) {
      console.log("[pronunciation] No NBest results in response");
      return NextResponse.json({
        overallScore: 0,
        accuracyScore: 0,
        fluencyScore: 0,
        completenessScore: 0,
        problemWords: [],
      });
    }

    // Scores can be directly on nBest OR in nBest.PronunciationAssessment depending on API version
    const overallScore = nBest.PronScore ?? nBest.PronunciationAssessment?.PronScore ?? 0;
    const accuracyScore = nBest.AccuracyScore ?? nBest.PronunciationAssessment?.AccuracyScore ?? 0;
    const fluencyScore = nBest.FluencyScore ?? nBest.PronunciationAssessment?.FluencyScore ?? 0;
    const completenessScore = nBest.CompletenessScore ?? nBest.PronunciationAssessment?.CompletenessScore ?? 0;

    // Get problem words - intelligibility-focused flagging
    // Only flag words that are truly problematic, don't nitpick good-enough pronunciation
    const words: WordResult[] = nBest.Words || [];
    const problemWords: ProblemWord[] = [];
    const WORD_THRESHOLD = 70;           // Flag words scoring below this
    const PHONEME_THRESHOLD = 40;        // Only show really problematic phonemes (< 40)

    words.forEach((word: WordResult) => {
      // Get word-level accuracy
      const wordAccuracy = word.AccuracyScore ?? word.PronunciationAssessment?.AccuracyScore ?? 100;
      
      // Check if word has explicit mispronunciation error
      const isMispronunciation = word.ErrorType === "Mispronunciation";
      
      // Flag word if: word score is low OR explicitly marked as mispronunciation
      const shouldFlag = wordAccuracy < WORD_THRESHOLD || isMispronunciation;
      
      if (shouldFlag) {
        // For flagged words, collect only really problematic phonemes (< 40)
        const phonemes = word.Phonemes || [];
        const problemPhonemes: string[] = [];
        
        phonemes.forEach((phoneme: PhonemeResult) => {
          const phonemeAccuracy = phoneme.AccuracyScore ?? phoneme.PronunciationAssessment?.AccuracyScore ?? 100;
          if (phonemeAccuracy < PHONEME_THRESHOLD) {
            problemPhonemes.push(phoneme.Phoneme);
          }
        });

        // Build "heard as" string from all detected phonemes
        const allPhonemes = phonemes.map((p: PhonemeResult) => p.Phoneme).join("");
        const heardAs = allPhonemes ? `/${allPhonemes}/` : undefined;

        const problemWord: ProblemWord = {
          word: word.Word,
          score: Math.round(wordAccuracy),
          heardAs: heardAs,
        };
        
        // Only include problemPhonemes if there are really bad ones
        if (problemPhonemes.length > 0) {
          problemWord.problemPhonemes = problemPhonemes;
        }
        
        problemWords.push(problemWord);
      }
    });

    const responseData = {
      overallScore: Math.round(overallScore),
      accuracyScore: Math.round(accuracyScore),
      fluencyScore: Math.round(fluencyScore),
      completenessScore: Math.round(completenessScore),
      problemWords,
    };

    console.log(`[pronunciation] Success: overall=${responseData.overallScore}, problems=${problemWords.length}`);
    if (problemWords.length > 0) {
      console.log(`[pronunciation] Problem words:`, JSON.stringify(problemWords, null, 2));
    }
    return NextResponse.json(responseData);

  } catch (error) {
    console.error("[pronunciation] Unexpected error:", error);
    return NextResponse.json({
      overallScore: 0,
      accuracyScore: 0,
      fluencyScore: 0,
      completenessScore: 0,
      problemWords: [],
      error: "Pronunciation assessment failed",
    });
  }
}
