"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "../components/Nav";
import { supabase } from "../../lib/supabase";

type Person = { id: string; display_name: string; city: string; avatar_letter: string };
type Message = { id: string; connection_id: string; sender_id: string; body: string; created_at: string };
type ChatMessage = { role: "user" | "assistant"; content: string };

const people: Person[] = [
  { id: "demo-emma", display_name: "Emma", city: "London, UK", avatar_letter: "E" },
  { id: "demo-sarah", display_name: "Sarah", city: "London, UK", avatar_letter: "S" },
  { id: "demo-olivia", display_name: "Olivia", city: "London, UK", avatar_letter: "O" },
  { id: "demo-sophia", display_name: "Sophia", city: "London, UK", avatar_letter: "S" },
  { id: "demo-david", display_name: "David", city: "London, UK", avatar_letter: "D" },
  { id: "demo-james", display_name: "James", city: "London, UK", avatar_letter: "J" },
];

function loadDemoMessages(id: string): Message[] {
  try {
    const raw = localStorage.getItem(`gee-v2-messages-${id}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function Messages() {
  const [userId, setUserId] = useState("");
  const [connections, setConnections] = useState<Person[]>(people);
  const [active, setActive] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [recording, setRecording] = useState(false);
  const [replying, setReplying] = useState(false);

  const person = connections[active];
  const visible = useMemo(() => messages.filter((m) => m.connection_id === person?.id), [messages, person]);
  const filtered = useMemo(() => connections.filter((p) => p.display_name.toLowerCase().includes(search.toLowerCase())), [connections, search]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (user) setUserId(user.id);
      else setNotice("Demo mode — sign in when you want private connections.");
      const { data } = await supabase.rpc("accepted_connections");
      if (data?.length) {
        const real = (data as any[]).map((p) => ({
          id: p.id,
          display_name: p.display_name || "Friend",
          city: p.city || "London, UK",
          avatar_letter: (p.display_name || "G").slice(0, 1).toUpperCase(),
        }));
        if (mounted) setConnections(real);
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!person) return;
    if (person.id.startsWith("demo-")) {
      setMessages(loadDemoMessages(person.id));
      return;
    }
    let mounted = true;
    (async () => {
      const { data } = await supabase.from("connection_messages").select("id,connection_id,sender_id,body,created_at").eq("connection_id", person.id).order("created_at", { ascending: true });
      if (mounted) setMessages((data || []) as Message[]);
    })();
    return () => { mounted = false; };
  }, [person?.id]);

  async function getAIReply(name: string, history: Message[]) {
    const chatHistory: ChatMessage[] = history.map((m) => ({
      role: m.sender_id === userId || m.sender_id === "guest" ? "user" : "assistant",
      content: m.body,
    }));
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companionName: name, messages: chatHistory }),
    });
    if (!response.ok) throw new Error("AI request failed");
    const data = await response.json();
    if (!data?.reply) throw new Error("No AI reply");
    return data.reply as string;
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !person || replying) return;
    setText("");

    if (person.id.startsWith("demo-")) {
      const mine: Message = { id: `u-${Date.now()}`, connection_id: person.id, sender_id: userId || "guest", body, created_at: new Date().toISOString() };
      const next = [...messages, mine];
      setMessages(next);
      localStorage.setItem(`gee-v2-messages-${person.id}`, JSON.stringify(next));
      setReplying(true);
      try {
        const reply = await getAIReply(person.display_name, next);
        const bot: Message = { id: `g-${Date.now()}`, connection_id: person.id, sender_id: person.id, body: reply, created_at: new Date().toISOString() };
        setMessages((prev) => {
          const updated = [...prev, bot];
          localStorage.setItem(`gee-v2-messages-${person.id}`, JSON.stringify(updated));
          return updated;
        });
      } catch {
        setNotice(`${person.display_name} is having trouble connecting. Try again in a moment.`);
      } finally {
        setReplying(false);
      }
      return;
    }

    if (!userId) return;
    const { error } = await supabase.from("connection_messages").insert({ connection_id: person.id, sender_id: userId, body });
    if (error) setNotice("Message could not be sent.");
  }

  function pick(id: string) {
    const index = connections.findIndex((p) => p.id === id);
    if (index >= 0) setActive(index);
  }

  if (loading) return <><Nav /><main style={page}><p style={muted}>Loading GEE…</p></main></>;

  return <>
    <Nav />
    <main style={page}>
      <div style={wrap}>
        <div style={top}><div><div style={eyebrow}>MESSAGES</div><h1 style={title}>Stay connected. <span>💜</span></h1></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" style={searchBox} /></div>
        {notice && <div style={noticeStyle}>{notice}</div>}
        <div style={label}>CONNECTED FRIENDS <span>• {connections.length}</span></div>
        <div style={rail}>{filtered.map((p) => <button key={p.id} onClick={() => pick(p.id)} style={{ ...friend, borderColor: p.id === person?.id ? "#a855f7" : "#2c2732" }}><div style={avatar}>{p.avatar_letter}</div><div>{p.display_name}</div></button>)}</div>
        {person && <section style={chat}>
          <header style={header}><div style={{ display: "flex", gap: 10, alignItems: "center" }}><div style={avatar}>{person.avatar_letter}</div><div><b>{person.display_name}</b><div style={online}>● Online • {person.city}</div></div></div><div><a href={`/call?type=voice&name=${encodeURIComponent(person.display_name)}`} style={action}>📞</a><a href={`/call?type=video&name=${encodeURIComponent(person.display_name)}`} style={action}>🎥</a></div></header>
          <div style={bodyBox}>
            {!visible.length && <div style={empty}>💜<br /><b>You're connected with {person.display_name}.</b><br />Say hello and start a conversation.</div>}
            {visible.map((m) => <div key={m.id} style={{ display: "flex", justifyContent: m.sender_id === userId || m.sender_id === "guest" ? "flex-end" : "flex-start", margin: "7px 0" }}><div style={{ ...bubble, background: m.sender_id === userId || m.sender_id === "guest" ? "linear-gradient(135deg,#6d28d9,#a855f7)" : "#202026" }}>{m.body}<div style={time}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div></div></div>)}
            {replying && <div style={typing}>{person.display_name} is thinking… 💜</div>}
          </div>
          <form onSubmit={send} style={composer}><button type="button" onClick={() => setText((v) => v + " 💜")} style={icon}>😊</button><button type="button" onClick={() => { setRecording((v) => !v); setNotice(recording ? "Voice message stopped." : "🎤 Voice message mode is ready."); }} style={icon}>{recording ? "⏹️" : "🎤"}</button><input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${person.display_name}...`} style={input} /><button type="submit" disabled={!text.trim() || replying} style={{ ...sendButton, opacity: text.trim() && !replying ? 1 : .5 }}>➤</button></form>
        </section>}
      </div>
    </main>
  </>;
}

const page: React.CSSProperties = { minHeight: "calc(100vh - 55px)", padding: "18px 12px 30px", background: "linear-gradient(180deg,#07070a,#0d0812)", color: "white", fontFamily: "Arial,sans-serif" };
const wrap: React.CSSProperties = { maxWidth: 980, margin: "0 auto" };
const top: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 4px 15px" };
const eyebrow: React.CSSProperties = { color: "#e879f9", fontWeight: 900, letterSpacing: 2, fontSize: 12 };
const title: React.CSSProperties = { fontSize: "clamp(30px,7vw,48px)", margin: "7px 0" };
const searchBox: React.CSSProperties = { width: 100, background: "#121217", border: "1px solid #332b39", borderRadius: 14, padding: "10px", color: "white", outline: "none" };
const noticeStyle: React.CSSProperties = { padding: "9px 12px", marginBottom: 10, background: "#17101c", color: "#f0abfc", borderRadius: 10, fontSize: 12 };
const label: React.CSSProperties = { color: "#a1a1aa", fontSize: 13, fontWeight: 700, marginBottom: 10 };
const rail: React.CSSProperties = { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 15 };
const friend: React.CSSProperties = { minWidth: 82, padding: 8, background: "#101014", border: "1px solid #2c2732", borderRadius: 16, color: "white" };
const avatar: React.CSSProperties = { width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto", background: "linear-gradient(135deg,#7c3aed,#ec4899)", fontWeight: 900 };
const chat: React.CSSProperties = { background: "#0b0b0f", border: "1px solid #342b3b", borderRadius: 22, overflow: "hidden" };
const header: React.CSSProperties = { padding: 13, background: "#151019", borderBottom: "1px solid #302938", display: "flex", justifyContent: "space-between", alignItems: "center" };
const online: React.CSSProperties = { color: "#22c55e", fontSize: 12, marginTop: 3 };
const action: React.CSSProperties = { display: "inline-grid", placeItems: "center", width: 42, height: 42, marginLeft: 6, background: "#241a2b", border: "1px solid #554361", borderRadius: 12, color: "white", textDecoration: "none" };
const bodyBox: React.CSSProperties = { minHeight: 470, maxHeight: "58vh", overflowY: "auto", padding: 14, background: "radial-gradient(circle at top,#1a1022,#0b0b0f 48%)" };
const empty: React.CSSProperties = { textAlign: "center", margin: "60px auto", maxWidth: 300, color: "#71717a", lineHeight: 1.7 };
const bubble: React.CSSProperties = { padding: "10px 13px", borderRadius: 18, maxWidth: "78%", color: "#f4f4f5", lineHeight: 1.45 };
const typing: React.CSSProperties = { color: "#c4b5fd", fontSize: 13, padding: "8px 5px" };
const time: React.CSSProperties = { fontSize: 10, opacity: .6, textAlign: "right", marginTop: 5 };
const composer: React.CSSProperties = { display: "flex", gap: 7, alignItems: "center", padding: 10, borderTop: "1px solid #302938", background: "#111115" };
const icon: React.CSSProperties = { width: 42, height: 42, background: "#21152a", border: "1px solid #4b3b55", borderRadius: 13, color: "white", fontSize: 18 };
const input: React.CSSProperties = { flex: 1, minWidth: 0, height: 44, background: "#09090c", color: "white", border: "1px solid #3a3440", borderRadius: 22, padding: "0 15px", outline: "none" };
const sendButton: React.CSSProperties = { width: 44, height: 44, border: 0, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "white", fontSize: 20 };
const muted: React.CSSProperties = { color: "#a1a1aa" };
