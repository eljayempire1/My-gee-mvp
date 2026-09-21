"use client";

import { useState } from "react";
import Nav from "../components/Nav";

type Message = { role: "user" | "assistant"; content: string };

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "Hey, I'm your Gee. 💜 What's on your mind today?" }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function sendMessage() {
    if (!text.trim() || busy) return;
    const message = text.trim(); setText("");
    const updated = [...messages, { role: "user" as const, content: message }]; setMessages(updated); setBusy(true);
    try { const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: updated }) }); const data = await response.json(); setMessages([...updated, { role: "assistant", content: data.reply || "I'm here with you. Tell me what's going on." }]); }
    catch { setMessages([...updated, { role: "assistant", content: "I'm having trouble connecting right now. Please try again." }]); }
    finally { setBusy(false); }
  }
  const quick = ["How was your day?", "I need motivation", "I want to meet people"];
  return <><Nav /><main style={{ minHeight: "calc(100vh - 55px)", padding: "25px 18px", fontFamily: "Arial, sans-serif" }}><div style={{ maxWidth: 800, margin: "0 auto", minHeight: "88vh", display: "flex", flexDirection: "column" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #27272a", paddingBottom: 16 }}><div style={{ width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#a855f7,#ec4899)", fontWeight: 900 }}>G</div><div><h2 style={{ margin: 0 }}>My Gee <span style={{ color: "#22c55e", fontSize: 12 }}>● online</span></h2><span style={{ color: "#a1a1aa" }}>Your AI companion</span></div></div>
    <div style={{ flex: 1, padding: "22px 0", display: "flex", flexDirection: "column", gap: 12 }}>{messages.map((m,i)=><div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "82%", padding: "13px 16px", borderRadius: 18, background: m.role === "user" ? "#7c3aed" : "#18181b", border: m.role === "assistant" ? "1px solid #303038" : "none", lineHeight: 1.55 }}>{m.content}</div>)}{busy && <div style={{ color: "#a1a1aa" }}>Gee is thinking…</div>}</div>
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>{quick.map(q=><button key={q} onClick={()=>{setText(q);}} style={{ border: "1px solid #3b3340", background: "#151219", color: "#e9d5ff", borderRadius: 999, padding: "8px 11px" }}>{q}</button>)}</div>
    <div style={{ display: "flex", gap: 8, borderTop: "1px solid #27272a", paddingTop: 14 }}><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Talk to your Gee..." onKeyDown={e=>{if(e.key === "Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} style={{ flex: 1, minHeight: 52, resize: "none", background: "#111113", color: "white", border: "1px solid #303038", borderRadius: 12, padding: 14 }} /><button onClick={sendMessage} disabled={busy} style={{ border: 0, borderRadius: 12, padding: "0 20px", background: "#9333ea", color: "white", fontWeight: 700 }}>Send</button></div>
  </div></main></>;
}
