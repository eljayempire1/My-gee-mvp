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
    if (!window.speechSynthesis) return false;
    return new Promise<boolean>((resolve) => {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-GB";
        utterance.rate = 0.98;
        utterance.pitch = 1.02;
        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        resolve(false);
      }
    });
  }

  async function speak(text: string) {
    setSpeaking(true);
    try {
      const response = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = audioRef.current || new Audio();
        audioRef.current = audio;
        audio.src = url;
        audio.volume = 1;
        await audio.play();
        await new Promise<void>((resolve) => { audio.onended = () => resolve(); audio.onerror = () => resolve(); });
        URL.revokeObjectURL(url);
        setSpeaking(false);
        return true;
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
    if (!activeRef.current || busyRef.current || muted) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Voice input is not supported in this browser. Use Chrome on Android.");
      return;
    }
    try {
      recognitionRef.current?.stop();
      const recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = "en-GB";
      recognition.continuous = false;
      recognition.interimResults = false;
      let gotResult = false;
      restartRef.current = true;
      setListening(true);
      setStatus("Listening…");
      recognition.onresult = async (event) => {
        gotResult = true;
        const text = String(event.results?.[0]?.[0]?.transcript || "").trim();
        setListening(false);
        if (!text) return;
        setTranscript(text);
        await answer(text);
      };
      recognition.onerror = (event) => {
        setListening(false);
        if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
          restartRef.current = false;
          setError("Microphone permission is blocked. Tap the lock icon in Chrome → Microphone → Allow.");
        } else if (event?.error !== "aborted") {
          setError("I couldn't hear you. Tap the microphone button and try again.");
        }
      };
      recognition.onend = () => {
        setListening(false);
        if (!gotResult && restartRef.current && activeRef.current && !busyRef.current && !muted) timerRef.current = setTimeout(beginListening, 350);
      };
      recognition.start();
    } catch {
      setListening(false);
      setError("Tap the microphone button and speak again.");
    }
  }

  async function startCall() {
    if (active) return beginListening();
    setError("");
    setStatus(type === "video" ? "Starting video call…" : "Connecting voice…");
    const ok = await ensureMedia();
    if (!ok) return;
    activeRef.current = true;
    restartRef.current = true;
    historyRef.current = [];
    setActive(true);
    setSeconds(0);
    setMuted(false);
    if (type === "video") setCamera(true);
    const greeting = `Hi, I'm ${name}. I'm here with you. You can talk to me naturally. What's on your mind?`;
    setReply(greeting);
    const played = await speak(greeting);
    if (!played) setError("I have a reply ready, but your phone could not play the voice. Turn up media volume and try again.");
    setStatus("Connected");
    beginListening();
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    streamRef.current?.getAudioTracks().forEach((track) => (track.enabled = !next));
    if (next) {
      recognitionRef.current?.stop();
      setListening(false);
      setStatus("Microphone muted");
    } else {
      setStatus("Connected");
      beginListening();
    }
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
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    if (videoRef.current) videoRef.current.srcObject = null;
    busyRef.current = false;
    setActive(false);
    setListening(false);
    setSpeaking(false);
    setStatus("Call ended");
    if (navigate) window.location.href = "/messages";
  }

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(circle at top,#24102f,#07070a 55%)", color: "white", fontFamily: "Arial,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <section style={{ width: "100%", maxWidth: 560, background: "#111116", border: "1px solid #3b3042", borderRadius: 28, overflow: "hidden", boxShadow: "0 25px 80px #0009" }}>
        <header style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #302938" }}>
          <a href="/messages" style={{ color: "#ddd", textDecoration: "none", fontSize: 25 }}>‹</a>
          <div style={{ textAlign: "center" }}><div style={{ fontWeight: 900 }}>{type === "video" ? "🎥 Video call" : "📞 Voice call"}</div><div style={{ fontSize: 12, color: active ? "#22c55e" : "#a1a1aa", marginTop: 4 }}>● {status} {active ? `• ${mins}:${secs}` : ""}</div></div>
          <div style={{ width: 25 }} />
        </header>

        <div style={{ minHeight: 520, padding: 20, position: "relative", background: "linear-gradient(180deg,#160d1d,#08080b)" }}>
          {type === "video" && <>
            <video ref={videoRef} muted playsInline autoPlay style={{ width: "100%", height: 300, objectFit: "cover", borderRadius: 22, background: "#050506", border: "1px solid #4b3b55", transform: "scaleX(-1)" }} />
            <div style={{ position: "absolute", top: 34, left: 34, padding: "7px 10px", borderRadius: 10, background: "#0009", fontSize: 12 }}>📷 Your camera</div>
          </>}
          <div style={{ display: "grid", placeItems: "center", paddingTop: type === "video" ? 22 : 80 }}>
            <div style={{ width: 145, height: 145, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#7c3aed,#ec4899)", fontSize: 56, fontWeight: 900, boxShadow: speaking ? "0 0 90px #22c55e88" : "0 0 70px #a855f766" }}>💜</div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 18 }}>{name}</div>
            <div style={{ color: "#a1a1aa", marginTop: 6, textAlign: "center", minHeight: 22 }}>{error || (listening ? "🎙️ Listening… speak now" : speaking ? "🔊 Gee is speaking…" : active ? "Connected — talk naturally" : "Tap Start to begin")}</div>
            {transcript && <div style={{ marginTop: 12, color: "#c4b5fd", fontSize: 14 }}>You: “{transcript}”</div>}
            {reply && <div style={{ marginTop: 14, padding: "14px 16px", border: "1px solid #3b3042", borderRadius: 18, background: "#0d0b11", fontSize: 16, lineHeight: 1.45, textAlign: "center" }}>{reply}</div>}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, padding: 20, borderTop: "1px solid #302938", flexWrap: "wrap" }}>
          {!active && <button onClick={startCall} style={controlPrimary}>{type === "video" ? "🎥 Start video call" : "🔊 Start voice"}</button>}
          {active && <button onClick={beginListening} style={controlPrimary}>🎙️ Tap to speak</button>}
          {active && <button onClick={toggleMute} style={control}>{muted ? "🔇" : "🎙️"}</button>}
          {type === "video" && active && <button onClick={toggleCamera} style={control}>{camera ? "📷" : "🚫"}</button>}
          {active && <button onClick={() => stopCall(true)} style={{ ...control, background: "#b91c1c", borderColor: "#ef4444" }}>☎</button>}
        </div>
        <div style={{ padding: "0 20px 20px", textAlign: "center", fontSize: 11, color: "#71717a" }}>My Gee uses your microphone for the live conversation. Video mode activates your phone camera and keeps the AI companion voice active.</div>
      </section>
    </main>
  );
}

const control: React.CSSProperties = { width: 56, height: 56, borderRadius: "50%", border: "1px solid #554361", background: "#241a2b", color: "white", fontSize: 21, cursor: "pointer" };
const controlPrimary: React.CSSProperties = { padding: "13px 22px", borderRadius: 999, border: "1px solid #c084fc", background: "linear-gradient(135deg,#7c3aed,#c026d3)", color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer" };