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

type RealtimeEvent = { type?: string; delta?: string; transcript?: string; error?: { message?: string } };

export default function Voice() {
  const [connected, setConnected] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState("Ready for a real conversation");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("Tap the call button. Then speak naturally — GEE will listen and answer with a real voice.");
  const [error, setError] = useState("");
  const [personality, setPersonality] = useState("friendly");
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
    if (audioRef.current) audioRef.current.srcObject = null;
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
      return;
    }
    if (type === "response.output_audio_transcript.delta" || type === "response.output_text.delta") {
      if (event.delta) {
        replyTextRef.current += event.delta;
        setReply(replyTextRef.current);
      }
      return;
    }
    if (type === "response.output_audio_transcript.done" || type === "response.output_text.done") {
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

      const audio = new Audio();
      audio.autoplay = true;
      audio.playsInline = true;
      audioRef.current = audio;
      peer.addEventListener("track", (event) => {
        audio.srcObject = event.streams[0];
        audio.play().catch(() => {
          setSoundBlocked(true);
          setStatus("Voice is connected — tap Enable sound");
        });
      });

      const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = microphone;
      microphone.getAudioTracks().forEach((track) => peer.addTrack(track, microphone));

      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.addEventListener("message", (message) => {
        try { handleRealtimeEvent(JSON.parse(message.data) as RealtimeEvent); }
        catch (event) { console.error("Invalid realtime event", event); }
      });
      channel.addEventListener("open", () => setStatus("Connected — speak naturally"));
      channel.addEventListener("close", () => { if (peerRef.current === peer) cleanup(); });

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
          const timeout = window.setTimeout(() => resolve(), 8000);
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
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp, personality }),
      });
      const text = await response.text();
      if (!response.ok) {
        let message = "Voice service could not start.";
        try {
          const data = JSON.parse(text);
          message = data?.error?.message || data?.error || message;
        } catch {}
        throw new Error(message);
      }
      const session = JSON.parse(text) as { transport?: { sdp?: string } };
      const answer = session.transport?.sdp;
      if (!answer) throw new Error("GEE connected without an audio answer.");
      await peer.setRemoteDescription({ type: "answer", sdp: answer });
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
      try { channelRef.current.send(JSON.stringify({ type: "session.close" })); } catch {}
    }
    cleanup();
    setStatus("Call ended");
    setReply("Tap the call button when you want to talk to GEE again.");
  }

  async function enableSound() {
    try {
      await audioRef.current?.play();
      setSoundBlocked(false);
      setStatus("Voice is live — speak naturally");
    } catch {
      setError("Android is still blocking audio. Check the browser media volume and tap the call button again.");
    }
  }

  return <>
    <Nav />
    <main style={{ minHeight: "calc(100vh - 55px)", padding: "24px 18px", fontFamily: "Arial,sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <Link href="/chat" style={{ display: "inline-block", color: "#d8b4fe", textDecoration: "none", marginBottom: 16 }}>← Back to chat</Link>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 999, background: "#15131a", border: "1px solid #3b3340", color: "#c4b5fd", fontSize: 13 }}><span style={{ color: connected ? "#22c55e" : "#a1a1aa" }}>●</span>{status}</div>
        <div style={{ width: 150, height: 150, borderRadius: "50%", margin: "26px auto 18px", display: "grid", placeItems: "center", fontSize: 58, background: "linear-gradient(135deg,#581c87,#db2777)", boxShadow: listening ? "0 0 70px #c026d388" : "0 0 45px #7c3aed66" }}>💜</div>
        <h1 style={{ fontSize: 42, margin: "0 0 7px" }}>Call My Gee</h1>
        <p style={{ color: "#a1a1aa", fontSize: 17 }}>A real-time voice conversation — not a repeated message.</p>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "18px 2px", marginBottom: 8 }}>
          {personalities.map((p) => <button key={p.id} disabled={connected} onClick={() => setPersonality(p.id)} style={{ whiteSpace: "nowrap", padding: "10px 13px", borderRadius: 999, border: personality === p.id ? "1px solid #c026d3" : "1px solid #383044", background: personality === p.id ? "#28102f" : "#121016", color: "#f3e8ff", fontWeight: 700 }}>{p.label}</button>)}
        </div>
        {heard && <div style={{ color: "#a1a1aa", fontSize: 13, marginBottom: 8 }}>You said: “{heard}”</div>}
        <div style={{ margin: "14px 0 28px", padding: 20, borderRadius: 22, background: "linear-gradient(145deg,#18131f,#111114)", border: "1px solid #3b3340", color: "#f5f3ff", lineHeight: 1.65, minHeight: 78 }}>{error || reply}</div>
        <button onClick={startCall} aria-label={connected ? "End GEE call" : "Start GEE call"} style={{ width: 126, height: 126, borderRadius: "50%", border: "1px solid #c084fc", background: connected ? "linear-gradient(135deg,#991b1b,#dc2626)" : "linear-gradient(135deg,#7c3aed,#c026d3)", color: "white", fontSize: 42, boxShadow: listening ? "0 0 55px #22c55e88" : "0 0 35px #7c3aed66" }}>{connected ? "☎️" : "📞"}</button>
        <p style={{ color: "#a1a1aa", marginTop: 16, fontWeight: 700 }}>{connected ? (listening ? "Listening — speak now" : speaking ? "Gee is speaking…" : "Call is live — talk naturally") : "Tap to call Gee"}</p>
        {soundBlocked && <button onClick={enableSound} style={{ marginTop: 4, padding: "11px 18px", borderRadius: 12, border: "1px solid #c084fc", background: "#21122c", color: "#f3e8ff", fontWeight: 700 }}>🔊 Enable sound</button>}
        {connected && <button onClick={stopCall} style={{ display: "block", margin: "12px auto 0", padding: "10px 18px", borderRadius: 12, border: "1px solid #3f3f46", background: "#18181b", color: "#e4e4e7" }}>End voice session</button>}
        <div style={{ display: "flex", justifyContent: "center", gap: 9, marginTop: 28, flexWrap: "wrap" }}>{["🎙️ Live microphone", "🔊 Real spoken replies", "🧠 One continuous conversation", "🔒 Private session"].map((x) => <span key={x} style={{ padding: "8px 11px", borderRadius: 999, border: "1px solid #383044", background: "#121016", color: "#c4b5fd", fontSize: 12 }}>{x}</span>)}</div>
      </div>
    </main>
  </>;
}
