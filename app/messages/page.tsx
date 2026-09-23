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

function loadDemoMessages(id: string): Message[] { try { const raw = localStorage.getItem(`gee-v2-messages-${id}`); return raw ? JSON.parse(raw) : []; } catch { return []; } }

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
  const [isMobile, setIsMobile] = useState(false);

  const person = connections[active];
  const visible = useMemo(() => messages.filter((m) => m.connection_id === person?.id), [messages, person]);
  const filtered = useMemo(() => connections.filter((p) => p.display_name.toLowerCase().includes(search.toLowerCase())), [connections, search]);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 720);
    update(); window.addEventListener("resize", update); return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (user) setUserId(user.id); else setNotice("Demo mode — sign in when you want private connections.");
      const { data } = await supabase.rpc("accepted_connections");
      if (data?.length) setConnections((data as any[]).map((p) => ({ id: p.id, display_name: p.display_name || "Friend", city: p.city || "London, UK", avatar_letter: (p.display_name || "G").slice(0, 1).toUpperCase() })));
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!person) return;
    if (person.id.startsWith("demo-")) { setMessages(loadDemoMessages(person.id)); return; }
    let mounted = true;
    (async () => { const { data } = await supabase.from("connection_messages").select("id,connection_id,sender_id,body,created_at").eq("connection_id", person.id).order("created_at", { ascending: true }); if (mounted) setMessages((data || []) as Message[]); })();
    return () => { mounted = false; };
  }, [person?.id]);

  async function getAIReply(name: string, history: Message[]) {
    const chatHistory: ChatMessage[] = history.map((m) => ({ role: m.sender_id === userId || m.sender_id === "guest" ? "user" : "assistant", content: m.body }));
    const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companionName: name, messages: chatHistory }) });
    if (!response.ok) throw new Error("AI request failed");
    const data = await response.json(); if (!data?.reply) throw new Error("No AI reply"); return data.reply as string;
  }

  async function send(e: React.FormEvent) {
    e.preventDefault(); const body = text.trim(); if (!body || !person || replying) return; setText("");
    if (person.id.startsWith("demo-")) {
      const mine: Message = { id: `u-${Date.now()}`, connection_id: person.id, sender_id: userId || "guest", body, created_at: new Date().toISOString() };
      const next = [...messages, mine]; setMessages(next); localStorage.setItem(`gee-v2-messages-${person.id}`, JSON.stringify(next)); setReplying(true);
      try {
        const reply = await getAIReply(person.display_name, next);
        setMessages((prev) => { const updated = [...prev, { id: `g-${Date.now()}`, connection_id: person.id, sender_id: person.id, body: reply, created_at: new Date().toISOString() }]; localStorage.setItem(`gee-v2-messages-${person.id}`, JSON.stringify(updated)); return updated; });
      } catch { setNotice(`${person.display_name} is having trouble connecting. Try again in a moment.`); } finally { setReplying(false); }
      return;
    }
    if (!userId) return; const { error } = await supabase.from("connection_messages").insert({ connection_id: person.id, sender_id: userId, body }); if (error) setNotice("Message could not be sent.");
  }

  function pick(id: string) { const index = connections.findIndex((p) => p.id === id); if (index >= 0) { setActive(index); setMobileFriends(false); } }

  if (loading) return <><Nav /><main className="gee-page"><p className="muted">Loading GEE…</p></main></>;

  return <><Nav /><main className="gee-page"><div className="gee-wrap">
    <div className="gee-top"><div><div className="eyebrow">MESSAGES</div><h1>Stay connected. <span>💜</span></h1></div><div className="top-actions"><button className="friends-toggle" onClick={() => setMobileFriends(true)}>☰ Friends</button><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" /></div></div>
    {notice && <div className="notice">{notice}</div>}
    <div className="gee-layout">
      {!isMobile && <aside className="friends-panel"><div className="side-title">CONNECTED <span>• {connections.length}</span></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search friends" />{filtered.map((p) => <button key={p.id} onClick={() => pick(p.id)} className={`friend ${p.id === person?.id ? "selected" : ""}`}><div className="avatar">{p.avatar_letter}</div><div><b>{p.display_name}</b><small>● Online</small></div></button>)}</aside>}

      {isMobile && mobileFriends && <div className="mobile-overlay" onClick={() => setMobileFriends(false)}><div className="mobile-drawer" onClick={(e) => e.stopPropagation()}><div className="drawer-head"><b>Friends</b><button onClick={() => setMobileFriends(false)}>✕</button></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search friends" />{filtered.map((p) => <button key={p.id} onClick={() => pick(p.id)} className={`friend ${p.id === person?.id ? "selected" : ""}`}><div className="avatar">{p.avatar_letter}</div><div><b>{p.display_name}</b><small>● Online</small></div></button>)}</div></div>}

      {person && <section className="gee-chat">
        <header className="chat-head"><button className="mobile-menu" onClick={() => setMobileFriends(true)}>☰</button><div className="person"><div className="avatar">{person.avatar_letter}</div><div><b>{person.display_name}</b><small className="online">● Online • {person.city}</small></div></div><div className="chat-actions"><a href={`/call?type=voice&name=${encodeURIComponent(person.display_name)}`}>📞</a><a href={`/call?type=video&name=${encodeURIComponent(person.display_name)}`}>🎥</a></div></header>
        <div className="chat-body">
          {!visible.length && <div className="empty">💜<br /><b>You're connected with {person.display_name}.</b><br />Say hello and start a conversation.</div>}
          {visible.map((m) => <div key={m.id} className={`row ${m.sender_id === userId || m.sender_id === "guest" ? "mine" : "theirs"}`}><div className="bubble">{m.body}<div className="time">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div></div></div>)}
          {replying && <div className="typing">{person.display_name} is thinking… 💜</div>}
        </div>
        <form onSubmit={send} className="composer"><button type="button" onClick={() => setText((v) => v + " 💜")}>😊</button><button type="button" onClick={() => { setRecording((v) => !v); setNotice(recording ? "Voice message stopped." : "🎤 Voice message mode is ready."); }}>{recording ? "⏹️" : "🎤"}</button><input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${person.display_name}...`} /><button className="send" type="submit" disabled={!text.trim() || replying}>➤</button></form>
      </section>}
    </div>
  </div></main>
  <style jsx global>{`*{box-sizing:border-box}.gee-page{min-height:calc(100vh - 55px);padding:16px 12px 28px;background:linear-gradient(180deg,#07070a,#0d0812);color:#fff;font-family:Arial,sans-serif}.gee-wrap{max-width:1120px;margin:auto}.gee-top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:6px 2px 14px}.gee-top h1{font-size:clamp(27px,6vw,42px);margin:5px 0}.eyebrow{color:#e879f9;font-weight:900;letter-spacing:2px;font-size:11px}.top-actions{display:flex;gap:8px}.top-actions input,.friends-panel>input,.mobile-drawer>input{background:#121217;border:1px solid #332b39;border-radius:12px;padding:10px;color:#fff;outline:none}.top-actions input{width:130px}.friends-toggle{display:none;background:#21152a;border:1px solid #554361;color:#fff;border-radius:12px;padding:9px 12px}.notice{padding:9px 12px;margin-bottom:10px;background:#17101c;color:#f0abfc;border-radius:10px;font-size:12px}.gee-layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:14px}.friends-panel{background:#101014;border:1px solid #302938;border-radius:20px;padding:12px;min-width:0}.side-title{color:#a1a1aa;font-size:12px;font-weight:800;letter-spacing:1px;margin:2px 2px 10px}.side-title span{font-weight:500}.friends-panel>input{width:100%;margin-bottom:8px}.friend{width:100%;display:flex;align-items:center;gap:10px;padding:9px 8px;border:1px solid transparent;border-radius:14px;color:#fff;text-align:left;background:#111115;margin:2px 0}.friend.selected{background:#21142d;border-color:#6d3b86}.friend small{display:block;color:#22c55e;font-size:11px;margin-top:3px}.avatar{width:42px;height:42px;flex:0 0 42px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#7c3aed,#ec4899);font-weight:900}.gee-chat{background:#0b0b0f;border:1px solid #342b3b;border-radius:20px;overflow:hidden;min-width:0;box-shadow:0 18px 50px rgba(0,0,0,.25)}.chat-head{min-height:68px;padding:10px 13px;background:#151019;border-bottom:1px solid #302938;display:flex;justify-content:space-between;align-items:center;gap:10px}.person{display:flex;align-items:center;gap:10px;min-width:0}.person>div:last-child{min-width:0}.online{display:block;color:#22c55e;font-size:11px;margin-top:3px}.chat-actions{display:flex;flex-shrink:0}.chat-actions a{display:grid;place-items:center;width:40px;height:40px;margin-left:5px;background:#241a2b;border:1px solid #554361;border-radius:11px;color:#fff;text-decoration:none}.mobile-menu{display:none;background:none;border:0;color:#ddd;font-size:20px}.chat-body{min-height:52vh;max-height:62vh;overflow-y:auto;padding:18px clamp(12px,3vw,28px);background:radial-gradient(circle at top,#1a1022,#0b0b0f 48%)}.row{display:flex;margin:8px 0}.row.mine{justify-content:flex-end}.row.theirs{justify-content:flex-start}.bubble{padding:11px 14px;border-radius:18px;max-width:min(72%,620px);color:#f4f4f5;line-height:1.5;overflow-wrap:anywhere;box-shadow:0 5px 18px rgba(0,0,0,.16);background:#202026}.mine .bubble{background:linear-gradient(135deg,#6d28d9,#a855f7)}.time{font-size:10px;opacity:.6;text-align:right;margin-top:5px}.typing{color:#c4b5fd;font-size:13px;padding:8px 5px}.empty{text-align:center;margin:70px auto;max-width:300px;color:#71717a;line-height:1.7}.composer{display:flex;gap:7px;align-items:center;padding:10px;border-top:1px solid #302938;background:#111115}.composer button{width:42px;height:42px;flex:0 0 42px;background:#21152a;border:1px solid #4b3b55;border-radius:13px;color:#fff;font-size:18px}.composer input{flex:1;min-width:0;height:44px;background:#09090c;color:#fff;border:1px solid #3a3440;border-radius:22px;padding:0 15px;outline:none}.composer .send{border:0;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899)}.composer .send:disabled{opacity:.45}.mobile-overlay{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.65);display:flex}.mobile-drawer{width:min(84vw,340px);height:100%;background:#101014;border-right:1px solid #3b3042;padding:14px;overflow-y:auto}.drawer-head{display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;margin-bottom:10px;border-bottom:1px solid #302938}.drawer-head button{background:none;border:0;color:#ddd;font-size:20px}.mobile-drawer>input{width:100%;margin-bottom:8px}
@media(max-width:720px){.gee-page{padding:8px 7px 20px}.gee-top{padding:4px 3px 10px}.gee-top h1{font-size:25px}.top-actions input{display:none}.friends-toggle{display:block}.gee-layout{display:block}.friends-panel{display:none}.mobile-menu{display:block}.chat-head{padding:8px 9px}.chat-actions a{width:36px;height:36px}.chat-body{min-height:58vh;max-height:65vh;padding:14px 10px}.bubble{max-width:84%;padding:10px 12px}.composer{padding:8px;gap:5px}.composer button{width:39px;height:39px;flex-basis:39px}.composer input{height:42px}.avatar{width:38px;height:38px;flex-basis:38px}.person b{font-size:14px}.online{font-size:10px}}
`}</style></>;
}
