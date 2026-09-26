"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function CallClient() {
  const [type, setType] = useState<"voice" | "video">("voice");
  const [name, setName] = useState("Gee friend");
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [seconds, setSeconds] = useState(0);

  const activeRef = useRef(false);
  const mutedRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<Msg[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isElijah = name.toLowerCase().startsWith("elijah");

  function stopRecognition() {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setListening(false);
  }

  function stopCall(navigate = true) {
    activeRef.current = false;
    mutedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    stopRecognition();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    try { window.speechSynthesis?.cancel(); } catch {}
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setActive(false);
    setSpeaking(false);
    setStatus("Call ended");
    if (navigate) window.location.href = "/messages";
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setType(params.get("type") === "video" ? "video" : "voice");
    setName(params.get("name") || "Gee friend");
    return () => stopCall(false);
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  async function speak(text: string) {
    setSpeaking(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (response.ok) {
        const url = URL.createObjectURL(await response.blob());
        const audio = audioRef.current || new Audio();
        audioRef.current = audio;
        audio.src = url;
        audio.volume = 1;
        await audio.play();
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
        });
        URL.revokeObjectURL(url);
        setSpeaking(false);
        return;
      }
    } catch {}

    try {
      if (window.speechSynthesis) {
        await new Promise<void>((resolve) => {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.lang = isElijah ? "en-NG" : "en-GB";
          u.rate = 0.98;
          u.onend = () => resolve();
          u.onerror = () => resolve();
          window.speechSynthesis.speak(u);
        });
      }
    } catch {}
    setSpeaking(false);
  }

  async function answer(text: string) {
    const clean = text.trim();
    if (!clean || !activeRef.current) return;
    stopRecognition();
    setStatus("Thinking…");
    setError("");

    const messages: Msg[] = [...historyRef.current.slice(-10), { role: "user", content: clean }];
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companionName: isElijah ? "Elijah" : name,
          languageStyle: isElijah ? "pidgin" : "english",
          messages,
        }),
      });
      const data = response.ok ? await response.json() : {};
      const next = String(data?.reply || (isElijah ? "I dey here with you 💜. Talk to me, my guy." : "I'm here with you. Keep talking to me.")).trim();
      historyRef.current = [...messages, { role: "assistant", content: next }].slice(-12);
      setReply(next);
      await speak(next);
    } catch {
      const next = isElijah ? "I dey here with you 💜. Network dey misbehave small, but I no go disappear." : "I'm here with you. The connection is having a little trouble right now.";
      setReply(next);
      await speak(next);
    }

    if (activeRef.current && !mutedRef.current) {
      setStatus("Connected");
      timerRef.current = setTimeout(beginListening, 300);
    }
  }

  function beginListening() {
    if (!activeRef.current || mutedRef.current) return;
    const w = window as any;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      setStatus("Connected — type if needed");
      setError("Live voice input is not available in this browser. You can type below, or use Chrome on Android.");
      return;
    }

    stopRecognition();
    try {
      const recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = isElijah ? "en-NG" : "en-GB";
      recognition.continuous = false;
      recognition.interimResults = false;
      let gotResult = false;
      setListening(true);
      setStatus("Listening…");

      recognition.onresult = (event: any) => {
        gotResult = true;
        const heard = String(event?.results?.[0]?.[0]?.transcript || "").trim();
        setListening(false);
        if (heard) {
          setTranscript(heard);
          void answer(heard);
        }
      };
      recognition.onerror = (event: any) => {
        setListening(false);
        if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
          setStatus("Microphone blocked");
          setError("Allow microphone in Chrome: lock icon → Permissions → Microphone → Allow, then tap Speak.");
        } else if (event?.error !== "aborted") {
          setStatus("Connected");
          setError("I couldn't hear you. Tap Speak and try again.");
        }
      };
      recognition.onend = () => {
        setListening(false);
        if (!gotResult && activeRef.current && !mutedRef.current) timerRef.current = setTimeout(beginListening, 500);
      };
      recognition.start();
    } catch {
      setListening(false);
      setError("Tap Speak and try again.");
    }
  }

  async function startCall() {
    if (activeRef.current) return beginListening();
    setError("");
    historyRef.current = [];
    setReply("");
    setTranscript("");

    if (type === "video") {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error();
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch {
        setError("Allow camera and microphone in Chrome, then start the video call again.");
        return;
      }
    }

    activeRef.current = true;
    mutedRef.current = false;
    setActive(true);
    setSeconds(0);
    setMuted(false);
    setStatus("Connected");

    const greeting = isElijah
      ? "How far, my guy? 😄💜 I dey here with you. You fit talk to me normally — wetin dey your mind?"
      : `Hi, I'm ${name}. I'm here with you. You can talk to me naturally. What's on your mind?`;
    setReply(greeting);
    await speak(greeting);
    if (activeRef.current) beginListening();
  }

  function toggleMute() {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (streamRef.current) streamRef.current.getAudioTracks().forEach((track) => { track.enabled = !next; });
    if (next) {
      stopRecognition();
      setStatus("Microphone muted");
    } else {
      setStatus("Connected");
      beginListening();
    }
  }

  function sendTyped() {
    const value = typed.trim();
    if (!value || !activeRef.current) return;
    setTyped("");
    setTranscript(value);
    void answer(value);
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

        <div style={{ minHeight: 520, padding: 20, display: "grid", placeItems: "center", background: "linear-gradient(180deg,#160d1d,#08080b)" }}>
          <div style={{ width: 145, height: 145, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#7c3aed,#ec4899)", fontSize: 56, boxShadow: speaking ? "0 0 90px #22c55e88" : "0 0 70px #a855f766" }}>💜</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: -40 }}>{name}</div>
          <div style={{ color: "#a1a1aa", textAlign: "center", minHeight: 22 }}>{error || (listening ? "🎙️ Listening… speak now" : speaking ? "🔊 Gee is speaking…" : active ? "Connected — talk naturally" : "Tap Start to begin")}</div>
          {transcript && <div style={{ color: "#c4b5fd", fontSize: 14 }}>You: “{transcript}”</div>}
          {reply && <div style={{ width: "100%", maxWidth: 500, padding: "14px 16px", border: "1px solid #3b3042", borderRadius: 18, background: "#0d0b11", fontSize: 16, lineHeight: 1.45, textAlign: "center" }}>{reply}</div>}
        </div>

        {active && <div style={{ display: "flex", gap: 8, padding: "10px 20px 0" }}><input value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendTyped(); }} placeholder={isElijah ? "Type if you can't speak…" : "Type if needed…"} style={{ flex: 1, minWidth: 0, background: "#09090c", color: "#fff", border: "1px solid #3b3042", borderRadius: 22, padding: "11px 15px", outline: "none" }} /><button onClick={sendTyped} disabled={!typed.trim()} style={{ border: 0, borderRadius: 22, padding: "0 17px", background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "#fff", fontWeight: 800 }}>Send</button></div>}

        <div style={{ display: "flex", justifyContent: "center", gap: 12, padding: 20, borderTop: "1px solid #302938", flexWrap: "wrap" }}>
          {!active ? <button onClick={startCall} style={{ border: 0, borderRadius: 18, padding: "14px 24px", background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "white", fontWeight: 900, fontSize: 16 }}>📞 Start call</button> : <><button onClick={toggleMute} style={{ border: 0, borderRadius: 18, padding: "14px 20px", background: muted ? "#ef4444" : "#2a2130", color: "white", fontWeight: 900 }}>{muted ? "🔇 Unmute" : "🎙️ Mute"}</button><button onClick={() => stopCall()} style={{ border: 0, borderRadius: 18, padding: "14px 20px", background: "#ef4444", color: "white", fontWeight: 900 }}>End call</button></>}
        </div>
      </section>
    </main>
  );
}
