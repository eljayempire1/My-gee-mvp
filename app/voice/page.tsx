"use client";

import { useState } from "react";
import Link from "next/link";
import Nav from "../components/Nav";

type SpeechRecognitionLike = { lang: string; start: () => void; stop: () => void; onresult: ((event: any) => void) | null; onend: (() => void) | null };

declare global { interface Window { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike } }

export default function Voice() {
  const [listening, setListening] = useState(false);
  const [reply, setReply] = useState("Hi 💜 I'm here. Tap the microphone and talk to your Gee.");
  const [busy, setBusy] = useState(false);

  function speak(text: string) { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); }

  function startListening() {
    const Recognition = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : undefined;
    if (!Recognition) { const msg = "Voice input isn't supported by this browser yet. Try Chrome on Android or Safari on iPhone."; setReply(msg); speak(msg); return; }
    const recognition = new Recognition(); recognition.lang = "en-GB"; setListening(true);
    recognition.onresult = async (event) => { const text = event.results?.[0]?.[0]?.transcript || ""; if (!text) return; setBusy(true); try { const r = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ messages:[{role:"user",content:text}] }) }); const data = await r.json(); const answer = data.reply || "I'm listening. Tell me more."; setReply(answer); speak(answer); } catch { setReply("I'm having trouble connecting right now. Please try again."); } finally { setBusy(false); } };
    recognition.onend = () => setListening(false); recognition.start();
  }

  return <><Nav /><main style={{ minHeight:"calc(100vh - 55px)", padding:"30px 18px", fontFamily:"Arial,sans-serif" }}><div style={{ maxWidth:620, margin:"0 auto", textAlign:"center" }}>
    <Link href="/chat" style={{ display:"inline-block", color:"#d8b4fe", textDecoration:"none", marginBottom:30 }}>← Back to chat</Link>
    <div style={{ width:130,height:130,borderRadius:"50%",margin:"30px auto 20px",display:"grid",placeItems:"center",fontSize:48,background:"linear-gradient(135deg,#581c87,#db2777)",boxShadow:"0 0 55px #7c3aed88" }}>💜</div>
    <h1 style={{fontSize:40,margin:"0 0 8px"}}>Call My Gee</h1><p style={{color:"#a1a1aa",fontSize:17}}>Talk naturally. Your Gee will listen and answer.</p>
    <div style={{ margin:"35px 0", padding:22, borderRadius:22, background:"#15131a", border:"1px solid #3b3340", color:"#f5f3ff", lineHeight:1.6 }}>{busy ? "Gee is thinking… ✨" : reply}</div>
    <button onClick={startListening} disabled={listening} style={{ width:110,height:110,borderRadius:"50%",border:"1px solid #a855f7",background:listening?"#4c1d95":"linear-gradient(135deg,#7c3aed,#c026d3)",color:"white",fontSize:40,boxShadow:"0 0 35px #7c3aed66" }}>{listening?"🔴":"🎙️"}</button>
    <p style={{color:"#a1a1aa",marginTop:18}}>{listening?"Listening… speak now":"Tap to talk"}</p>
    <div style={{display:"flex",justifyContent:"center",gap:10,marginTop:24,flexWrap:"wrap"}}>{["😊 Friendly","💪 Motivating","🧠 Wise","😂 Fun"].map(x=><span key={x} style={{padding:"9px 12px",borderRadius:999,border:"1px solid #383044",background:"#121016",color:"#ddd6fe"}}>{x}</span>)}</div>
  </div></main></>;
}
