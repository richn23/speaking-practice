"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type WaveformPlayerProps = {
  audioUrl: string;
  audioBlob: Blob;
};

const formatTime = (secs: number) => {
  if (!Number.isFinite(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export default function WaveformPlayer({ audioUrl, audioBlob }: WaveformPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [samples, setSamples] = useState<number[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Decode and sample waveform
  useEffect(() => {
    let isMounted = true;
    const ctx = new AudioContext();
    audioBlob
      .arrayBuffer()
      .then((buf) => ctx.decodeAudioData(buf))
      .then((audioBuffer) => {
        if (!isMounted) return;
        const channelData = audioBuffer.getChannelData(0);
        const sampleCount = 50;
        const blockSize = Math.floor(channelData.length / sampleCount);
        const nextSamples: number[] = [];
        for (let i = 0; i < sampleCount; i++) {
          const start = i * blockSize;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            const v = channelData[start + j] || 0;
            sum += Math.abs(v);
          }
          const avg = blockSize ? sum / blockSize : 0;
          nextSamples.push(avg);
        }
        // Normalize
        const max = Math.max(...nextSamples, 0.0001);
        setSamples(nextSamples.map((v) => v / max));
        setDuration(audioBuffer.duration);
      })
      .catch((err) => {
        console.error("Waveform decode error:", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsReady(true);
          ctx.close();
        }
      });

    return () => {
      isMounted = false;
      ctx.close();
    };
  }, [audioBlob]);

  // Audio element setup
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onLoaded = () => setDuration(audio.duration || duration);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("loadedmetadata", onLoaded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [duration]);

  const progress = useMemo(() => {
    if (!duration) return 0;
    return Math.min(currentTime / duration, 1);
  }, [currentTime, duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  const handleSeek = (clientX: number) => {
    const audio = audioRef.current;
    const el = containerRef.current;
    if (!audio || !el || !duration) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  return (
    <div
      style={{
        background: "rgba(20, 10, 30, 0.5)",
        borderRadius: 12,
        padding: "0.75rem",
        border: "1px solid rgba(124, 58, 237, 0.2)",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={togglePlay}
          disabled={!isReady}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "1px solid rgba(124, 58, 237, 0.4)",
            background: "rgba(124, 58, 237, 0.15)",
            color: "#e9e4f0",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isReady ? "pointer" : "not-allowed",
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <div style={{ color: "#e9e4f0", fontWeight: 600 }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      <div
        ref={containerRef}
        onClick={(e) => handleSeek(e.clientX)}
        style={{
          display: "grid",
          gridAutoFlow: "column",
          gridAutoColumns: "5px",
          gap: "1.5px",
          alignItems: "end",
          height: 50,
          cursor: isReady ? "pointer" : "default",
          userSelect: "none",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        {samples.map((v, idx) => {
          const played = progress >= idx / samples.length;
          const minH = 10;
          const maxH = 40;
          const h = minH + v * (maxH - minH);
          return (
            <div
              key={idx}
              style={{
                width: 3,
                height: h,
                borderRadius: "4px 4px 0 0",
                background: played ? "#a78bfa" : "#3f3f46",
                transition: "background 0.2s ease",
              }}
            />
          );
        })}
      </div>

      <audio ref={audioRef} src={audioUrl} preload="metadata" style={{ display: "none" }} />
    </div>
  );
}


