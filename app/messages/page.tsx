"use client";

import { useState } from "react";
import Nav from "../components/Nav";

const starter = [
  { name: "Sarah", preview: "Hey! How's your day going?", unread: 2 },
  { name: "Emma", preview: "That sounds amazing 💜", unread: 0 },
  { name: "David", preview: "Let's connect! 🙌", unread: 0 },
];

export default function Messages() {
  const [active, setActive] = useState(0);
  const [text, setText] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const person = starter[active];
  return <><Nav /><main style={{ minHeight: "100vh", padding: "28px 18px", fontFamily: "Arial, sans-serif" }}>
    <div style={{ maxWidth: 950, margin: "0 auto" }}>
      <div style={{ color: "#e879f9", fontWeight: 800, letterSpacing: 2 }}>MESSAGES</div><h1 style={{ fontSize: 46, margin: "12px 0 24px" }}>Stay connected.</h1>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(210px, .8fr) minmax(280px, 1.5fr)", gap: 16 }}>
        <div style={{ border: "1px solid #2c2c33", borderRadius: 20, overflow: "hidden" }}>{starter.map((p, i) => <button key={p.name} onClick={() => setActive(i)} style={{ display: "block", width: "100%", textAlign: "left", padding: 16, border: 0, borderBottom: "1px solid #25252b", background: i === active ? "#21152a" : "#111114", color: "white", cursor: "pointer" }}><b>{p.name}</b><div style={{ color: "#a1a1aa", fontSize: 13, marginTop: 5 }}>{p.preview}</div></button>)}</div>
        <div style={{ minHeight: 520, background: "#111114", border: "1px solid #2c2c33", borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: 16, borderBottom: "1px solid #2c2c33" }}><b>{person.name}</b><div style={{ color: "#22c55e", fontSize: 12, marginTop: 4 }}>● Connected</div></div>
          <div style={{ flex: 1, padding: 18 }}><div style={{ background: "#1b1b21", padding: 13, borderRadius: 16, maxWidth: "75%", color: "#ddd" }}>{person.preview}</div>{sent.map((s, i) => <div key={i} style={{ margin: "12px 0 0 auto", background: "#7c3aed", padding: 13, borderRadius: 16, maxWidth: "75%" }}>{s}</div>)}</div>
          <form onSubmit={e => { e.preventDefault(); if (!text.trim()) return; setSent([...sent, text.trim()]); setText(""); }} style={{ display: "flex", gap: 8, padding: 14, borderTop: "1px solid #2c2c33" }}><input value={text} onChange={e => setText(e.target.value)} placeholder="Write a message..." style={{ flex: 1, background: "#0b0b0e", color: "white", border: "1px solid #34343c", borderRadius: 12, padding: 13 }} /><button style={{ background: "#9333ea", color: "white", border: 0, borderRadius: 12, padding: "0 18px", fontWeight: 800 }}>Send</button></form>
        </div>
      </div>
    </div>
  </main></>;
}
