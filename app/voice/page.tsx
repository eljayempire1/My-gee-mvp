"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Nav from "../components/Nav";

type Msg = { role: "user" | "assistant"; content: string };
type RecognitionLike = {
  lang: string;
  continuous?: boolean;
  interimResults?: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror?: ((event: any) => void) | null;
};

const personalities = [
  { id: "friendly", label: "😊 Friendly", intro: "Hey, I'm your Gee. I'm here with you. What's on your mind?" },
  { id: "motivator", label: "💪 Motivator", intro: "Hey! I'm your Gee. Tell me what you're working through and we'll take it one step at a time." },
  { id: "wise", label: "🧠 Wise", intro: "I'm listening. Take your time and talk to me naturally." },
  { id: "fun", label: "😂 Fun", intro: "Hey! I'm here. Let's have a proper chat — what's happening?" },
  { id: "calm", label: "🌙 Calm", intro: "Take a breath. I'm right here with you. We can take this slowly." },
];

export default function Voice() {
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("Tap the call button and talk to Gee. This is a real conversation — not a fixed message.");
  const [heard, setHeard] = useState("");
  const [personality, setPersonality] = useState("friendly");
  const [error, setError] = useState("");
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(false);
  const messagesRef = useRef<Msg[]>([]);

  async function speak(text: string) {
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error(`TTS failed: ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = 1;
      audioRef.current = audio;
      await audio.play();
      await new Promise<void>((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      });
      return true;
    } catch (e) {
      console.error("OpenAI voice unavailable:", e);
    }

    try {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
      window.speechSynthesis.cancel();
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-GB";
        utterance.rate = 0.98;
        utterance.pitch = 1;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
      return true;
    } catch (e) {
      console.error("Browser voice unavailable:", e);
      return false;
    }
  }

  function stopCall() {
    activeRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setListening(false);
    setBusy(false);
  }

  function listenAgain() {
    if (!activeRef.current) return;
    const w = window as any;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Voice input isn't supported by this browser. Please open My GEE in Chrome on Android.");
      activeRef.current = false;
      return;
    }
    try {
      const recognition: RecognitionLike = new Recognition();
      recognition.lang = "en-GB";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognitionRef.current = recognition;
      setListening(true);
      setError("");

      recognition.onresult = async (event: any) => {
        const text = event.results?.[0]?.[0]?.transcript?.trim() || "";
        if (!text || !activeRef.current) return;
        setHeard(text);
        setListening(false);
        await answer(text);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition:", event);
        setListening(false);
        if (activeRef.current && event?.error !== "no-speech") {
          setError("I couldn't hear that. Tap the microphone and try again.");
        }
      };

      recognition.onend = () => {
        setListening(false);
        // Android Chrome ends a single recognition session after each utterance.
        // We intentionally start a fresh one after GEE speaks so the call stays live.
      };
      recognition.start();
    } catch (e) {
      console.error(e);
      setListening(false);
      setError("Tap the microphone and try again.");
    }
  }

  async function answer(text: string) {
    setBusy(true);
    setError("");
    const p = personalities.find((x) => x.id === personality) || personalities[0];
    const nextMessages: Msg[] = [
      ...messagesRef.current,
      { role: "user", content: text },
    ];
    messagesRef.current = nextMessages;

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companionName: "Gee",
          messages: [
            { role: "system", content: `You are My GEE, a warm ${p.id} companion. This is a live voice conversation. Respond naturally to exactly what the user just said. Do not repeat a greeting or canned intro. Usually answer in 1–3 short spoken sentences.` },
            ...nextMessages,
          ],
        }),
      });
      if (!r.ok) throw new Error("Chat failed");
      const data = await r.json();
      const answerText = data.reply || "I'm listening. Keep talking to me.";
      messagesRef.current = [...nextMessages, { role: "assistant", content: answerText }];
      setReply(answerText);
      const played = await speak(answerText);
      if (!played) setError("I couldn't play GEE's voice. Check your phone media volume.");
    } catch (e) {
      console.error(e);
      const fallback = "I'm still with you. Say that again and I'll keep the conversation going.";
      messagesRef.current = [...nextMessages, { role: "assistant", content: fallback }];
      setReply(fallback);
      await speak(fallback);
    } finally {
      setBusy(false);
      // Automatically return to listening after each GEE reply.
      if (activeRef.current) setTimeout(listenAgain, 250);
    }
  }

  async function startCall() {
    if (activeRef.current) {
      stopCall();
      return;
    }
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone unavailable");
      await navigator.mediaDevices.getUserMedia({ audio: true });
      activeRef.current = true;
      messagesRef.current = [];
      setHeard("");
      setReply("I'm listening… say something to me.");
      const p = personalities.find((x) => x.id === personality) || personalities[0];
      // Speak the welcome once, then start the actual live conversation.
      const played = await speak(p.intro);
      if (!played) setError("GEE voice is unavailable, but you can still use the microphone.");
      if (activeRef.current) listenAgain();
    } catch (e) {
      console.error(e);
      activeRef.current = false;
      setError("Please allow microphone access, then tap the call button again.");
    }
  }

  function choosePersonality(id: string) {
    setPersonality(id);
    if (!activeRef.current) {
      const p = personalities.find((x) => x.id === id) || personalities[0];
      setReply(p.intro);
    }
  }

  return <><Nav /><main style={{ minHeight: "calc(100vh - 55px)", padding: "24px 18px", fontFamily: "Arial,sans-serif" }}>
    <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
      <Link href="/chat" style={{ display: "inline-block", color: "#d8b4fe", textDecoration: "none", marginBottom: 16 }}>← Back to chat</Link>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 999, background: "#15131a", border: "1px solid #3b3340", color: "#c4b5fd", fontSize: 13 }}><span style={{ color: listening ? "#22c55e" : "#a1a1aa" }}>●</span>{listening ? "Listening to you" : busy ? "Gee is speaking" : "Gee voice"}</div>
      <div style={{ width: 150, height: 150, borderRadius: "50%", margin: "26px auto 18px", display: "grid", placeItems: "center", fontSize: 58, background: "linear-gradient(135deg,#581c87,#db2777)", boxShadow: listening ? "0 0 70px #c026d388" : "0 0 45px #7c3aed66" }}>💜</div>
      <h1 style={{ fontSize: 42, margin: "0 0 7px" }}>Call My Gee</h1>
      <p style={{ color: "#a1a1aa", fontSize: 17 }}>Talk naturally. GEE listens, remembers the conversation and speaks back.</p>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "18px 2px", marginBottom: 8 }}>{personalities.map((p) => <button key={p.id} onClick={() => choosePersonality(p.id)} style={{ whiteSpace: "nowrap", padding: "10px 13px", borderRadius: 999, border: personality === p.id ? "1px solid #c026d3" : "1px solid #383044", background: personality === p.id ? "#28102f" : "#121016", color: "#f3e8ff", fontWeight: 700 }}>{p.label}</button>)}</div>
      {heard && <div style={{ color: "#a1a1aa", fontSize: 13, marginBottom: 8 }}>You said: “{heard}”</div>}
      <div style={{ margin: "14px 0 28px", padding: 20, borderRadius: 22, background: "linear-gradient(145deg,#18131f,#111114)", border: "1px solid #3b3340", color: "#f5f3ff", lineHeight: 1.65, minHeight: 70 }}>{busy ? "Gee is thinking… ✨" : error || reply}</div>
      <button onClick={startCall} style={{ width: 118, height: 118, borderRadius: "50%", border: "1px solid #c084fc", background: activeRef.current ? "linear-gradient(135deg,#991b1b,#dc2626)" : "linear-gradient(135deg,#7c3aed,#c026d3)", color: "white", fontSize: 42, boxShadow: listening ? "0 0 55px #22c55e88" : "0 0 35px #7c3aed66" }}>{activeRef.current ? "☎️" : "📞"}</button>
      <p style={{ color: "#a1a1aa", marginTop: 16, fontWeight: 700 }}>{listening ? "Listening — speak now" : busy ? "Gee is replying…" : activeRef.current ? "Call is live" : "Tap to call Gee"}</p>
      {activeRef.current && <button onClick={stopCall} style={{ marginTop: 4, padding: "10px 18px", borderRadius: 12, border: "1px solid #3f3f46", background: "#18181b", color: "#e4e4e7" }}>End voice session</button>}
      <div style={{ display: "flex", justifyContent: "center", gap: 9, marginTop: 28, flexWrap: "wrap" }}>{["🎙️ Voice input", "🔊 Spoken replies", "🧠 Conversation memory", "🔒 Private session"].map((x) => <span key={x} style={{ padding: "8px 11px", borderRadius: 999, border: "1px solid #383044", background: "#121016", color: "#c4b5fd", fontSize: 12 }}>{x}</span>)}</div>
    </div>
  </main></>;
}
