"use client";

import { useState } from "react";
import Link from "next/link";
import Nav from "../components/Nav";

type Message = { role: "user" | "assistant"; content: string };

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "Hey, I'm your Gee. 💜 What's on your mind today?" }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function sendMessage(value?: string) {
    const message = (value ?? text).trim();
    if (!message || busy) return;
    setText("");
    const updated = [...messages, { role: "user" as const, content: message }]; setMessages(updated); setBusy(true);
    try { const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: updated }) }); const data = await response.json(); setMessages([...updated, { role: "assistant", content: data.reply || "I'm here with you. Tell me what's going on." }]); }
    catch { setMessages([...updated, { role: "assistant", content: "I'm having trouble connecting right now. Please try again." }]); }
    finally { setBusy(false); }
  }
  const quick = ["☀️ How was your day?", "💪 I need motivation", "❤️ I feel lonely", "👥 I want to meet people", "🤔 Give me advice", "😴 Help me sleep"];
  return <><Nav /><main style={{ minHeight: "calc(100vh - 55px)", padding: "18px", fontFamily: "Arial, sans-serif" }}><div style={{ maxWidth: 820, margin: "0 auto", minHeight: "88vh", display: "flex", flexDirection: "column" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #27272a", paddingBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 52, height: 52, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#7c3aed,#ec4899)", fontWeight: 900, fontSize: 22 }}>G</div><div><h2 style={{ margin: 0 }}>My Gee <span style={{ color: "#22c55e", fontSize: 12 }}>● online</span></h2><span style={{ color: "#a1a1aa" }}>Your AI companion</span></div></div>
      <Link href="/voice" style={{ textDecoration: "none", background: "linear-gradient(135deg,#7c3aed,#c026d3)", color: "white", borderRadius: 14, padding: "11px 15px", fontWeight: 800 }}>📞 Call Gee</Link>
    </div>
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "16px 0 6px" }}>{["💜 My Gee", "🌙 Calm", "💪 Motivator", "😂 Fun", "🧠 Wise"].map(x=><button key={x} style={{ whiteSpace:"nowrap", border:"1px solid #3b3340", background:"#151219", color:"#f3e8ff", borderRadius:999, padding:"9px 13px" }}>{x}</button>)}</div>
    <div style={{ flex: 1, padding: "18px 0", display: "flex", flexDirection: "column", gap: 12 }}>{messages.map((m,i)=><div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "82%", padding: "14px 17px", borderRadius: 20, background: m.role === "user" ? "linear-gradient(135deg,#4f00c8,#7c3aed)" : "#18181b", border: m.role === "assistant" ? "1px solid #3a3340" : "none", lineHeight: 1.55 }}>{m.content}<div style={{ marginTop:7, opacity:.65, fontSize:12 }}>{m.role === "assistant" ? "💜" : "✓✓"}</div></div>)}{busy && <div style={{ color: "#c4b5fd" }}>Gee is thinking… ✨</div>}</div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>{quick.map(q=><button key={q} onClick={()=>sendMessage(q.replace(/^\S+\s/, ""))} style={{ border: "1px solid #3b3340", background: "#17131d", color: "#e9d5ff", borderRadius: 999, padding: "9px 12px" }}>{q}</button>)}</div>
    <div style={{ display: "flex", gap: 8, alignItems: "stretch", borderTop: "1px solid #27272a", paddingTop: 14 }}><Link href="/voice" aria-label="Voice call" style={{ display:"grid",placeItems:"center",width:50,borderRadius:14,background:"#21152b",border:"1px solid #55306d",textDecoration:"none",fontSize:22 }}>🎙️</Link><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Talk to your Gee..." onKeyDown={e=>{if(e.key === "Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} style={{ flex: 1, minHeight: 52, resize: "none", background: "#111113", color: "white", border: "1px solid #303038", borderRadius: 14, padding: 14 }} /><button onClick={()=>sendMessage()} disabled={busy} style={{ border: 0, borderRadius: 14, padding: "0 20px", background: "linear-gradient(135deg,#7c3aed,#c026d3)", color: "white", fontWeight: 800 }}>Send</button></div>
  </div></main></>;
}
