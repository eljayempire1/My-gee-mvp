"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };
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

declare global { interface Window {
  SpeechRecognition?: new () => RecognitionLike;
  webkitSpeechRecognition?: new () => RecognitionLike;
} }

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
  const historyRef = useRef<ChatMessage[]>([]);

  const isElijah = name.toLowerCase().startsWith("elijah");

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
    const id = window.setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  async function ensureMedia() {
    if (streamRef.current) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser does not support microphone/camera access. Use Chrome on Android.");
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
      setError(type === "video" ? "Please allow camera and microphone access." : "Please allow microphone access.");
      return false;
    }
  }

  async function speak(text: string) {
    setSpeaking(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          companionName: isElijah ? "Elijah" : name,
          voice: isElijah ? "onyx" : "alloy",
        }),
      });
      if (!response.ok) throw new Error("Elijah's voice could not be generated. Please try the call again.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = audioRef.current || new Audio();
      audioRef.current = audio;
      audio.src = url;
      audio.preload = "auto";
      audio.volume = 1;
      await audio.play();
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error("Audio playback failed."));
      });
      URL.revokeObjectURL(url);
      return true;
    } finally {
      setSpeaking(false);
    }
  }

  async function answer(text: string) {
    if (busyRef.current || !activeRef.current) return;
    const clean = text.trim();
    if (!clean) return;
    busyRef.current = true;
    restartRef.current = false;
    setStatus("Thinking…");
    setError("");
    try {
      const messages: ChatMessage[] = [...historyRef.current.slice(-10), { role: "user", content: clean }];
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companionName: isElijah ? "Elijah" : name,
          languageStyle: isElijah ? "pidgin" : "english",
          messages,
        }),
      });
      if (!response.ok) throw new Error("GEE could not connect right now.");
      const data = await response.json();
      const nextReply = String(data.reply || (isElijah ? "I dey here with you, my guy. Keep talking to me." : "I'm here with you. Keep talking to me.")).trim();
      historyRef.current = [...messages, { role: "assistant", content: nextReply }].slice(-12);
      setReply(nextReply);
      await speak(nextReply);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Elijah could not answer right now.");
    } finally {
      busyRef.current = false;
      if (activeRef.current) {
        setStatus("Connected");
        restartRef.current = true;
        timerRef.current = setTimeout(beginListening, 300);
      }
    }
  }

  function beginListening() {
    if (!activeRef.current || busyRef.current || muted) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setError("Voice input is not supported. Use Chrome on Android."); return; }
    try {
      recognitionRef.current?.stop();
      const recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = isElijah ? "en-NG" : "en-GB";
      recognition.continuous = false;
      recognition.interimResults = false;
      let gotResult = false;
      restartRef.current = true;
      setListening(true);
      setStatus("Listening…");
      recognition.onresult = async (event) => {
        gotResult = true;
        setListening(false);
        const text = String(event.results?.[0]?.[0]?.transcript || "").trim();
        if (text) { setTranscript(text); await answer(text); }
      };
      recognition.onerror = (event) => {
        setListening(false);
        if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
          restartRef.current = false;
          setError("Microphone permission is blocked. Allow microphone access in Chrome.");
        } else if (event?.error !== "aborted") setError("I couldn't hear you. Tap to speak again.");
      };
      recognition.onend = () => {
        setListening(false);
        if (!gotResult && restartRef.current && activeRef.current && !busyRef.current && !muted) {
          timerRef.current = setTimeout(beginListening, 400);
        }
      };
      recognition.start();
    } catch { setListening(false); setError("Tap to speak again."); }
  }

  async function startCall() {
    if (active) return beginListening();
    setError("");
    setStatus(type === "video" ? "Starting video call…" : "Connecting voice…");
    if (!(await ensureMedia())) return;
    activeRef.current = true;
    restartRef.current = true;
    historyRef.current = [];
    setActive(true);
    setSeconds(0);
    setMuted(false);
    if (type === "video") setCamera(true);
    const greeting = isElijah
      ? "How far, my guy? I dey here with you. Talk to me normally — wetin dey your mind?"
      : `Hi, I'm ${name}. I'm here with you. What's on your mind?`;
    setReply(greeting);
    try { await speak(greeting); }
    catch (e) { setError(e instanceof Error ? e.message : "Voice playback failed."); }
    setStatus("Connected");
    beginListening();
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    streamRef.current?.getAudioTracks().forEach((track) => (track.enabled = !next));
    if (next) { recognitionRef.current?.stop(); setListening(false); setStatus("Microphone muted"); }
    else { setStatus("Connected"); beginListening(); }
  }

  function toggleCamera() {
    if (type !== "video") return;
    const next = !camera;
    streamRef.current?.getVideoTracks().forEach((track) => (track.enabled = next));
    setCamera(next);
  }

  function stopCall(navigate = true) {
    activeRef.current = false;
    restartRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    busyRef.current = false;
    setActive(false); setListening(false); setSpeaking(false); setStatus("Call ended");
    if (videoRef.current) videoRef.current.srcObject = null;
    if (navigate) window.location.href = "/messages";
  }

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return <main style={{ minHeight: "100vh", background: "radial-gradient(circle at top,#24102f,#07070a 55%)", color: "white", fontFamily: "Arial,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <section style={{ width: "100%", maxWidth: 560, background: "#111116", border: "1px solid #3b3042", borderRadius: 28, overflow: "hidden" }}>
      <header style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #302938" }}>
        <a href="/messages" style={{ color: "#ddd", textDecoration: "none", fontSize: 25 }}>‹</a>
        <div style={{ textAlign: "center" }}><div style={{ fontWeight: 900 }}>{type === "video" ? "🎥 Video call" : "📞 Voice call"}</div><div style={{ fontSize: 12, color: active ? "#22c55e" : "#a1a1aa" }}>● {status} {active ? `• ${mins}:${secs}` : ""}</div></div><div style={{ width: 25 }} />
      </header>
      <div style={{ minHeight: 520, padding: 20, background: "linear-gradient(180deg,#160d1d,#08080b)" }}>
        {type === "video" && <video ref={videoRef} muted playsInline autoPlay style={{ width: "100%", height: 300, objectFit: "cover", borderRadius: 22, background: "#050506", border: "1px solid #4b3b55", transform: "scaleX(-1)" }} />}
        <div style={{ display: "grid", placeItems: "center", paddingTop: type === "video" ? 22 : 80 }}>
          <div style={{ width: 145, height: 145, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#7c3aed,#ec4899)", fontSize: 56, boxShadow: speaking ? "0 0 90px #22c55e88" : "0 0 70px #a855f766" }}>💜</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 18 }}>{name}</div>
          <div style={{ color: "#a1a1aa", marginTop: 6, textAlign: "center", minHeight: 22 }}>{error || (listening ? "🎙️ Listening…" : speaking ? "🔊 Speaking…" : active ? "Connected — talk naturally" : "Tap Start to begin")}</div>
          {transcript && <div style={{ marginTop: 12, color: "#c4b5fd", fontSize: 14 }}>You: “{transcript}”</div>}
          {reply && <div style={{ marginTop: 14, padding: "14px 16px", border: "1px solid #3b3042", borderRadius: 18, background: "#0d0b11", fontSize: 16, lineHeight: 1.45, textAlign: "center" }}>{reply}</div>}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, padding: 20, borderTop: "1px solid #302938", flexWrap: "wrap" }}>
        {!active && <button onClick={startCall} style={primary}>{type === "video" ? "🎥 Start video call" : "🔊 Start voice"}</button>}
        {active && <button onClick={beginListening} style={primary}>🎙️ Tap to speak</button>}
        {active && <button onClick={toggleMute} style={control}>{muted ? "🔇" : "🎙️"}</button>}
        {type === "video" && active && <button onClick={toggleCamera} style={control}>{camera ? "📷" : "🚫"}</button>}
        {active && <button onClick={() => stopCall(true)} style={{ ...control, background: "#b91c1c", borderColor: "#ef4444" }}>☎</button>}
      </div>
      <div style={{ padding: "0 20px 20px", textAlign: "center", fontSize: 11, color: "#71717a" }}>Elijah's calls use a consistent male AI voice. The app will not silently fall back to your phone's female browser voice.</div>
    </section>
  </main>;
}

const primary: React.CSSProperties = { padding: "14px 20px", borderRadius: 15, border: "1px solid #c084fc", background: "linear-gradient(135deg,#7c3aed,#c026d3)", color: "white", fontWeight: 900 };
const control: React.CSSProperties = { width: 56, height: 56, borderRadius: "50%", border: "1px solid #4b3b55", background: "#21152a", color: "white", fontWeight: 900 };
