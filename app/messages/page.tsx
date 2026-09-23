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
  try { const raw = localStorage.getItem(`gee-v2-messages-${id}`); return raw ? JSON.parse(raw) : []; } catch { return []; }
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
  const [mobileFriends, setMobileFriends] = useState(false);

  const person = connections[active];
  const visible = useMemo(() => messages.filter((m) => m.connection_id === person?.id), [messages, person]);
  const filtered = useMemo(() => connections.filter((p) => p.display_name.toLowerCase().includes(search.toLowerCase())), [connections, search]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (user) setUserId(user.id); else setNotice("Demo mode — sign in when you want private connections.");
      const { data } = await supabase.rpc("accepted_connections");
      if (data?.length) {
        const real = (data as any[]).map((p) => ({ id: p.id, display_name: p.display_name || "Friend", city: p.city || "London, UK", avatar_letter: (p.display_name || "G").slice(0, 1).toUpperCase() }));
        if (mounted) setConnections(real);
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!person) return;
    if (person.id.startsWith("demo-")) { setMessages(loadDemoMessages(person.id)); return; }
    let mounted = true;
    (async () => {
      const { data } = await supabase.from("connection_messages").select("id,connection_id,sender_id,body,created_at").eq("connection_id", person.id).order("created_at", { ascending: true });
      if (mounted) setMessages((data || []) as Message[]);
    })();
    return () => { mounted = false; };
  }, [person?.id]);

  async function getAIReply(name: string, history: Message[]) {
    const chatHistory: ChatMessage[] = history.map((m) => ({ role: m.sender_id === userId || m.sender_id === "guest" ? "user" : "assistant", content: m.body }));
    const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companionName: name, messages: chatHistory }) });
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
      const next = [...messages, mine]; setMessages(next); localStorage.setItem(`gee-v2-messages-${person.id}`, JSON.stringify(next)); setReplying(true);
      try {
        const reply = await getAIReply(person.display_name, next);
        setMessages((prev) => { const updated = [...prev, { id: `g-${Date.now()}`, connection_id: person.id, sender_id: person.id, body: reply, created_at: new Date().toISOString() }]; localStorage.setItem(`gee-v2-messages-${person.id}`, JSON.stringify(updated)); return updated; });
      } catch { setNotice(`${person.display_name} is having trouble connecting. Try again in a moment.`); } finally { setReplying(false); }
      return;
    }
    if (!userId) return;
    const { error } = await supabase.from("connection_messages").insert({ connection_id: person.id, sender_id: userId, body });
    if (error) setNotice("Message could not be sent.");
  }

  function pick(id: string) {
    const index = connections.findIndex((p) => p.id === id);
    if (index >= 0) { setActive(index); setMobileFriends(false); }
  }

  if (loading) return <><Nav /><main style={page}><p style={muted}>Loading GEE…</p></main></>;

  return <>
    <Nav />
    <main style={page}>
      <div style={wrap}>
        <div style={top}><div><div style={eyebrow}>MESSAGES</div><h1 style={title}>Stay connected. <span>💜</span></h1></div><button style={friendsToggle} onClick={() => setMobileFriends(true)}>☰ Friends</button><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" style={searchBox} /></div>
        {notice && <div style={noticeStyle}>{notice}</div>}

        <div style={layout}>
          <aside style={sidebar}>
            <div style={sideTitle}>CONNECTED <span>• {connections.length}</span></div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search friends" style={sideSearch} />
            <div style={friendList}>{filtered.map((p) => <button key={p.id} onClick={() => pick(p.id)} style={{ ...friend, background: p.id === person?.id ? "#21142d" : "#111115" }}><div style={avatar}>{p.avatar_letter}</div><div style={friendText}><b>{p.display_name}</b><small>● Online</small></div></button>)}</div>
          </aside>

          {mobileFriends && <div style={mobileOverlay} onClick={() => setMobileFriends(false)}><div style={mobileDrawer} onClick={(e) => e.stopPropagation()}><div style={drawerHeader}><b>Friends</b><button style={close} onClick={() => setMobileFriends(false)}>✕</button></div>{filtered.map((p) => <button key={p.id} onClick={() => pick(p.id)} style={{ ...mobileFriend, background: p.id === person?.id ? "#21142d" : "#111115" }}><div style={avatar}>{p.avatar_letter}</div><div style={friendText}><b>{p.display_name}</b><small>● Online</small></div></button>)}</div></div>}

          {person && <section style={chat}>
            <header style={header}><button style={mobileMenu} onClick={() => setMobileFriends(true)}>☰</button><div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}><div style={avatar}>{person.avatar_letter}</div><div style={personInfo}><b>{person.display_name}</b><div style={online}>● Online • {person.city}</div></div></div><div style={actions}><a href={`/call?type=voice&name=${encodeURIComponent(person.display_name)}`} style={action}>📞</a><a href={`/call?type=video&name=${encodeURIComponent(person.display_name)}`} style={action}>🎥</a></div></header>
            <div style={bodyBox}>
              {!visible.length && <div style={empty}>💜<br /><b>You're connected with {person.display_name}.</b><br />Say hello and start a conversation.</div>}
              {visible.map((m) => <div key={m.id} style={{ display: "flex", justifyContent: m.sender_id === userId || m.sender_id === "guest" ? "flex-end" : "flex-start", margin: "8px 0" }}><div style={{ ...bubble, background: m.sender_id === userId || m.sender_id === "guest" ? "linear-gradient(135deg,#6d28d9,#a855f7)" : "#202026" }}>{m.body}<div style={time}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div></div></div>)}
              {replying && <div style={typing}>{person.display_name} is thinking… 💜</div>}
            </div>
            <form onSubmit={send} style={composer}><button type="button" onClick={() => setText((v) => v + " 💜")} style={icon}>😊</button><button type="button" onClick={() => { setRecording((v) => !v); setNotice(recording ? "Voice message stopped." : "🎤 Voice message mode is ready."); }} style={icon}>{recording ? "⏹️" : "🎤"}</button><input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${person.display_name}...`} style={input} /><button type="submit" disabled={!text.trim() || replying} style={{ ...sendButton, opacity: text.trim() && !replying ? 1 : .5 }}>➤</button></form>
          </section>}
        </div>
      </div>
    </main>
  </>;
}

const page: React.CSSProperties = { minHeight: "calc(100vh - 55px)", padding: "16px 12px 28px", background: "linear-gradient(180deg,#07070a,#0d0812)", color: "white", fontFamily: "Arial,sans-serif" };
const wrap: React.CSSProperties = { maxWidth: 1120, margin: "0 auto" };
const top: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "6px 2px 14px" };
const eyebrow: React.CSSProperties = { color: "#e879f9", fontWeight: 900, letterSpacing: 2, fontSize: 11 };
const title: React.CSSProperties = { fontSize: "clamp(27px,6vw,42px)", margin: "5px 0" };
const searchBox: React.CSSProperties = { display: "none", width: 110, background: "#121217", border: "1px solid #332b39", borderRadius: 12, padding: "9px", color: "white", outline: "none" };
const friendsToggle: React.CSSProperties = { display: "none", marginLeft: "auto", background: "#21152a", border: "1px solid #554361", color: "white", borderRadius: 12, padding: "9px 12px" };
const noticeStyle: React.CSSProperties = { padding: "9px 12px", marginBottom: 10, background: "#17101c", color: "#f0abfc", borderRadius: 10, fontSize: 12 };
const layout: React.CSSProperties = { display: "grid", gridTemplateColumns: "280px minmax(0,1fr)", gap: 14, alignItems: "stretch" };
const sidebar: React.CSSProperties = { background: "#101014", border: "1px solid #302938", borderRadius: 20, padding: 12, minWidth: 0 };
const sideTitle: React.CSSProperties = { color: "#a1a1aa", fontSize: 12, fontWeight: 800, letterSpacing: 1, margin: "2px 2px 10px" };
const sideSearch: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "#09090c", border: "1px solid #342d3a", borderRadius: 12, padding: "10px", color: "white", outline: "none", marginBottom: 9 };
const friendList: React.CSSProperties = { display: "grid", gap: 5 };
const friend: React.CSSProperties = { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", border: "1px solid transparent", borderRadius: 14, color: "white", textAlign: "left" };
const mobileFriend: React.CSSProperties = { width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px", border: "1px solid #2c2732", borderRadius: 14, color: "white", textAlign: "left", marginBottom: 6 };
const friendText: React.CSSProperties = { display: "grid", gap: 4, minWidth: 0 };
const avatar: React.CSSProperties = { width: 42, height: 42, flex: "0 0 42px", borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#7c3aed,#ec4899)", fontWeight: 900 };
const chat: React.CSSProperties = { background: "#0b0b0f", border: "1px solid #342b3b", borderRadius: 20, overflow: "hidden", minWidth: 0, boxShadow: "0 18px 50px rgba(0,0,0,.25)" };
const header: React.CSSProperties = { minHeight: 68, padding: "10px 13px", background: "#151019", borderBottom: "1px solid #302938", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 };
const personInfo: React.CSSProperties = { minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" };
const online: React.CSSProperties = { color: "#22c55e", fontSize: 11, marginTop: 3 };
const actions: React.CSSProperties = { display: "flex", flexShrink: 0 };
const action: React.CSSProperties = { display: "inline-grid", placeItems: "center", width: 40, height: 40, marginLeft: 5, background: "#241a2b", border: "1px solid #554361", borderRadius: 11, color: "white", textDecoration: "none" };
const mobileMenu: React.CSSProperties = { display: "none", background: "transparent", border: 0, color: "#ddd", fontSize: 20 };
const bodyBox: React.CSSProperties = { minHeight: "52vh", maxHeight: "62vh", overflowY: "auto", padding: "18px clamp(12px,3vw,28px)", background: "radial-gradient(circle at top,#1a1022,#0b0b0f 48%)" };
const empty: React.CSSProperties = { textAlign: "center", margin: "70px auto", maxWidth: 300, color: "#71717a", lineHeight: 1.7 };
const bubble: React.CSSProperties = { padding: "11px 14px", borderRadius: 18, maxWidth: "min(72%,620px)", color: "#f4f4f5", lineHeight: 1.5, overflowWrap: "anywhere", boxShadow: "0 5px 18px rgba(0,0,0,.16)" };
const typing: React.CSSProperties = { color: "#c4b5fd", fontSize: 13, padding: "8px 5px" };
const time: React.CSSProperties = { fontSize: 10, opacity: .6, textAlign: "right", marginTop: 5 };
const composer: React.CSSProperties = { display: "flex", gap: 7, alignItems: "center", padding: 10, borderTop: "1px solid #302938", background: "#111115" };
const icon: React.CSSProperties = { width: 42, height: 42, flex: "0 0 42px", background: "#21152a", border: "1px solid #4b3b55", borderRadius: 13, color: "white", fontSize: 18 };
const input: React.CSSProperties = { flex: 1, minWidth: 0, height: 44, background: "#09090c", color: "white", border: "1px solid #3a3440", borderRadius: 22, padding: "0 15px", outline: "none" };
const sendButton: React.CSSProperties = { width: 44, height: 44, flex: "0 0 44px", border: 0, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#ec4899)", color: "white", fontSize: 20 };
const mobileOverlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,.62)", display: "none" };
const mobileDrawer: React.CSSProperties = { width: "min(84vw,340px)", height: "100%", background: "#101014", borderRight: "1px solid #3b3042", padding: 14, overflowY: "auto" };
const drawerHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, marginBottom: 8, borderBottom: "1px solid #302938" };
const close: React.CSSProperties = { background: "transparent", border: 0, color: "#ddd", fontSize: 20 };
const muted: React.CSSProperties = { color: "#a1a1aa" };

if (typeof document !== "undefined") {
  const id = "gee-message-responsive-style";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @media (max-width: 720px) {
        .gee-noop{}
      }
    `;
    document.head.appendChild(style);
  }
}
