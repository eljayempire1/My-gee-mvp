"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Nav from "../components/Nav";
import { supabase } from "../../lib/supabase";

type Person={id:string;display_name:string;city:string;avatar_letter:string};
type Message={id:string;connection_id:string;sender_id:string;body:string;created_at:string};
type ChatMessage={role:"user"|"assistant";content:string};

const people:Person[]=[
 {id:"demo-emma",display_name:"Emma",city:"London, UK",avatar_letter:"E"},
 {id:"demo-sarah",display_name:"Sarah",city:"London, UK",avatar_letter:"S"},
 {id:"demo-olivia",display_name:"Olivia",city:"London, UK",avatar_letter:"O"},
 {id:"demo-sophia",display_name:"Sophia",city:"London, UK",avatar_letter:"S"},
 {id:"demo-david",display_name:"David",city:"London, UK",avatar_letter:"D"},
 {id:"demo-james",display_name:"James",city:"London, UK",avatar_letter:"J"},
 {id:"demo-elijah",display_name:"Elijah OBONOGWU",city:"London, UK",avatar_letter:"E"},
 {id:"demo-daniel",display_name:"Daniel",city:"London, UK",avatar_letter:"D"},
];

function legacy(body:string){return /tell me more\.\s*i'?m listening\.?/i.test(body)||/that sounds interesting/i.test(body)}
function fallback(name:string,text:string){const t=text.toLowerCase();if(/lonely|alone|nobody|no one|isolated/.test(t))return `Ahh ${name} ❤️ I'm sorry you're feeling lonely. Come, talk to me for a bit — what's been making you feel this way? 🫂`;if(/sad|upset|hurt|cry|bad day|not okay|stressed|overwhelmed/.test(t))return `Aww ❤️ I'm sorry you're having a rough time. You don't have to brush it off with me — what happened? 🫂`;if(/happy|excited|great|amazing|good news|good day/.test(t))return `Yesss 😄❤️ I love hearing that energy from you. Come on, tell me what happened!`;return `I'm listening, and I want to understand you properly. ❤️ What part of that is weighing on you most?`}
function demoIds(){try{const raw=JSON.parse(localStorage.getItem("gee-demo-connections")||"[]");return Array.isArray(raw)?raw.filter((x):x is string=>typeof x==="string"):[]}catch{return[]}}
function savedMessages(id:string){try{const raw=JSON.parse(localStorage.getItem(`gee-v2-messages-${id}`)||"[]");return Array.isArray(raw)?raw.filter((m:any)=>!legacy(String(m?.body||""))):[]}catch{return[]}}

export default function Messages(){
 const params=useSearchParams();
 const [userId,setUserId]=useState("");
 const [connections,setConnections]=useState<Person[]>(people);
 const [active,setActive]=useState(0);
 const [messages,setMessages]=useState<Message[]>([]);
 const [text,setText]=useState("");
 const [loading,setLoading]=useState(true);
 const [notice,setNotice]=useState("");
 const [search,setSearch]=useState("");
 const [replying,setReplying]=useState(false);
 const [mobileFriends,setMobileFriends]=useState(false);
 const person=connections[active];
 const visible=useMemo(()=>messages.filter(m=>m.connection_id===person?.id),[messages,person]);
 const filtered=useMemo(()=>connections.filter(p=>p.display_name.toLowerCase().includes(search.toLowerCase())),[connections,search]);

 useEffect(()=>{let mounted=true;(async()=>{
   const [{data:{user}},{data:rpcData}]=await Promise.all([
     supabase.auth.getUser(),
     supabase.rpc("accepted_connections").catch(()=>({data:null}))
   ]);
   if(!mounted)return;
   if(user)setUserId(user.id);else if(localStorage.getItem("gee-demo-session"))setUserId("demo-user");
   const local=demoIds();
   const unique=new Map<string,Person>();
   // Always keep the complete built-in connection directory available.
   people.forEach(p=>unique.set(p.id,p));
   // Restore any connections the user explicitly saved in Discover.
   local.forEach(id=>{const p=people.find(x=>x.id===id);if(p)unique.set(p.id,p);});
   if(Array.isArray(rpcData)){
     (rpcData as any[]).forEach(p=>unique.set(p.id,{id:p.id,display_name:p.display_name||"Friend",city:p.city||"London, UK",avatar_letter:(p.display_name||"G").slice(0,1).toUpperCase()}));
   }
   setConnections([...unique.values()]);
   setLoading(false);
 })();return()=>{mounted=false}},[]);

 useEffect(()=>{const wanted=params.get("name");if(!wanted)return;const i=connections.findIndex(p=>p.display_name.toLowerCase()===wanted.toLowerCase());if(i>=0)setActive(i)},[params,connections]);
 useEffect(()=>{if(!person)return; if(person.id.startsWith("demo-")){setMessages(savedMessages(person.id));return;}let mounted=true;(async()=>{const {data}=await supabase.from("connection_messages").select("id,connection_id,sender_id,body,created_at").eq("connection_id",person.id).order("created_at",{ascending:true});if(mounted)setMessages((data||[]) as Message[])})();return()=>{mounted=false}},[person?.id]);

 async function aiReply(name:string,history:Message[]){const chat:ChatMessage[]=history.map(m=>({role:m.sender_id===userId||m.sender_id==="guest"||m.sender_id==="demo-user"?"user":"assistant",content:m.body}));const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({companionName:name,messages:chat})});if(!r.ok)throw new Error("AI request failed");const d=await r.json();if(!d?.reply)throw new Error("No reply");return d.reply as string}
 async function send(e:React.FormEvent){e.preventDefault();const body=text.trim();if(!body||!person||replying)return;setText("");const mine:Message={id:`u-${Date.now()}`,connection_id:person.id,sender_id:userId||"guest",body,created_at:new Date().toISOString()};const next=[...messages,mine];setMessages(next);
   if(person.id.startsWith("demo-")){localStorage.setItem(`gee-v2-messages-${person.id}`,JSON.stringify(next));setReplying(true);try{const raw=await aiReply(person.display_name,next);const reply=legacy(raw)?fallback(person.display_name,body):raw;setMessages(prev=>{const updated=[...prev,{id:`g-${Date.now()}`,connection_id:person.id,sender_id:person.id,body:reply,created_at:new Date().toISOString()}];localStorage.setItem(`gee-v2-messages-${person.id}`,JSON.stringify(updated));return updated})}catch{setNotice(`${person.display_name} is having trouble connecting. Try again in a moment.`)}finally{setReplying(false)}return}
   if(!userId){setNotice("Please sign in to send private messages.");return}const {error}=await supabase.from("connection_messages").insert({connection_id:person.id,sender_id:userId,body});if(error)setNotice("Message could not be sent.")
 }
 if(loading)return <><Nav/><main className="page"><p>Loading your connections…</p></main>;
 return <><Nav/><main className="page"><div className="wrap"><header className="top"><div><div className="eyebrow">MESSAGES</div><h1>Stay connected. 💜</h1><p>Your connections are here — choose someone to chat or call.</p></div><button className="friendsToggle" onClick={()=>setMobileFriends(true)}>☰ Friends</button><input className="searchTop" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search"/></header>
 {notice&&<div className="notice">{notice}</div>}
 <div className="layout"><aside className="friends"><b>CONNECTIONS • {filtered.length}</b><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search friends"/>{filtered.map((p)=><button key={p.id} onClick={()=>{setActive(connections.findIndex(x=>x.id===p.id));setMobileFriends(false)}} className={p.id===person?.id?"friend selected":"friend"}><span className="avatar">{p.avatar_letter}</span><span><strong>{p.display_name}</strong><small>● Online</small></span></button>)}</aside>
 {mobileFriends&&<div className="overlay" onClick={()=>setMobileFriends(false)}><div className="drawer" onClick={e=>e.stopPropagation()}><div className="drawerHead"><b>Connections</b><button onClick={()=>setMobileFriends(false)}>✕</button></div>{filtered.map(p=><button key={p.id} onClick={()=>{setActive(connections.findIndex(x=>x.id===p.id));setMobileFriends(false)}} className="friend"><span className="avatar">{p.avatar_letter}</span><span><strong>{p.display_name}</strong><small>● Online</small></span></button>)}</div></div>}
 <section className="chat"><header className="chatHead"><button className="mobileMenu" onClick={()=>setMobileFriends(true)}>☰</button><span className="avatar">{person?.avatar_letter||"G"}</span><div className="person"><strong>{person?.display_name||"Friend"}</strong><small>● Online • {person?.city||"UK"}</small></div><div className="actions"><a href={`/call?type=voice&name=${encodeURIComponent(person?.display_name||"")}`}>📞</a><a href={`/call?type=video&name=${encodeURIComponent(person?.display_name||"")}`}>🎥</a></div></header><div className="body">{!visible.length&&<div className="empty">💜<br/><b>You’re connected with {person?.display_name}.</b><br/>Say hello and start a conversation.</div>}{visible.map(m=><div key={m.id} className={m.sender_id===userId||m.sender_id==="guest"||m.sender_id==="demo-user"?"row mine":"row"}><div className="bubble">{m.body}<small>{new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></div></div>)}{replying&&<div className="typing">{person?.display_name} is thinking… 💜</div>}</div><form className="composer" onSubmit={send}><button type="button" onClick={()=>setText(v=>v+" 💜")}>😊</button><input value={text} onChange={e=>setText(e.target.value)} placeholder={`Message ${person?.display_name||"friend"}...`}/><button className="send" disabled={!text.trim()||replying}>➤</button></form></section></div></div></main>
 <style jsx global>{`*{box-sizing:border-box}.page{min-height:calc(100vh - 55px);padding:18px 10px 30px;background:linear-gradient(180deg,#07070a,#100914);color:#fff;font-family:Arial,sans-serif}.wrap{max-width:1120px;margin:auto}.top{display:flex;align-items:end;gap:10px;justify-content:space-between;flex-wrap:wrap}.eyebrow{color:#e879f9;font-weight:900;letter-spacing:2px;font-size:11px}.top h1{font-size:clamp(28px,6vw,42px);margin:5px 0}.top p{color:#a1a1aa;margin:0}.searchTop,.friends input{background:#111116;color:#fff;border:1px solid #39303f;border-radius:12px;padding:10px}.searchTop{width:130px}.layout{display:grid;grid-template-columns:260px 1fr;gap:14px;margin-top:18px}.friends,.chat{background:#0f0f13;border:1px solid #332a39;border-radius:20px;overflow:hidden}.friends{padding:12px}.friends>b{font-size:12px;color:#a1a1aa}.friends input{width:100%;margin:10px 0}.friend{width:100%;display:flex;align-items:center;gap:10px;border:1px solid transparent;background:#121216;color:#fff;border-radius:14px;padding:9px;margin:3px 0;text-align:left}.friend.selected{background:#24152d;border-color:#704080}.friend small{display:block;color:#22c55e;font-size:11px;margin-top:3px}.avatar{width:40px;height:40px;flex:0 0 40px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#7c3aed,#ec4899);font-weight:900}.chatHead{display:flex;align-items:center;gap:10px;padding:11px;border-bottom:1px solid #332a39;background:#17111c}.person{flex:1}.person small{display:block;color:#22c55e;font-size:11px;margin-top:3px}.actions{display:flex;gap:6px}.actions a{display:grid;place-items:center;width:40px;height:40px;background:#24152d;border:1px solid #554361;border-radius:11px;text-decoration:none}.body{min-height:55vh;max-height:65vh;overflow:auto;padding:18px;background:radial-gradient(circle at top,#1b1023,#0b0b0f 50%)}.row{display:flex;margin:8px 0}.mine{justify-content:flex-end}.bubble{max-width:80%;padding:11px 14px;border-radius:18px;background:#202026;line-height:1.5}.mine .bubble{background:linear-gradient(135deg,#6d28d9,#a855f7)}.bubble small{display:block;text-align:right;opacity:.55;font-size:9px;margin-top:4px}.empty{text-align:center;color:#777;margin:70px auto;line-height:1.7}.typing{color:#c4b5fd;font-size:13px}.composer{display:flex;gap:7px;padding:10px;border-top:1px solid #332a39}.composer input{flex:1;min-width:0;background:#09090c;color:#fff;border:1px solid #3b3440;border-radius:22px;padding:0 15px}.composer button{width:42px;height:42px;border-radius:13px;border:1px solid #4b3b55;background:#21152a;color:#fff}.composer .send{border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899)}.friendsToggle,.mobileMenu{display:none}.notice{padding:10px;margin-top:10px;background:#21152a;color:#f0abfc;border-radius:10px}.overlay{display:none}.drawer{display:none}@media(max-width:720px){.page{padding:10px 7px}.searchTop{display:none}.friendsToggle{display:block;background:#21152a;color:#fff;border:1px solid #554361;border-radius:12px;padding:9px}.layout{display:block}.friends{display:none}.mobileMenu{display:block;background:none;border:0;color:#fff;font-size:20px}.overlay{display:flex;position:fixed;inset:0;z-index:100;background:#000b}.drawer{display:block;width:84vw;max-width:340px;height:100%;background:#101014;padding:14px;overflow:auto}.drawerHead{display:flex;justify-content:space-between;padding-bottom:12px}.drawerHead button{background:none;border:0;color:#fff;font-size:20px}.body{min-height:62vh;max-height:68vh}.bubble{max-width:86%}.top p{font-size:13px}.actions a{width:37px;height:37px}}`}</style></>;
}
