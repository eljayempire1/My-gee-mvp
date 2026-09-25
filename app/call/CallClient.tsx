"use client";

import { useEffect, useRef, useState } from "react";

type RecognitionLike = {
  lang: string;
  continuous?: boolean;
  interimResults?: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  }
}

export default function CallClient() {
  const [type, setType] = useState<"voice" | "video">("voice");
  const [name, setName] = useState("Gee friend");
  const [status, setStatus] = useState("Ready");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(false);
  const [active, setActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [transcript, setTranscript] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const restartRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextType = params.get("type") === "video" ? "video" : "voice";
    setType(nextType);
    setName(params.get("name") || "Gee friend");
    setCamera(nextType === "video");
    return () => stopCall(false);
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  async function ensureMedia() {
    if (streamRef.current) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser does not support camera/microphone access. Please use Chrome on Android.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
      streamRef.current = stream;
      if (videoRef.current && type === "video") {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      return true;
    } catch {
      setError(type === "video" ? "Please allow camera and microphone access, then start the call again." : "Please allow microphone access, then start the call again.");
      return false;
    }
  }

  async function browserSpeak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }

  async function speak(text: string) {
    if (muted) return false;
    setSpeaking(true);
    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "alloy" }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.src = url;
          await audioRef.current.play();
          audioRef.current.onended = () => URL.revokeObjectURL(url);
          setSpeaking(false);
          return true;
        }
        URL.revokeObjectURL(url);
      }
    } catch {}
    const played = await browserSpeak(text);
    setSpeaking(false);
    return played;
  }

  async function answer(text: string) {
    if (busyRef.current || !activeRef.current) return;
    busyRef.current = true;
    restartRef.current = false;
    setStatus("Thinking…");
    setError("");
    try {
      const messages = [...historyRef.current.slice(-10), { role: "user" as const, content: text }];
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companionName: name, messages }),
      });
      if (!response.ok) throw new Error("GEE could not connect right now.");
      const data = await response.json();
      const nextReply = String(data.reply || "I'm here with you. Keep talking to me.").trim();
      historyRef.current = [...messages, { role: "assistant" as const, content: nextReply }].slice(-12);
      setReply(nextReply);
      await speak(nextReply);
    } catch (e) {
      setError(e instanceof Error ? e.message : "GEE could not answer right now.");
    } finally {
      busyRef.current = false;
      if (activeRef.current) {
        setStatus("Connected");
        restartRef.current = true;
        timerRef.current = setTimeout(beginListening, 250);
      }
    }
  }

  function beginListening() {
    if (!activeRef.current || busyRef.current || !recognitionRef.current) return;
    try {
      setListening(true);
      recognitionRef.current.start();
    } catch {}
  }

  async function startListening() {
    if (!activeRef.current) return;
    if (!recognitionRef.current) {
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) {
        setError("Voice recognition is not available in this browser. Please use Chrome on Android.");
        return;
      }
      const recognition = new Recognition();
      recognition.lang = "en-GB";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        const text = String(event?.results?.[0]?.[0]?.transcript || "").trim();
        setTranscript(text);
        if (text) void answer(text);
      };
      recognition.onend = () => {
        setListening(false);
        if (activeRef.current && restartRef.current && !busyRef.current) {
          timerRef.current = setTimeout(beginListening, 250);
        }
      };
      recognition.onerror = () => {
        setListening(false);
        if (activeRef.current && restartRef.current && !busyRef.current) {
          timerRef.current = setTimeout(beginListening, 500);
        }
      };
      recognitionRef.current = recognition;
    }
    beginListening();
  }

  async function startCall() {
    setError("");
    const mediaReady = await ensureMedia();
    if (!mediaReady) return;
    activeRef.current = true;
    restartRef.current = true;
    setActive(true);
    setSeconds(0);
    setStatus("Connected");
    setReply("I'm here. Talk to me.");
    await speak("I'm here. Talk to me.");
    await startListening();
  }

  function stopCall(updateUi = true) {
    activeRef.current = false;
    restartRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      recognitionRef.current?.stop();
    } catch {}
    recognitionRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setListening(false);
    setSpeaking(false);
    if (updateUi) {
      setActive(false);
      setStatus("Ready");
    }
  }

  function toggleMute() {
    setMuted((value) => !value);
  }

  function toggleCamera() {
    setCamera((value) => {
      const next = !value;
      if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (videoTrack) videoTrack.enabled = next;
      }
      return next;
    });
  }

  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8">
      <audio ref={audioRef} />
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">MY GEE</p>
              <h1 className="mt-2 text-3xl font-bold">{name}</h1>
            </div>
            <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">{mins}:{secs}</div>
          </div>
          <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-5 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-fuchsia-500/20 text-4xl">💗</div>
            <p className="text-lg font-semibold">{status}</p>
            <p className="mt-2 min-h-12 text-white/70">{reply || "Your Gee is ready to talk."}</p>
            {transcript && <p className="mt-3 text-sm text-white/50">You: {transcript}</p>}
            {error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!active ? (
              <button onClick={startCall} className="rounded-full bg-fuchsia-600 px-7 py-3 font-semibold">Start call</button>
            ) : (
              <button onClick={() => stopCall()} className="rounded-full bg-red-600 px-7 py-3 font-semibold">End call</button>
            )}
            <button onClick={toggleMute} className="rounded-full border border-white/15 px-5 py-3">{muted ? "Unmute" : "Mute"}</button>
            <button onClick={toggleCamera} className="rounded-full border border-white/15 px-5 py-3">{camera ? "Camera off" : "Camera"}</button>
          </div>
        </div>
      </div>
    </main>
  );
}
