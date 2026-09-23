"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Nav from "../components/Nav";

type Person = { name: string; gender: "Woman" | "Man"; status: "Connected" | "Request"; note: string };

const initial: Person[] = [
  { name: "Emma", gender: "Woman", status: "Connected", note: "Music • Travel • Food" },
  { name: "Sarah", gender: "Woman", status: "Connected", note: "Travel • Art • Business" },
  { name: "Olivia", gender: "Woman", status: "Connected", note: "Books • Coffee • Travel" },
  { name: "Sophia", gender: "Woman", status: "Request", note: "Fitness • Fashion • Food" },
  { name: "David", gender: "Man", status: "Connected", note: "Technology • Business • Fitness" },
  { name: "James", gender: "Man", status: "Connected", note: "Football • Music • Travel" },
  { name: "Elijah OBONOGWU", gender: "Man", status: "Connected", note: "Business • Music • Food" },
  { name: "Daniel", gender: "Man", status: "Request", note: "Fitness • Technology • Travel" },
];

export default function Connections() {
  const [people, setPeople] = useState(initial);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => people.filter((p) => `${p.name} ${p.note}`.toLowerCase().includes(search.toLowerCase())), [people, search]);

  return <><Nav /><main style={{ minHeight: "100vh", padding: "22px 14px 40px", fontFamily: "Arial, sans-serif", background: "linear-gradient(180deg,#07070a,#110a17)" }}>
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 14, flexWrap: "wrap" }}>
        <div><div style={{ color: "#e879f9", fontWeight: 900, letterSpacing: 2, fontSize: 12 }}>CONNECTIONS</div><h1 style={{ fontSize: "clamp(34px,7vw,52px)", margin: "8px 0" }}>Your people. 💜</h1><p style={{ color: "#a1a1aa", lineHeight: 1.5, marginTop: 0 }}>Pick a friend and start chatting, voice calling or video calling.</p></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#121217", border: "1px solid #3a3040", borderRadius: 14, padding: "9px 12px" }}><span>🔎</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search friends" style={{ width: 150, maxWidth: "45vw", background: "transparent", color: "white", border: 0, outline: 0 }} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 14, marginTop: 24 }}>
        {filtered.map((p, i) => <div key={p.name} style={{ padding: 18, background: "linear-gradient(145deg,#17101e,#101014)", border: "1px solid #332a39", borderRadius: 20, boxShadow: "0 12px 35px #0005" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ position: "relative" }}><div style={avatar}>{p.name[0]}</div><span style={onlineDot} /></div><div><b style={{ fontSize: 18 }}>{p.name}</b><div style={{ color: "#22c55e", fontSize: 12, marginTop: 4 }}>● Online • {p.gender}</div></div></div>
          <div style={{ color: "#bcb8c2", fontSize: 13, margin: "13px 0" }}>{p.note}</div>
          <div style={{ display: "flex", gap: 7 }}>
            <Link href={`/messages?name=${encodeURIComponent(p.name)}`} style={action}>💬 Chat</Link>
            <Link href={`/call?type=voice&name=${encodeURIComponent(p.name)}`} style={action}>📞</Link>
            <Link href={`/call?type=video&name=${encodeURIComponent(p.name)}`} style={action}>🎥</Link>
            <button type="button" onClick={() => setPeople(prev => prev.map((x, n) => n === i ? { ...x, status: x.status === "Connected" ? "Request" : "Connected" } : x))} style={{ ...action, cursor: "pointer", background: p.status === "Connected" ? "#24152d" : "linear-gradient(135deg,#7c3aed,#c026d3)" }}>{p.status === "Connected" ? "✓" : "💜"}</button>
          </div>
        </div>)}
      </div>
    </div>
  </main></>;
}

const avatar = { width: 52, height: 52, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#7c3aed,#ec4899)", fontWeight: 900, fontSize: 20 };
const onlineDot = { position: "absolute" as const, right: 0, bottom: 0, width: 11, height: 11, borderRadius: "50%", background: "#22c55e", border: "2px solid #111114" };
const action = { flex: 1, minWidth: 0, display: "grid", placeItems: "center", height: 42, borderRadius: 12, border: "1px solid #4b3b55", background: "#21152a", color: "white", textDecoration: "none", fontWeight: 800, fontSize: 13 };
