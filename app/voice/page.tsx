"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Nav from "../components/Nav";

const personalities = [
  { id: "friendly", label: "😊 Friendly" },
  { id: "motivator", label: "💪 Motivator" },
  { id: "wise", label: "🧠 Wise" },
  { id: "fun", label: "😂 Fun" },
  { id: "calm", label: "🌙 Calm" },
];
const languageOptions = [
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

type RealtimeEvent = {
  type?: string;
  delta?: string;
  transcript?: string;
  text?: string;
  error?: { message?: string };
};

export default function Voice() {
  const [connected, setConnected] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState("Ready for a real conversation");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("Tap the call button. Then speak naturally — GEE will listen and answer with a real voice.");
  const [error, setError] = useState("");
  const [personality, setPersonality] = useState("friendly");
  const [language, setLanguage] = useState("english");
  const [soundBlocked, setSoundBlocked] = useState(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const replyTextRef = useRef("");

  function cleanup() {
    channelRef.current?.close();
    channelRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    micRef.current?.getTracks().forEach((track) => track.stop());
    micRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }
    setConnected(false);
    setListening(false);
    setSpeaking(false);
  }

  function handleRealtimeEvent(event: RealtimeEvent) {
    const type = event.type || "";
    if (type === "session.created" || type === "session.updated") {
      setConnected(true);
      setStatus("Connected — speak naturally");
      return;
    }
    if (type === "input_audio_buffer.speech_started") {
      setListening(true);
      setSpeaking(false);
      setStatus("Listening to you…");
      return;
    }
    if (type === "input_audio_buffer.speech_stopped") {
      setListening(false);
      setStatus("Gee is thinking…");
      return;
    }
    if (type === "conversation.item.input_audio_transcription.completed") {
      if (event.transcript) setHeard(event.transcript);
      return;
    }
    if (type === "response.created") {
      setSpeaking(true);
      setStatus("Gee is speaking…");
      replyTextRef.current = "";
      setReply("");
      void audioRef.current?.play().catch(() => setSoundBlocked(true));
      return;
    }
    if (type === "response.output_audio_transcript.delta") {
      if (event.delta) {
        replyTextRef.current += event.delta;
        setReply(replyTextRef.current);
      }
      return;
    }
    if (type === "response.output_audio_transcript.done") {
      if (event.transcript) {
        replyTextRef.current = event.transcript;
        setReply(event.transcript);
      }
      return;
    }
    if (type === "response.done") {
      setSpeaking(false);
      setStatus("Listening — your turn");
      return;
    }
    if (type === "error") {
      const message = event.error?.message || "The voice service returned an error.";
      console.error("GEE realtime error:", event);
      setError(message);
      setStatus("Voice connection needs attention");
    }
  }

  async function startCall() {
    if (connected) {
      stopCall();
      return;
    }
    setError("");
    setSoundBlocked(false);
    setStatus("Connecting to GEE voice…");
    setReply("Connecting…");
    setHeard("");
    replyTextRef.current = "";

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot access the microphone.");
      if (!("RTCPeerConnection" in window)) throw new Error("This browser does not support real-time voice calls.");

      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = microphone;
      microphone.getAudioTracks().forEach((track) => peer.addTrack(track, microphone));

      peer.addEventListener("track", (event) => {
        console.log("GEE remote audio track received");
        const stream = event.streams[0];
        const audio = audioRef.current;
        if (!audio || !stream) return;
        audio.srcObject = stream;
        audio.autoplay = true;
        audio.playsInline = true;
        audio.volume = 1;
        audio.muted = false;
        setStatus("Voice connected — GEE can speak now");
        void audio.play().then(() => setSoundBlocked(false)).catch((playError) => {
          console.warn("GEE audio autoplay blocked:", playError);
          setSoundBlocked(true);
          setStatus("Voice connected — tap 🔊 Sound on");
        });
      });

      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.addEventListener("message", (message) => {
        try {
          handleRealtimeEvent(JSON.parse(message.data) as RealtimeEvent);
        } catch (event) {
          console.error("Invalid realtime event", event);
        }
      });
      channel.addEventListener("open", () => setStatus("Connected — speak naturally"));
      channel.addEventListener("close", () => {
        if (peerRef.current === peer) cleanup();
      });

      peer.addEventListener("connectionstatechange", () => {
        if (peer.connectionState === "failed") {
          setError("The voice connection failed. Please tap the call button again.");
          cleanup();
        }
      });

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      if (peer.iceGatheringState !== "complete") {
        await new Promise<void>((resolve) => {
          const timeout = window.setTimeout(resolve, 8000);
          const check = () => {
            if (peer.iceGatheringState === "complete") {
              window.clearTimeout(timeout);
              peer.removeEventListener("icegatheringstatechange", check);
              resolve();
            }
          };
          peer.addEventListener("icegatheringstatechange", check);
        });
      }

      const sdp = peer.localDescription?.sdp;
      if (!sdp) throw new Error("Could not create the voice connection.");

      const response = await fetch(`/api/session?personality=${encodeURIComponent(personality)}&language=${encodeURIComponent(language)}`, {
        method: "POST",
        headers: { "Content-Type": "application/sdp", Accept: "application/sdp" },
        body: sdp,
      });
      const answerSdp = await response.text();
      if (!response.ok) {
        let message = "Voice service could not start.";
        try {
          const data = JSON.parse(answerSdp);
          message = data?.error?.message || data?.error || message;
        } catch {}
        throw new Error(message);
      }
      if (!answerSdp.trim()) throw new Error("GEE connected without an audio answer.");
      await peer.setRemoteDescription({ type: "answer", sdp: answerSdp });
      setConnected(true);
      setStatus("Connected — speak naturally");
      setReply("I'm listening. Say anything to me.");
    } catch (event) {
      console.error("GEE voice start error:", event);
      setError(event instanceof Error ? event.message : "Could not start the voice call.");
      setStatus("Could not start voice");
      cleanup();
    }
  }

  function stopCall() {
    if (channelRef.current?.readyState === "open") {
      try { channelRef.current.send(JSON.stringify({ type: "response.cancel" })); } catch {}
    }
    cleanup();
    setStatus("Call ended");
    setReply("Tap the call button when you want to talk to GEE again.");
  }

  async function enableSound() {
    try {
      const audio = audioRef.current;
      if (!audio) throw new Error("No GEE audio stream is connected yet.");
      audio.muted = false;
      audio.volume = 1;
      await audio.play();
      setSoundBlocked(false);
      setStatus("🔊 Sound is on — speak naturally");
      setError("");
    } catch {
      setError("Sound is still blocked. Turn up media volume, then tap 🔊 Sound on again.");
    }
  }

  return <>
    <Nav />
    <main style={{ minHeight: "calc(100vh - 55px)", padding: "24px 18px", fontFamily: "Arial,sans-serif" }}>
      <audio ref={audioRef} autoPlay playsInline controls={false} style={{ display: "none" }} />
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <Link href="/chat" style={{ display: "inline-block", color: "#d8b4fe", textDecoration: "none", marginBottom: 16 }}>← Back to chat</Link>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 999, background: "#15131a", border: "1px solid #3b3340", color: "#c4b5fd", fontSize: 13 }}><span style={{ color: connected ? "#22c55e" : "#a1a1aa" }}>●</span>{status}</div>
        <div style={{ width: 150, height: 150, borderRadius: "50%", margin: "26px auto 18px", display: "grid", placeItems: "center", fontSize: 58, background: "linear-gradient(135deg,#581c87,#db2777)", boxShadow: listening ? "0 0 70px #c026f388" : "0 0 45px #7c3aed66" }}>💜</div>
        <h1 style={{ fontSize: 42, margin: "0 0 7px" }}>Call My Gee</h1>
        <p style={{ color: "#a1a1aa", fontSize: 17 }}>Talk naturally. GEE listens, remembers the conversation and speaks back.</p>

        <div style={{ margin: "10px 0 8px", padding: 14, borderRadius: 16, background: "#121016", border: "1px solid #3b3340", textAlign: "left" }}>
          <div style={{ color: "#c4b5fd", fontSize: 12, fontWeight: 800, marginBottom: 8 }}>🗣️ LANGUAGE & SLANG</div>
          <select disabled={connected} value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: "100%", background: "#09090b", color: "white", border: "1px solid #4b3b55", borderRadius: 12, padding: 13, fontSize: 15 }}>
            {languageOptions.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "14px 2px", marginBottom: 8 }}>
          {personalities.map((p) => <button key={p.id} disabled={connected} onClick={() => setPersonality(p.id)} style={{ whiteSpace: "nowrap", padding: "10px 13px", borderRadius: 999, border: personality === p.id ? "1px solid #c026d3" : "1px solid #383044", background: personality === p.id ? "#28102f" : "#121016", color: "#f3e8ff", fontWeight: 700 }}>{p.label}</button>)}
        </div>

        {heard && <div style={{ color: "#a1a1aa", fontSize: 13, marginBottom: 8 }}>You said: “{heard}”</div>}
        <div style={{ margin: "14px 0 28px", padding: 20, borderRadius: 22, background: "linear-gradient(145deg,#18131f,#111114)", border: "1px solid #3b3340", color: "#f5f3ff", lineHeight: 1.65, minHeight: 78 }}>{error || reply}</div>

        <button onClick={startCall} aria-label={connected ? "End GEE call" : "Start GEE call"} style={{ width: 126, height: 126, borderRadius: "50%", border: "1px solid #c084fc", background: connected ? "linear-gradient(135deg,#991b1b,#dc2626)" : "linear-gradient(135deg,#7c3aed,#c026d3)", color: "white", fontSize: 42, boxShadow: listening ? "0 0 55px #22c55e88" : "0 0 35px #7c3aed66" }}>{connected ? "☎️" : "📞"}</button>
        <p style={{ color: "#a1a1aa", marginTop: 16, fontWeight: 700 }}>{connected ? (listening ? "Listening — speak now" : speaking ? "Gee is speaking…" : "Call is live — talk naturally") : "Tap to call Gee"}</p>

        {connected && <button onClick={enableSound} style={{ margin: "8px auto", padding: "13px 22px", borderRadius: 14, border: "1px solid #c084fc", background: soundBlocked ? "#6b21a8" : "#21122c", color: "#f3e8ff", fontWeight: 800, fontSize: 15 }}>🔊 {soundBlocked ? "Enable sound" : "Sound on"}</button>}
        {connected && <button onClick={stopCall} style={{ display: "block", margin: "12px auto 0", padding: "10px 18px", borderRadius: 12, border: "1px solid #3f3f46", background: "#18181b", color: "#e4e4e7" }}>End voice session</button>}

        <div style={{ display: "flex", justifyContent: "center", gap: 9, marginTop: 28, flexWrap: "wrap" }}>
          {["🎙️ Live microphone", "🔊 Real spoken replies", "🧠 One continuous conversation", "🔒 Private session"].map((x) => <span key={x} style={{ padding: "8px 11px", borderRadius: 999, border: "1px solid #383044", background: "#121016", color: "#c4b5fd", fontSize: 12 }}>{x}</span>)}
        </div>
      </div>
    </main>
  </>;
}
