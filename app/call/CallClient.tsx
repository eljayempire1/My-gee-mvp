"use client";

import { useEffect, useRef, useState } from "react";

export default function CallClient() {
  const [type, setType] = useState<"voice" | "video">("voice");
  const [name, setName] = useState("My Gee");
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(false);
  const [error, setError] = useState("");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const gender = name.toLowerCase().startsWith("emma") ? "female" : "male";

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("type") === "video" ? "video" : "voice";
    setType(t);
    setName(p.get("name") || "My Gee");
    setCamera(t === "video");
    return () => endCall(false);
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setSeconds(v => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  async function startCall() {
    if (active) return;
    setError("");
    setStatus("Connecting…");
    try {
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      const remote = document.createElement("audio");
      remote.autoplay = true;
      audioRef.current = remote;
      document.body.appendChild(remote);
      pc.ontrack = e => {
        remote.srcObject = e.streams[0];
        remote.play().catch(() => undefined);
      };
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "connected") setStatus("Connected");
        if (state === "failed" || state === "disconnected") setStatus("Connection lost");
      };

      const local = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
      streamRef.current = local;
      local.getAudioTracks().forEach(t => pc.addTrack(t, local));
      if (type === "video") {
        local.getVideoTracks().forEach(t => pc.addTrack(t, local));
        if (videoRef.current) {
          videoRef.current.srcObject = local;
          await videoRef.current.play().catch(() => undefined);
        }
      }

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onopen = () => {
        setStatus("Connected");
        dc.send(JSON.stringify({ type: "response.create", response: { instructions: `Start naturally as ${name}. Keep your first response brief, warm and conversational.` } }));
      };
      dc.onmessage = e => {
        try {
          const ev = JSON.parse(e.data);
          if (ev.type === "input_audio_buffer.speech_started") setStatus("Listening…");
          else if (ev.type === "response.created") setStatus("Speaking…");
          else if (ev.type === "response.done") setStatus("Connected");
          else if (ev.type === "error") setError(ev.error?.message || "Realtime call error");
        } catch { /* ignore non-JSON events */ }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 17000);
      let r: Response;
      try {
        r = await fetch("/api/realtime/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/sdp",
            "X-Companion-Name": name,
            "X-Companion-Gender": gender,
          },
          body: offer.sdp || "",
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeout);
      }
      if (!r.ok) {
        const detail = await r.text().catch(() => "");
        throw new Error(detail || "Realtime call could not be started.");
      }
      const answer = await r.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answer });
      setActive(true);
      setSeconds(0);
      setMuted(false);
    } catch (e) {
      endCall(false);
      setStatus("Call failed");
      setError(e instanceof Error && e.name === "AbortError" ? "The call service timed out. Please try again." : e instanceof Error ? e.message : "Could not start the call.");
    }
  }

  function toggleMute() {
    const n = !muted;
    setMuted(n);
    streamRef.current?.getAudioTracks().forEach(t => (t.enabled = !n));
    setStatus(n ? "Microphone muted" : "Connected");
  }

  function toggleCamera() {
    const n = !camera;
    setCamera(n);
    streamRef.current?.getVideoTracks().forEach(t => (t.enabled = n));
  }

  function endCall(render = true) {
    if (timerRef.current) window.clearInterval(timerRef.current);
    try { dcRef.current?.close(); } catch {}
    try { pcRef.current?.close(); } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current.remove();
    }
    pcRef.current = null;
    dcRef.current = null;
    streamRef.current = null;
    audioRef.current = null;
    setActive(false);
    setMuted(false);
    if (render) setStatus("Call ended");
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const buttonStyle: React.CSSProperties = { borderRadius: 14, padding: "14px 18px", border: "1px solid rgba(255,255,255,.14)", fontWeight: 700, cursor: "pointer", background: "#17131c", color: "white" };

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(circle at 50% 15%, #22002f 0, #08060b 42%, #050507 100%)", color: "white", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", padding: "24px 16px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <button onClick={() => window.history.back()} style={buttonStyle}>← Back</button>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800 }}>{name}</div><div style={{ fontSize: 13, color: "#aaa" }}>{active ? `${mm}:${ss} • ${status}` : status}</div></div>
          <div style={{ width: 74 }} />
        </div>

        <section style={{ borderRadius: 28, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.12)", padding: 22, minHeight: 520, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 24px 70px rgba(0,0,0,.35)" }}>
          {type === "video" && <video ref={videoRef} muted playsInline style={{ width: "100%", borderRadius: 20, background: "#000", aspectRatio: "16/10", objectFit: "cover" }} />}
          <div style={{ textAlign: "center", padding: "56px 10px" }}>
            <div style={{ fontSize: 54, marginBottom: 18 }}>{active ? "●" : "☎"}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{active ? "Live conversation" : "Ready when you are."}</div>
            <div style={{ fontSize: 15, color: "#aaa", marginTop: 10 }}>{active ? "Speak naturally. You can interrupt whenever you want." : "Tap Start to connect."}</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 16 }}>
            <button onClick={startCall} disabled={active} style={{ ...buttonStyle, flex: "1 1 150px", background: active ? "#29242d" : "linear-gradient(135deg,#7b00ff,#c000ff)", border: 0 }}>Start call</button>
            <button onClick={toggleMute} disabled={!active} style={{ ...buttonStyle, opacity: active ? 1 : .45 }}>{muted ? "Unmute" : "Mute"}</button>
            {type === "video" && <button onClick={toggleCamera} disabled={!active} style={{ ...buttonStyle, opacity: active ? 1 : .45 }}>{camera ? "Cam off" : "Cam on"}</button>}
            <button onClick={() => endCall()} disabled={!active} style={{ ...buttonStyle, opacity: active ? 1 : .45, borderColor: "rgba(255,100,100,.3)" }}>End</button>
          </div>
          {error && <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "rgba(255,60,90,.1)", color: "#ffb5c0", fontSize: 13, wordBreak: "break-word" }}>{error}</div>}
        </section>
      </div>
    </main>
  );
}
