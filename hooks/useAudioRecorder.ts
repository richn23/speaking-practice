import { useCallback, useEffect, useRef, useState } from "react";

type RecorderState = {
  isRecording: boolean;
  isStarting: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  recordedDuration: number;
};

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isStarting: false,
    audioBlob: null,
    audioUrl: null,
    recordedDuration: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number | null>(null);

  // Cleanup object URL on unmount or when audio changes
  useEffect(() => {
    return () => {
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
    // state.audioUrl intentionally in deps? Avoid revoking when still in use;
    // handled by this cleanup only on unmount. eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    setState({
      isRecording: false,
      isStarting: false,
      audioBlob: null,
      audioUrl: null,
      recordedDuration: 0,
    });
    chunksRef.current = [];
    startTimeRef.current = null;
  }, [state.audioUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(
    async (providedStream?: MediaStream, skipInitDelay = false) => {
      try {
        setState((prev) => ({ ...prev, isStarting: true }));
        const stream =
          providedStream ?? (await navigator.mediaDevices.getUserMedia({ audio: true }));
        if (!skipInitDelay) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Try OGG (Azure-compatible) first, fall back to WebM
        const mimeType = MediaRecorder.isTypeSupported("audio/ogg; codecs=opus")
          ? "audio/ogg; codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm; codecs=opus")
          ? "audio/webm; codecs=opus"
          : "audio/webm";
        
        console.log("[AudioRecorder] Using mimeType:", mimeType);
        
        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];
        startTimeRef.current = performance.now();

        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const recordedDurationSeconds = startTimeRef.current
            ? Math.max(0, (performance.now() - startTimeRef.current) / 1000)
            : 0;
          setState({
            isRecording: false,
            isStarting: false,
            audioBlob: blob,
            audioUrl: url,
            recordedDuration: recordedDurationSeconds,
          });
          chunksRef.current = [];
          stream.getTracks().forEach((track) => track.stop());
          startTimeRef.current = null;
        };

        recorder.start();
        setState((prev) => ({ ...prev, isRecording: true, isStarting: false }));
      } catch (error) {
        console.error("Audio recording error:", error);
        resetRecording();
        throw error;
      }
    },
    [resetRecording]
  );

  return {
    isRecording: state.isRecording,
    isStarting: state.isStarting,
    audioBlob: state.audioBlob,
    audioUrl: state.audioUrl,
    recordedDuration: state.recordedDuration,
    startRecording,
    stopRecording,
    resetRecording,
  };
}

