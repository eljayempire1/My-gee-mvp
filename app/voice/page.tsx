"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Nav from "../components/Nav";

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
  { id: "motivator", label: "💪 Motivator", intro: "Let's go! Tell me what you're working through and we'll take it one step at a time." },
  { id: "wise", label: "🧠 Wise", intro: "I'm listening. Take your time and tell me what's on your mind." },
  { id: "fun", label: "😂 Fun", intro: "Hey! I'm here. Let's have a proper chat. What's happening?" },
  { id: "calm", label: "🌙 Calm", intro: "Take a breath. I'm right here with you. We can take this slowly." },
];

export default function Voice() {
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState(personalities[0].intro);
  const [personality, setPersonality] = useState("friendly");
  const [error, setError] = useState("");
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function speak(text: string) {
    // Primary voice: server-side OpenAI TTS. The API key never reaches the browser.
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

    // Fallback: Android/Chrome's built-in speech engine, so the call still speaks
    // while the OpenAI voice service is being configured or unavailable.
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

  async function answer(text: string) {
    setBusy(true);
    setError("");
    try {
      const p = personalities.find((x) => x.id === personality) || personalities[0];
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companionName: "Gee",
          messages: [
            { role: "system", content: `You are My GEE, a warm ${p.id} companion. Speak naturally, briefly, warmly and conversationally. Never sound robotic. This is a live voice conversation.` },
            { role: "user", content: text },
          ],
        }),
      });
      if (!r.ok) throw new Error("Chat failed");
      const data = await r.json();
      const answerText = data.reply || "I'm here with you. Tell me more.";
      setReply(answerText);
      const played = await speak(answerText);
      if (!played) setError("I couldn't play GEE's voice. Please check your phone media volume.");
    } catch (e) {
      console.error(e);
      const fallback = "I'm still here with you. Please try saying that again.";
      setReply(fallback);
      const played = await speak(fallback);
      if (!played) setError("GEE couldn't play a voice reply right now.");
    } finally {
      setBusy(false);
    }
  }

  function startListening() {
    if (listening) { stopCall(); return; }
    setError("");
    const w = window as any;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      const msg = "Voice input isn't supported here. Please open My GEE in Chrome on Android.";
      setError(msg);
      return;
    }
    try {
      const recognition: RecognitionLike = new Recognition();
      recognition.lang = "en-GB";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognitionRef.current = recognition;
      setListening(true);
      recognition.onresult = async (event: any) => {
        const text = event.results?.[0]?.[0]?.transcript?.trim() || "";
        setListening(false);
        if (text) await answer(text);
      };
      recognition.onerror = (event: any) => {
        console.error(event);
        setListening(false);
        setError("I couldn't hear you. Tap the call button and try again.");
      };
      recognition.onend = () => setListening(false);
      recognition.start();
    } catch (e) {
      console.error(e);
      setListening(false);
      setError("Tap the call button to start voice again.");
    }
  }

  async function startCall() {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone unavailable");
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setListening(false);
      const p = personalities.find((x) => x.id === personality) || personalities[0];
      setReply(p.intro);
      const played = await speak(p.intro);
      if (!played) setError("GEE's voice could not start. Check your phone media volume.");
      startListening();
    } catch (e) {
      console.error(e);
      setError("Please allow microphone access, then tap the call button again.");
    }
  }

  function choosePersonality(id: string) {
    setPersonality(id);
    const p = personalities.find((x) => x.id === id) || personalities[0];
    setReply(p.intro);
  }

  return <><Nav /><main style={{ minHeight: "calc(100vh - 55px)", padding: "24px 18px", fontFamily: "Arial,sans-serif" }}>
    <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
      <Link href="/chat" style={{ display: "inline-block", color: "#d8b4fe", textDecoration: "none", marginBottom: 16 }}>← Back to chat</Link>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 999, background: "#15131a", border: "1px solid #3b3340", color: "#c4b5fd", fontSize: 13 }}><span style={{ color: listening ? "#22c55e" : "#a1a1aa" }}>●</span>{listening ? "Listening to you" : "Gee voice"}</div>
      <div style={{ width: 150, height: 150, borderRadius: "50%", margin: "26px auto 18px", display: "grid", placeItems: "center", fontSize: 58, background: "linear-gradient(135deg,#581c87,#db2777)", boxShadow: listening ? "0 0 70px #c026d388" : "0 0 45px #7c3aed66" }}>💜</div>
      <h1 style={{ fontSize: 42, margin: "0 0 7px" }}>Call My Gee</h1>
      <p style={{ color: "#a1a1aa", fontSize: 17 }}>Talk naturally. GEE will listen and speak back.</p>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "18px 2px", marginBottom: 8 }}>{personalities.map((p) => <button key={p.id} onClick={() => choosePersonality(p.id)} style={{ whiteSpace: "nowrap", padding: "10px 13px", borderRadius: 999, border: personality === p.id ? "1px solid #c026d3" : "1px solid #383044", background: personality === p.id ? "#28102f" : "#121016", color: "#f3e8ff", fontWeight: 700 }}>{p.label}</button>)}</div>
      <div style={{ margin: "14px 0 28px", padding: 20, borderRadius: 22, background: "linear-gradient(145deg,#18131f,#111114)", border: "1px solid #3b3340", color: "#f5f3ff", lineHeight: 1.65, minHeight: 70 }}>{busy ? "GEE is thinking… ✨" : error || reply}</div>
      <button onClick={startCall} style={{ width: 118, height: 118, borderRadius: "50%", border: "1px solid #c084fc", background: listening ? "linear-gradient(135deg,#991b1b,#dc2626)" : "linear-gradient(135deg,#7c3aed,#c026d3)", color: "white", fontSize: 42, boxShadow: listening ? "0 0 45px #dc262688" : "0 0 35px #7c3aed66" }}>{listening ? "☎️" : "📞"}</button>
      <p style={{ color: "#a1a1aa", marginTop: 16, fontWeight: 700 }}>{listening ? "Listening — speak naturally" : "Tap to call Gee"}</p>
      {listening && <button onClick={stopCall} style={{ marginTop: 4, padding: "10px 18px", borderRadius: 12, border: "1px solid #3f3f46", background: "#18181b", color: "#e4e4e7" }}>End voice session</button>}
      <div style={{ display: "flex", justifyContent: "center", gap: 9, marginTop: 28, flexWrap: "wrap" }}>{["🎙️ Voice input", "🔊 Spoken replies", "😊 Personality", "🔒 Private session"].map((x) => <span key={x} style={{ padding: "8px 11px", borderRadius: 999, border: "1px solid #383044", background: "#121016", color: "#c4b5fd", fontSize: 12 }}>{x}</span>)}</div>
    </div>
  </main></>;
}
