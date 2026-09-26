"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Nav from "../components/Nav";
import { supabase } from "../../lib/supabase";

type Person = { id: string; display_name: string; city: string; avatar_letter: string; avatar_url?: string | null };
type Message = { id: string; connection_id: string; sender_id: string; body: string; created_at: string };

// Same stable Elijah portrait used on Discover.
const avatarMap: Record<string, string> = {
  Emma: "https://randomuser.me/api/portraits/women/47.jpg",
  Sarah: "https://randomuser.me/api/portraits/women/32.jpg",
  Olivia: "https://randomuser.me/api/portraits/women/44.jpg",
  Sophia: "https://randomuser.me/api/portraits/women/49.jpg",
  David: "https://randomuser.me/api/portraits/men/12.jpg",
  James: "https://randomuser.me/api/portraits/men/11.jpg",
  Elijah: "https://randomuser.me/api/portraits/men/13.jpg",
  Daniel: "https://randomuser.me/api/portraits/men/15.jpg",
  Mia: "https://randomuser.me/api/portraits/women/45.jpg",
  Chris: "https://randomuser.me/api/portraits/men/14.jpg",
  Grace: "https://randomuser.me/api/portraits/women/48.jpg",
};

function avatarFor(p?: Person) {
  if (!p) return avatarMap.Elijah;
  const first = (p.display_name || "Gee").split(" ")[0];
  if (first.toLowerCase() === "elijah") return avatarMap.Elijah;
  if (p.avatar_url) return p.avatar_url;
  return avatarMap[first] || "https://randomuser.me/api/portraits/lego/1.jpg";
}

const people: Person[] = [
  { id: "demo-emma", display_name: "Emma", city: "London, UK", avatar_letter: "E" },
  { id: "demo-sarah", display_name: "Sarah", city: "London, UK", avatar_letter: "S" },
  { id: "demo-olivia", display_name: "Olivia", city: "London, UK", avatar_letter: "O" },
  { id: "demo-sophia", display_name: "Sophia", city: "London, UK", avatar_letter: "S" },
  { id: "demo-david", display_name: "David", city: "London, UK", avatar_letter: "D" },
  { id: "demo-james", display_name: "James", city: "London, UK", avatar_letter: "J" },
  { id: "demo-elijah", display_name: "Elijah OBONOGWU", city: "London, UK", avatar_letter: "E" },
  { id: "demo-daniel", display_name: "Daniel", city: "London, UK", avatar_letter: "D" },
  { id: "demo-mia", display_name: "Mia", city: "London, UK", avatar_letter: "M" },
  { id: "demo-chris", display_name: "Chris", city: "London, UK", avatar_letter: "C" },
  { id: "demo-grace", display_name: "Grace", city: "London, UK", avatar_letter: "G" },
];

function isElijah(p?: Person) { return !!p?.display_name?.toLowerCase().startsWith("elijah"); }

// Elijah gets a fresh v3 conversation so old generic replies saved on the phone cannot reappear.
function messageKey(id: string) { return id === "demo-elijah" ? `gee-v3-messages-${id}` : `gee-v2-messages-${id}`; }

function getSavedMessages(id: string): Message[] {
  try {
    if (id === "demo-elijah") localStorage.removeItem(`gee-v2-messages-${id}`);
    const value = JSON.parse(localStorage.getItem(messageKey(id)) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function saveMessages(id: string, messages: Message[]) { try { localStorage.setItem(messageKey(id), JSON.stringify(messages)); } catch {} }
function getDemoConnections(): string[] { try { const value = JSON.parse(localStorage.getItem("gee-demo-connections") || "[]"); return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : []; } catch { return []; } }

function fallbackReply(name: string, text: string) {
  const lower = text.toLowerCase();
  const elijah = name.toLowerCase().startsWith("elijah");
  if (elijah) {
    if (/lonely|alone|nobody|no one|isolated/.test(lower)) return "Ahh, I hear you 💜. That lonely feeling no easy. Come, gist me small — wetin dey really worry you?";
    if (/sad|upset|hurt|cry|bad day|not okay|stressed|overwhelmed|down/.test(lower)) return "Chai… I'm sorry say you dey go through this 💜. No need to pretend say everything dey fine with me. Talk to me.";
    if (/happy|excited|great|amazing|good news|good day/.test(lower)) return "Ayy! 😄💜 I like this kind energy. Abeg gist me, wetin happen?";
    if (/how are you|how are u/.test(lower)) return "I dey good 😄💜 Just dey here with you. And you no need give me that ‘I'm fine’ answer if you no really dey fine.";
    if (/thank|thanks/.test(lower)) return "Anytime, my guy 💜. I dey here.";
    if (/^(hi|hey|hello|yo|heyy)\b/.test(lower)) return "My guy! 😄💜 How far? Wetin dey happen?";
    if (/what do you think|what's your view|your opinion/.test(lower)) return "Hmm, make I tell you honestly — from wetin you don tell me, I see am like this…";
    if (/contribution|what can you do|what do you bring/.test(lower)) return "I fit listen, reason things with you, give you my honest take and still catch cruise when the moment right 😄💜.";
    if (lower.endsWith("?")) return "Hmm, good question. Make we reason am well — I no wan just guess.";
    const pool = [
      "Yeah, I hear you 💜. There's plenty inside wetin you just talk, and I'm following.",
      "Hmm… I get you. That one actually make sense. Make we take am one step at a time.",
      "Ahh, now I dey see the picture better. I'm with you, no rush.",
      "Omo, I hear you. Keep talking — I dey follow the gist.",
      "I get you, my guy 💜. That part no be something we should just brush aside.",
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (/lonely|alone|nobody|no one|isolated/.test(lower)) return `Ahh ${name} ❤️ I'm sorry you're feeling lonely. Come, talk to me for a bit — what's been making you feel this way? 🫂`;
  if (/sad|upset|hurt|cry|bad day|not okay|stressed|overwhelmed/.test(lower)) return `Aww ❤️ I'm sorry you're having a rough time. You don't have to brush it off with me — what happened? 🫂`;
  if (/happy|excited|great|amazing|good news|good day/.test(lower)) return `Yesss 😄❤️ I love hearing that energy from you. Tell me what happened!`;
  if (/how are you|how are u/.test(lower)) return `I'm good 😄💜 Just here with you. And you don't have to give me the “I'm fine” version if that's not how you're feeling.`;
  return `I'm listening, and I want to understand you properly. ❤️ What's on your mind?`;
}

function MessagesContent() {
  const params = useSearchParams();
  const [userId, setUserId] = useState("");
  const [connections, setConnections] = useState<Person[]>(people);
  const [activeId, setActiveId] = useState(people[0].id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState(false);
  const [notice, setNotice] = useState("");
  const [drawer, setDrawer] = useState(false);
  const person = connections.find((p) => p.id === activeId) || connections[0];
  const visible = useMemo(() => messages.filter((m) => m.connection_id === person?.id), [messages, person?.id]);
  const filtered = useMemo(() => connections.filter((p) => p.display_name.toLowerCase().includes(search.toLowerCase())), [connections, search]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (data.user) setUserId(data.user.id); else if (localStorage.getItem("gee-demo-session")) setUserId("demo-user");
      const map = new Map<string, Person>(); people.forEach((p) => map.set(p.id, p));
      getDemoConnections().forEach((id) => { const p = people.find((item) => item.id === id); if (p) map.set(p.id, p); });
      try {
        const { data: accepted } = await supabase.rpc("accepted_connections");
        if (Array.isArray(accepted)) accepted.forEach((p: any) => { if (p?.id) { const name = p.display_name || "Friend"; map.set(p.id, { id: p.id, display_name: name, city: p.city || "London, UK", avatar_letter: name.slice(0, 1).toUpperCase(), avatar_url: p.avatar_url || null }); } });
      } catch {}
      if (mounted) { const list = [...map.values()]; setConnections(list); setActiveId((current) => list.some((p) => p.id === current) ? current : list[0]?.id || ""); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => { const requested = params.get("name"); if (!requested) return; const match = connections.find((p) => p.display_name.toLowerCase() === requested.toLowerCase()); if (match) setActiveId(match.id); }, [params, connections]);

  useEffect(() => {
    if (!person) return;
    if (person.id.startsWith("demo-")) { setMessages(getSavedMessages(person.id)); return; }
    let mounted = true;
    (async () => { const { data } = await supabase.from("connection_messages").select("id,connection_id,sender_id,body,created_at").eq("connection_id", person.id).order("created_at", { ascending: true }); if (mounted) setMessages((data || []) as Message[]); })();
    return () => { mounted = false; };
  }, [person?.id]);

  async function send(event: FormEvent) {
    event.preventDefault(); const body = text.trim(); if (!body || !person || replying) return;
    setText(""); setNotice(""); const mine: Message = { id: `u-${Date.now()}`, connection_id: person.id, sender_id: userId || "guest", body, created_at: new Date().toISOString() }; const next = [...messages, mine]; setMessages(next);
    if (person.id.startsWith("demo-")) {
      saveMessages(person.id, next); setReplying(true);
      try {
        const companionName = isElijah(person) ? "Elijah" : person.display_name;
        const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companionName, languageStyle: isElijah(person) ? "pidgin" : "english", messages: next.slice(-12).map((m) => ({ role: m.sender_id === person.id ? "assistant" : "user", content: m.body })) }) });
        let reply = fallbackReply(person.display_name, body);
        if (response.ok) { const json = await response.json(); if (json?.reply) reply = String(json.reply).trim(); }
        const updated = [...next, { id: `g-${Date.now()}`, connection_id: person.id, sender_id: person.id, body: reply, created_at: new Date().toISOString() }]; setMessages(updated); saveMessages(person.id, updated);
      } catch { setNotice(`${person.display_name} is having trouble connecting. Try again in a moment.`); } finally { setReplying(false); }
      return;
    }
    if (!userId) { setNotice("Please sign in to send private messages."); return; }
    const { error } = await supabase.from("connection_messages").insert({ connection_id: person.id, sender_id: userId, body }); if (error) setNotice("Message could not be sent.");
  }

  if (loading) return <><Nav /><main className="page"><p>Loading your connections…</p></main></>;
  return <><Nav /><main className="page"><div className="wrap"><header className="top"><div><div className="eyebrow">MESSAGES</div><h1>Stay connected. 💜</h1><p>Your connections are here — choose someone to chat or call.</p></div><button className="friendsToggle" onClick={() => setDrawer(true)}>☰ Friends</button><input className="searchTop" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" /></header>{notice && <div className="notice">{notice}</div>}<div className="layout"><aside className="friends"><b>CONNECTIONS • {filtered.length}</b><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search friends" />{filtered.map((p) => <button key={p.id} onClick={() => setActiveId(p.id)} className={p.id === person?.id ? "friend selected" : "friend"}><img className="avatar" src={avatarFor(p)} alt="" /><span><strong>{p.display_name}</strong><small>● Online</small></span></button>)}</aside>{drawer && <div className="overlay" onClick={() => setDrawer(false)}><div className="drawer" onClick={(e) => e.stopPropagation()}><div className="drawerHead"><b>Connections</b><button onClick={() => setDrawer(false)}>✕</button></div>{filtered.map((p) => <button key={p.id} onClick={() => { setActiveId(p.id); setDrawer(false); }} className="friend"><img className="avatar" src={avatarFor(p)} alt="" /><span><strong>{p.display_name}</strong><small>● Online</small></span></button>)}</div></div>}<section className="chat"><header className="chatHead"><button className="mobileMenu" onClick={() => setDrawer(true)}>☰</button><img className="avatar large" src={avatarFor(person)} alt={`${person?.display_name || "Friend"} profile`} /><div className="person"><strong>{person?.display_name || "Friend"}</strong><small>● Online • {person?.city || "UK"}</small></div><div className="actions"><a href={`/call?type=voice&name=${encodeURIComponent(person?.display_name || "")}`}>📞</a><a href={`/call?type=video&name=${encodeURIComponent(person?.display_name || "")}`}>🎥</a></div></header><div className="body">{!visible.length && <div className="empty"><img src={avatarFor(person)} alt="" /><br /><b>You’re connected with {person?.display_name}.</b><br />Say hello and start a conversation.</div>}{visible.map((m) => { const mine = m.sender_id === userId || m.sender_id === "guest" || m.sender_id === "demo-user"; return <div key={m.id} className={mine ? "row mine" : "row"}>{!mine && <img className="messageAvatar" src={avatarFor(person)} alt="" />}<div className="bubble">{m.body}<small>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div></div>; })}{replying && <div className="typing"><img src={avatarFor(person)} alt="" /> {person?.display_name} is thinking… 💜</div>}</div><form className="composer" onSubmit={send}><button type="button" onClick={() => setText((v) => `${v} 💜`)}>😊</button><input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${person?.display_name || "friend"}...`} /><button className="send" disabled={!text.trim() || replying}>➤</button></form></section></div></div></main><style jsx global>{`*{box-sizing:border-box}.page{min-height:calc(100vh - 55px);padding:18px 10px 30px;background:linear-gradient(180deg,#07070a,#100914);color:#fff;font-family:Arial,sans-serif}.wrap{max-width:1120px;margin:auto}.top{display:flex;align-items:end;gap:10px;justify-content:space-between;flex-wrap:wrap}.eyebrow{color:#e879f9;font-weight:900;letter-spacing:2px;font-size:11px}.top h1{font-size:clamp(28px,6vw,42px);margin:5px 0}.top p{color:#a1a1aa;margin:0}.searchTop,.friends input{background:#111116;color:#fff;border:1px solid #39303f;border-radius:12px;padding:10px}.searchTop{width:130px}.notice{margin-top:12px;padding:12px;border-radius:12px;background:#241331;color:#f0abfc}.layout{display:grid;grid-template-columns:260px 1fr;gap:14px;margin-top:18px}.friends,.chat{background:#0f0f13;border:1px solid #332a39;border-radius:20px;overflow:hidden}.friends{padding:12px}.friends>b{font-size:12px;color:#a1a1aa}.friends input{width:100%;margin:10px 0}.friend{width:100%;display:flex;align-items:center;gap:10px;border:1px solid transparent;background:#121216;color:#fff;border-radius:14px;padding:9px;margin:3px 0;text-align:left}.friend.selected{background:#24152d;border-color:#704080}.friend small{display:block;color:#22c55e;font-size:11px;margin-top:3px}.avatar{width:40px;height:40px;flex:0 0 40px;border-radius:50%;object-fit:cover;border:1px solid #7c3aed;background:#17111c}.avatar.large{width:46px;height:46px;flex-basis:46px;border:2px solid #a855f7;box-shadow:0 0 14px #7c3aed55}.chatHead{display:flex;align-items:center;gap:10px;padding:11px;border-bottom:1px solid #332a39;background:#17111c}.person{flex:1}.person small{display:block;color:#22c55e;font-size:11px;margin-top:3px}.actions{display:flex;gap:6px}.actions a{display:grid;place-items:center;width:40px;height:40px;background:#24152d;border:1px solid #554361;border-radius:11px;text-decoration:none}.body{min-height:55vh;max-height:65vh;overflow:auto;padding:18px;background:radial-gradient(circle at top,#1b1023,#0b0b0f 50%)}.row{display:flex;align-items:end;gap:7px;margin:8px 0}.mine{justify-content:flex-end}.messageAvatar{width:28px;height:28px;border-radius:50%;object-fit:cover;border:1px solid #7c3aed}.bubble{max-width:80%;padding:11px 14px;border-radius:18px;background:#202026;line-height:1.5}.mine .bubble{background:linear-gradient(135deg,#6d28d9,#a855f7)}.bubble small{display:block;text-align:right;opacity:.55;font-size:9px;margin-top:4px}.empty{text-align:center;color:#777;margin:55px auto;line-height:1.7}.empty img{width:78px;height:78px;border-radius:50%;object-fit:cover;border:2px solid #a855f7}.typing{display:flex;align-items:center;gap:7px;color:#c4b5fd;font-size:13px}.typing img{width:24px;height:24px;border-radius:50%;object-fit:cover}.composer{display:flex;gap:7px;padding:10px;border-top:1px solid #332a39}.composer input{flex:1;min-width:0;background:#09090c;color:#fff;border:1px solid #3b3440;border-radius:22px;padding:0 15px}.composer button{width:42px;height:42px;border-radius:13px;border:1px solid #4b3b55;background:#21152a;color:#fff}.composer .send{border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899)}.friendsToggle,.mobileMenu{display:none}.overlay{display:none}.drawer{display:none}@media(max-width:720px){.page{padding:10px 7px}.searchTop{display:none}.friendsToggle{display:block;background:#21152a;color:#fff;border:1px solid #554361;border-radius:12px;padding:9px}.layout{display:block}.friends{display:none}.mobileMenu{display:block;background:none;border:0;color:#fff;font-size:20px}.overlay{display:flex;position:fixed;inset:0;z-index:100;background:#000b}.drawer{display:block;width:84vw;max-width:340px;height:100%;background:#101014;padding:14px;overflow:auto}.drawerHead{display:flex;justify-content:space-between;padding-bottom:12px}.drawerHead button{background:none;border:0;color:#fff;font-size:20px}.body{min-height:62vh;max-height:68vh}.bubble{max-width:84%}}`}</style></>;
}

export default function MessagesPage(){return <Suspense fallback={<><Nav/><main className="page"><p>Loading messages…</p></main></>}><MessagesContent/></Suspense>;}
