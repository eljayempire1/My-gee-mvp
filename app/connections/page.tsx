"use client";

import { useState } from "react";
import Nav from "../components/Nav";

const initial = [
  { name: "Emma", status: "Connected", note: "Music • Travel • Food" },
  { name: "Sarah", status: "Request", note: "Business • Fitness" },
  { name: "David", status: "Connected", note: "Technology • Travel" },
];

export default function Connections() {
  const [people, setPeople] = useState(initial);
  return <><Nav /><main style={{ minHeight: "100vh", padding: "32px 18px", fontFamily: "Arial, sans-serif" }}>
    <div style={{ maxWidth: 900, margin: "0 auto" }}><div style={{ color: "#e879f9", fontWeight: 800, letterSpacing: 2 }}>CONNECTIONS</div><h1 style={{ fontSize: 46, margin: "12px 0" }}>Your people.</h1><p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>Build genuine connections at your own pace. You control who can message you.</p>
      <div style={{ display: "grid", gap: 12, marginTop: 28 }}>{people.map((p, i) => <div key={p.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: 18, background: "#121216", border: "1px solid #2c2c33", borderRadius: 18 }}><div style={{ display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 52, height: 52, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#a855f7,#ec4899)", fontWeight: 900 }}>{p.name[0]}</div><div><b>{p.name}</b><div style={{ color: "#a1a1aa", fontSize: 13, marginTop: 5 }}>{p.note}</div></div></div><button onClick={() => setPeople(people.map((x, n) => n === i ? { ...x, status: x.status === "Connected" ? "Request" : "Connected" } : x))} style={{ border: "1px solid #4b3b55", background: p.status === "Connected" ? "#24152d" : "#9333ea", color: "white", borderRadius: 12, padding: "10px 14px", fontWeight: 700 }}>{p.status === "Connected" ? "Connected ✓" : "Connect"}</button></div>)}</div>
    </div></main></>;
}
