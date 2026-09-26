"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const personalities = [
  { id: "friendly", label: "😊 Friendly" },
  { id: "motivator", label: "💪 Motivator" },
  { id: "wise", label: "🧠 Wise" },
  { id: "fun", label: "😂 Fun" },
  { id: "calm", label: "🌙 Calm" },
];

const languages = [
  { id: "english", label: "🇬🇧 English" },
  { id: "casual", label: "😎 English + Slang" },
  { id: "pidgin", label: "🇳🇬 Naija Pidgin" },
  { id: "naija_mix", label: "🇳🇬 Naija Mix" },
  { id: "yoruba", label: "🟢 Yoruba" },
  { id: "igbo", label: "🔵 Igbo" },
  { id: "hausa", label: "🟤 Hausa" },
  { id: "spanish", label: "🇪🇸 Spanish" },
  { id: "french", label: "🇫🇷 French" },
];

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

type VoiceMessage = { role: "user" | "assistant"; content: string };

declare global {
  interface Window {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  }
}

export default function VoiceClient() {
  const [connected, setConnected] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState("Ready for a real conversation");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("Tap the call button. Then speak naturally — GEE will listen and answer with a real voice.");
  const [error, setError] = useState("");
  const [personality, setPersonality] = useState("friendly");
  const [language, setLanguage] = useState("english");
  const [muted, setMuted] = useState(false);

  const micRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const historyRef = useRef<VoiceMessage[]>([]);
  const restartRef = useRef(true);
  const listenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => stopCall(), []);

  async function ensureMic() {
    if (micRef.current) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot access the microphone. Please use Chrome on Android.");
      return false;
    }
    try {
      micRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch {
      setError("Please allow microphone access, then tap the call button again.");
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
        const voice = window.speechSynthesis.getVoices().find((v) => /en-GB/i.test(v.lang));
        if (voice) utterance.voice = voice;
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
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = audioRef.current || new Audio();
        audioRef.current = audio;
        audio.src = url;
        audio.preload = "auto";
        audio.volume = 1;
        await audio.play();
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
        });
        URL.revokeObjectURL(url);
        setSpeaking(false);
        return true;
      }
    } catch (e) {
      console.warn("TTS playback failed; using browser voice", e);
    }
    const played = await browserSpeak(text);
    setSpeaking(false);
    return played;
  }

  async function getReply(text: string) {
    const messages: VoiceMessage[] = [
      ...historyRef.current.slice(-10),
      { role: "user", content: text },
    ];
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companionName: "My Gee",
        languageStyle: language,
        messages,
      }),
    });
    if (!response.ok) throw new Error("GEE could not answer right now.");
    const data = await response.json();
    const answer = String(data.reply || "I'm here with you. Keep talking to me.").trim();
    historyRef.current = [...messages, { role: "assistant" as const, content: answer }].slice(-12);
    return answer;
  }

  function beginListening() {
    if (!activeRef.current || busyRef.current || muted) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setListening(false);
      setError("Voice input is not supported in this browser. Please use Chrome on Android.");
      return;
    }
    try {
      recognitionRef.current?.stop();
      const recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = language === "spanish" ? "es-ES" : language === "french" ? "fr-FR" : "en-GB";
      recognition.continuous = false;
      recognition.interimResults = false;
      let gotResult = false;
      restartRef.current = true;
      setListening(true);
      setStatus("Listening — speak now");
      setError("");
      recognition.onresult = async (event) => {
        gotResult = true;
        const text = String(event.results?.[0]?.[0]?.transcript || "").trim();
        setListening(false);
        if (!text) return;
        setHeard(text);
        restartRef.current = false;
        busyRef.current = true;
        setStatus("Gee is thinking…");
        try {
          const answer = await getReply(text);
          setReply(answer);
          await speak(answer);
        } catch (e) {
          setError(e instanceof Error ? e.message : "GEE could not answer right now.");
        } finally {
          busyRef.current = false;
          setStatus("Connected — your turn");
          if (activeRef.current) {
            restartRef.current = true;
            listenTimerRef.current = setTimeout(beginListening, 250);
          }
        }
      };
      recognition.onerror = (event) => {
        setListening(false);
        if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
          setError("Microphone permission is blocked. Tap the lock icon → Microphone → Allow, then reload.");
          restartRef.current = false;
        } else if (event?.error !== "aborted") {
          setError("I couldn't hear you. I'll keep the call ready for another try.");
        }
      };
      recognition.onend = () => {
        setListening(false);
        if (!gotResult && restartRef.current && activeRef.current && !busyRef.current && !muted) {
          listenTimerRef.current = setTimeout(beginListening, 350);
        }
      };
      recognition.start();
      listenTimerRef.current = setTimeout(() => {
        if (!gotResult && activeRef.current && !busyRef.current) {
          try { recognition.stop(); } catch {}
          setListening(false);
          setStatus("Connected — tap to speak");
        }
      }, 12000);
    } catch {
      setListening(false);
      setError("Tap the microphone button and speak again.");
    }
  }

  async function startCall() {
    if (connected) {
      stopCall();
      return;
    }
    setError("");
    setStatus("Connecting voice…");
    const ok = await ensureMic();
    if (!ok) return;
    activeRef.current = true;
    restartRef.current = true;
    historyRef.current = [];
    setConnected(true);
    setMuted(false);
    const greeting = "Hi, I'm your My Gee. I'm here with you. You can talk to me naturally — what's on your mind?";
    setReply(greeting);
    const played = await speak(greeting);
    if (!played) setError("Voice playback was blocked. Turn up media volume and tap the microphone button to try again.");
    setStatus("Connected — your turn");
    beginListening();
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    micRef.current?.getAudioTracks().forEach((track) => (track.enabled = !next));
    if (next) {
      recognitionRef.current?.stop();
      setListening(false);
      setStatus("Microphone muted");
    } else {
      setStatus("Connected — your turn");
      beginListening();
    }
  }

  function stopCall() {
    activeRef.current = false;
    restartRef.current = false;
    if (listenTimerRef.current) clearTimeout(listenTimerRef.current);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    micRef.current?.getTracks().forEach((track) => track.stop());
    micRef.current = null;
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    busyRef.current = false;
    setConnected(false);
    setListening(false);
    setSpeaking(false);
    setMuted(false);
    setStatus("Call ended");
  }

  return (
    <>
      <main style={{ minHeight: "100vh", background: "#07070a", color: "white", fontFamily: "Arial,sans-serif", padding: "24px 18px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <Link href="/chat" style={{ display: "inline-block", color: "#d8b4fe", textDecoration: "none", marginBottom: 16 }}>← Back to chat</Link>
          <div style={{ display: "inline-flex", padding: "7px 12px", borderRadius: 999, background: "#15131a", border: "1px solid #3b3340", color: "#c4b5fd", fontSize: 13 }}>
            <span style={{ color: connected ? "#22c55e" : "#a1a1aa", marginRight: 7 }}>●</span>{status}
          </div>
          <div style={{ width: 150, height: 150, borderRadius: "50%", margin: "26px auto 18px", display: "grid", placeItems: "center", fontSize: 58, background: "linear-gradient(135deg,#581c87,#db2777)", boxShadow: speaking ? "0 0 70px #22c55e88" : "0 0 45px #7c3aed66" }}>💜</div>
          <h1 style={{ fontSize: 42, margin: "0 0 7px" }}>Call My Gee</h1>
          <p style={{ color: "#a1a1aa", fontSize: 17 }}>Real voice conversation — GEE listens, answers and keeps the conversation moving.</p>

          <div style={{ margin: "10px 0", padding: 14, borderRadius: 16, background: "#121016", border: "1px solid #3b3340", textAlign: "left" }}>
            <div style={{ color: "#c4b5fd", fontSize: 12, fontWeight: 800, marginBottom: 8 }}>LANGUAGE</div>
            <select disabled={connected} value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: "100%", background: "#09090b", color: "white", border: "1px solid #4b3b55", borderRadius: 12, padding: 13, fontSize: 15 }}>
              {languages.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "14px 2px" }}>
            {personalities.map((p) => <button key={p.id} disabled={connected} onClick={() => setPersonality(p.id)} style={{ whiteSpace: "nowrap", padding: "10px 13px", borderRadius: 999, border: personality === p.id ? "1px solid #c026d3" : "1px solid #383044", background: personality === p.id ? "#28102f" : "#121016", color: "#f3e8ff", fontWeight: 700 }}>{p.label}</button>)}
          </div>

          {heard && <div style={{ color: "#a1a1aa", fontSize: 13, margin: "8px 0" }}>You said: “{heard}”</div>}
          <div style={{ margin: "14px 0 26px", padding: 20, borderRadius: 22, background: "linear-gradient(145deg,#18131f,#111114)", border: "1px solid #3b3340", color: "#f5f3ff", lineHeight: 1.65, minHeight: 82 }}>{error || reply}</div>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={startCall} aria-label={connected ? "End GEE call" : "Start GEE call"} style={{ width: 126, height: 126, borderRadius: "50%", border: "1px solid #c084fc", background: connected ? "linear-gradient(135deg,#991b1b,#dc2626)" : "linear-gradient(135deg,#7c3aed,#c026d3)", color: "white", fontSize: 42, boxShadow: speaking ? "0 0 55px #22c55e88" : "0 0 35px #7c3aed66" }}>{connected ? "☎️" : "📞"}</button>
          </div>
          <p style={{ color: "#a1a1aa", marginTop: 14, fontWeight: 700 }}>{connected ? (listening ? "Listening — speak now" : speaking ? "Gee is speaking…" : "Call is live") : "Tap to call Gee"}</p>

          {connected && <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button onClick={beginListening} style={{ padding: "12px 18px", borderRadius: 14, border: "1px solid #c084fc", background: "#21122c", color: "#f3e8ff", fontWeight: 800 }}>🎙️ Speak</button>
            <button onClick={toggleMute} style={{ padding: "12px 18px", borderRadius: 14, border: "1px solid #4b3b55", background: muted ? "#3b1d2f" : "#21152a", color: "white", fontWeight: 800 }}>{muted ? "🔇 Unmute" : "🎙️ Mute"}</button>
          </div>}
        </div>
      </main>
    </>
  );
}
