"use client";
import { useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous?: boolean;
  interimResults?: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror?: ((event: any) => void) | null;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export default function CallPage() {
  const [type, setType] = useState<"voice" | "video">("voice");
  const [name, setName] = useState("Gee friend");
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const aliveRef = useRef(true);
  const busyRef = useRef(false);
  const restartListeningRef = useRef(false);
  const listenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState("Ready");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("type") === "video" ? "video" : "voice";
    setType(t);
    setName(p.get("name") || "Gee friend");
    setCamera(t === "video");

    return () => {
      aliveRef.current = false;
      restartListeningRef.current = false;
      if (listenTimerRef.current) clearTimeout(listenTimerRef.current);
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach((x) => x.stop());
      window.speechSynthesis?.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  async function ensureMic() {
    if (streamRef.current) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser does not support microphone access. Please use Chrome on Android.");
      return false;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
      if (!aliveRef.current) return false;
      streamRef.current = s;
      return true;
    } catch (e) {
      console.error(e);
      setError("Please allow microphone access in Chrome, then tap Start voice again.");
      return false;
    }
  }

  async function browserSpeak(text: string) {
    if (!window.speechSynthesis) return false;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-GB";
      utterance.rate = 0.98;
      utterance.pitch = 1.02;
      const voices = window.speechSynthesis.getVoices();
      const british = voices.find((v) => /en-GB/i.test(v.lang));
      if (british) utterance.voice = british;
      await new Promise<void>((resolve) => {
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
      return true;
    } catch {
      return false;
    }
  }

  async function playVoice(text: string) {
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) {
        const detail = await r.text();
        console.error("TTS", r.status, detail);
        throw new Error("TTS failed");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      a.preload = "auto";
      a.volume = 1;
      audioRef.current = a;
      await a.play();
      await new Promise<void>((resolve) => {
        a.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        a.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
      });
      return true;
    } catch (e) {
      console.error(e);
      console.warn("Server voice failed; trying browser speech fallback.");
      return browserSpeak(text);
    }
  }

  function beginListening() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setListening(false);
      setError("Voice input is not supported in this browser. Please use Chrome on Android.");
      return;
    }
    if (!aliveRef.current || busyRef.current || !voiceOn) return;

    try {
      recognitionRef.current?.stop();
      const r = new Recognition();
      r.lang = "en-GB";
      r.continuous = false;
      r.interimResults = false;
      recognitionRef.current = r;
      restartListeningRef.current = true;
      setListening(true);
      setStatus("Listening…");
      setError("");
      setTranscript("");

      let gotResult = false;
      r.onresult = async (event: any) => {
        gotResult = true;
        const text = event.results?.[0]?.[0]?.transcript?.trim() || "";
        setListening(false);
        setTranscript(text);
        if (!text) {
          setStatus("Connected");
          return;
        }
        restartListeningRef.current = false;
        await answer(text);
      };

      r.onerror = (e: any) => {
        console.error("Speech recognition", e);
        setListening(false);
        if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
          setError("Microphone permission is blocked. Tap the lock icon in Chrome → Microphone → Allow, then reload.");
        } else if (e?.error !== "aborted") {
          setError("I couldn't hear you. Tap the microphone and speak again.");
        }
      };

      r.onend = () => {
        setListening(false);
        if (!gotResult && restartListeningRef.current && aliveRef.current && voiceOn && !busyRef.current) {
          listenTimerRef.current = setTimeout(() => beginListening(), 350);
        }
      };

      r.start();
      listenTimerRef.current = setTimeout(() => {
        if (!gotResult && aliveRef.current && !busyRef.current) {
          try { r.stop(); } catch {}
          setListening(false);
          setStatus("Connected");
          setError("I’m ready — tap the microphone and speak when you’re ready.");
        }
      }, 10000);
    } catch (e) {
      console.error(e);
      setListening(false);
      setError("Tap the microphone to speak again.");
    }
  }

  async function answer(text: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    restartListeningRef.current = false;
    setStatus("Thinking…");
    setError("");

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companionName: name,
          messages: [
            {
              role: "system",
              content: `You are ${name}, a warm My Gee companion in a live voice conversation. Reply naturally and specifically to what the user just said. Do not repeat the greeting or the same sentence. Keep it to 1–3 short spoken sentences and ask at most one useful follow-up question.`,
            },
            { role: "user", content: text },
          ],
        }),
      });

      if (!r.ok) throw new Error("Chat failed");
      const data = await r.json();
      const nextReply = String(data.reply || "I'm here with you. Tell me what's on your mind.").trim();
      setReply(nextReply);

      const played = voiceOn ? await playVoice(nextReply) : false;
      if (voiceOn && !played) {
        setError("I have a reply, but your phone could not play the voice. Turn up media volume and try again.");
      }
    } catch (e) {
      console.error(e);
      setError("GEE couldn't connect right now. Please try again.");
    } finally {
      busyRef.current = false;
      setStatus("Connected");
      if (voiceOn && aliveRef.current) {
        listenTimerRef.current = setTimeout(() => beginListening(), 250);
      }
    }
  }

  async function startVoice() {
    if (voiceOn) {
      beginListening();
      return;
    }
    setError("");
    setReply("");
    setStatus("Connecting voice…");
    const ok = await ensureMic();
    if (!ok) {
      setStatus("Microphone needed");
      return;
    }

    setVoiceOn(true);
    restartListeningRef.current = true;
    const greeting = `Hi, I'm ${name}. I'm here with you. You can talk to me naturally. What's on your mind?`;
    setReply(greeting);
    const played = await playVoice(greeting);
    if (!played) {
      setVoiceOn(false);
      setStatus("Voice unavailable");
      setError("I couldn't start spoken replies. Turn up your phone media volume and make sure the OpenAI voice key is configured in Vercel Production.");
      return;
    }
    setStatus("Connected");
    beginListening();
  }

  function toggleMute() {
    const n = !muted;
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !n));
    setMuted(n);
  }

  function toggleCamera() {
    if (type !== "video") return;
    const n = !camera;
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = n));
    setCamera(n);
  }

  function end() {
    restartListeningRef.current = false;
    if (listenTimerRef.current) clearTimeout(listenTimerRef.current);
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    window.location.href = "/messages";
  }

  useEffect(() => {
    if (status !== "Connected" && status !== "Thinking…" && status !== "Listening…") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(circle at top,#24102f,#07070a 55%)", color: "white", fontFamily: "Arial,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <section style={{ width: "100%", maxWidth: 520, background: "#111116", border: "1px solid #3b3042", borderRadius: 28, overflow: "hidden", boxShadow: "0 25px 80px #0009" }}>
        <header style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #302938" }}>
          <a href="/messages" style={{ color: "#ddd", textDecoration: "none", fontSize: 25 }}>‹</a>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 900 }}>{type === "video" ? "🎥 Video call" : "📞 Voice call"}</div>
            <div style={{ fontSize: 12, color: status === "Voice unavailable" ? "#f87171" : "#22c55e", marginTop: 4 }}>● {status} {status === "Connected" || status === "Listening…" || status === "Thinking…" ? `• ${mins}:${secs}` : ""}</div>
          </div>
          <div style={{ width: 25 }} />
        </header>

        <div style={{ minHeight: 520, display: "grid", placeItems: "center", padding: 20, position: "relative", background: "linear-gradient(180deg,#160d1d,#08080b)" }}>
          <div style={{ width: 150, height: 150, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#7c3aed,#ec4899)", fontSize: 58, fontWeight: 900, boxShadow: voiceOn ? "0 0 100px #c026f388" : "0 0 80px #a855f766" }}>{name.charAt(0).toUpperCase()}</div>
          <div style={{ position: "absolute", bottom: 24, left: 0, right: 0, textAlign: "center", padding: "0 22px" }}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{name}</div>
            <div style={{ color: "#a1a1aa", marginTop: 6, minHeight: 22 }}>{error || (listening ? "🎙️ Listening… speak now" : voiceOn ? "🔊 Voice is on — talk naturally" : "Tap Start voice to begin")}</div>
            {transcript && <div style={{ marginTop: 12, color: "#c4b5fd", fontSize: 14 }}>You: “{transcript}”</div>}
            {reply && <div style={{ marginTop: 14, padding: "14px 16px", border: "1px solid #3b3042", borderRadius: 18, background: "#0d0b11", fontSize: 16, lineHeight: 1.45 }}>{reply}</div>}
            {!voiceOn && <button onClick={startVoice} style={{ marginTop: 18, padding: "13px 22px", borderRadius: 999, border: "1px solid #c084fc", background: "linear-gradient(135deg,#7c3aed,#c026d3)", color: "white", fontWeight: 800, fontSize: 16 }}>🔊 Start voice</button>}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 14, padding: 20, borderTop: "1px solid #302938", flexWrap: "wrap" }}>
          {voiceOn && <button onClick={beginListening} style={{ ...control, width: "auto", padding: "0 22px", borderRadius: 999, background: "linear-gradient(135deg,#7c3aed,#c026d3)", borderColor: "#c084fc", fontWeight: 800 }}>🎙️ Tap to speak</button>}
          {!voiceOn && <button onClick={startVoice} style={{ ...control, width: "auto", padding: "0 22px", borderRadius: 999, background: "linear-gradient(135deg,#7c3aed,#c026d3)", borderColor: "#c084fc", fontWeight: 800 }}>🔊 Start voice</button>}
          <button onClick={toggleMute} style={control}>{muted ? "🔇" : "🎙️"}</button>
          {type === "video" && <button onClick={toggleCamera} style={control}>{camera ? "📷" : "🚫"}</button>}
          <button onClick={end} style={{ ...control, background: "#b91c1c", borderColor: "#ef4444" }}>☎</button>
        </div>
        <div style={{ padding: "0 20px 20px", textAlign: "center", fontSize: 11, color: "#71717a" }}>My Gee now uses server voice with a browser voice fallback, shows your transcript and shows each new reply.</div>
      </section>
    </main>
  );
}

const control = { width: 56, height: 56, borderRadius: "50%", border: "1px solid #554361", background: "#241a2b", color: "white", fontSize: 21, cursor: "pointer" };