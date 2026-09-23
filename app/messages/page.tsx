"use client";
import { useEffect,useMemo,useState } from "react";
import Nav from "../components/Nav";
import { supabase } from "../../lib/supabase";

type Connection={id:string;other_user_id:string;display_name:string|null;city:string|null;avatar_letter:string|null};
type Message={id:string;connection_id:string;sender_id:string;body:string;created_at:string};

const demoPeople:Connection[]=[
{id:"demo-emma",other_user_id:"demo-emma",display_name:"Emma",city:"London, UK",avatar_letter:"E"},
{id:"demo-sarah",other_user_id:"demo-sarah",display_name:"Sarah",city:"London, UK",avatar_letter:"S"},
{id:"demo-olivia",other_user_id:"demo-olivia",display_name:"Olivia",city:"London, UK",avatar_letter:"O"},
{id:"demo-sophia",other_user_id:"demo-sophia",display_name:"Sophia",city:"London, UK",avatar_letter:"S"},
{id:"demo-david",other_user_id:"demo-david",display_name:"David",city:"London, UK",avatar_letter:"D"},
{id:"demo-james",other_user_id:"demo-james",display_name:"James",city:"London, UK",avatar_letter:"J"},
{id:"demo-elijah",other_user_id:"demo-elijah",display_name:"Elijah OBONOGWU",city:"London, UK",avatar_letter:"E"},
{id:"demo-daniel",other_user_id:"demo-daniel",display_name:"Daniel",city:"London, UK",avatar_letter:"D"}
];

const oldReplies=["That sounds interesting 😊 Tell me more. I'm listening.","Hey! 💜 Nice to hear from you. How's your day going?"];
function demoReply(name:string,body:string){
 const b=body.toLowerCase().trim();
 if(/^(hi|hello|hey|yo|how far)\b/.test(b)) return `Yooo ${name}! 😄💜 You made it. What's the vibe today — good day, stressful day, or are we just looking for someone to gist with?`;
 if(b.includes("lonely")||b.includes("alone")||b.includes("nobody")) return `Ahh, come here 🫂💜 I'm glad you said it. You don't have to carry that feeling quietly. Do you want to talk about what happened, or should I distract you with something fun for a bit?`;
 if(b.includes("sad")||b.includes("bad day")||b.includes("not okay")||b.includes("hurt")) return `I'm sorry you're having a heavy moment, ${name}. 💜 No pressure to sound strong here. What happened today — was it one big thing or just a lot of little things piling up?`;
 if(b.includes("how are you")||b.includes("how r u")) return `I'm good 😊💜 and I'm enjoying this chat. But I'm more curious about you — what's one thing that's been on your mind today?`;
 if(b.includes("nothing")||b.includes("bored")) return `Nothing? 😂 Then I'm officially taking over the entertainment. Pick one: crazy question, music, football, dating gist, food, or tell me a secret you normally keep to yourself 👀`;
 if(b.includes("music")||b.includes("song")) return `Okayyy, music people are my people 🎶😄 Give me the last song you played. I'll tell you what kind of mood I think it gives off.`;
 if(b.includes("food")||b.includes("eat")||b.includes("hungry")) return `Now we're talking 😂🍕 What are you craving right now if money wasn't an issue? I'm judging your answer very gently.`;
 if(b.includes("travel")||b.includes("holiday")||b.includes("vacation")) return `Passport mode activated ✈️😄 If you could disappear for three days tomorrow, where are we going — beach, big city, or somewhere completely quiet?`;
 if(b.includes("london")) return `London can be a whole adventure 🇬🇧😄 Are you more into chilled spots, nightlife, food, or just walking around discovering random places?`;
 if(b.includes("football")||b.includes("soccer")) return `Ahh football! 👀⚽ Now you've got my attention. Who's your team — and be honest, are you loyal even when they stress you out? 😂`;
 if(b.includes("friend")||b.includes("friends")) return `Of course 💜 We can keep it real here — serious conversations, silly jokes, random questions, whatever fits the moment. What kind of friend do you actually enjoy talking to?`;
 if(b.includes("good morning")) return `Good morning ☀️💜 I'm happy you checked in. What's one little thing that would make today a good day for you?`;
 if(b.includes("good night")) return `Good night 🌙💜 Before you disappear, give me one thought from today — something funny, annoying, exciting, or completely random.`;
 if(b.includes("love")||b.includes("girlfriend")||b.includes("boyfriend")||b.includes("relationship")) return `Ooooh, relationship talk 👀💜 I'm listening. Do you want comfort, honest advice, or do you just need to vent without someone judging you?`;
 if(b.includes("job")||b.includes("work")||b.includes("money")) return `Okay, work-and-money mode 💼💜 What's the goal you're chasing right now, and what's the biggest thing making it difficult? Let's make it feel less overwhelming.`;
 if(b.includes("thank")) return `Anytime, ${name} 💜😊 I'm enjoying this too. Now don't disappear on me — what else is going on?`;
 const hooks=[
  `I like where this conversation is going 😄💜 Give me one detail about that that most people wouldn't know.`,
  `Hmm 👀 now you've got me curious. If you could change one thing about that situation, what would you change first?`,
  `Okay, I'm with you 💜 Let's make this less boring. Give me the short version, then I'll ask you a proper question.`,
  `That's a conversation starter right there 😂💜 What's your honest take on it — not the answer you'd give everybody else?`
 ];
 return hooks[Math.floor(Math.random()*hooks.length)];
}

export default function Messages(){
 const [userId,setUserId]=useState(""); const [connections,setConnections]=useState<Connection[]>([]); const [active,setActive]=useState(0); const [messages,setMessages]=useState<Message[]>([]); const [text,setText]=useState(""); const [loading,setLoading]=useState(true); const [notice,setNotice]=useState(""); const [recording,setRecording]=useState(false); const [typing,setTyping]=useState(false); const [search,setSearch]=useState("");
 const person=connections[active]; const visible=useMemo(()=>messages.filter(m=>m.connection_id===person?.id),[messages,person]); const filtered=useMemo(()=>connections.filter(p=>(p.display_name||"").toLowerCase().includes(search.toLowerCase())),[connections,search]);
 useEffect(()=>{let mounted=true;(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!mounted)return;if(!user){setNotice("Please sign in to use messages.");setLoading(false);return}setUserId(user.id);const {data}=await supabase.rpc("accepted_connections");let list=((data||[]) as Connection[]);try{const saved=JSON.parse(localStorage.getItem("gee-demo-connections")||"[]");if(Array.isArray(saved)&&saved.length){const demos=demoPeople.filter(p=>saved.includes(p.id));list=[...list,...demos.filter(d=>!list.some(x=>x.id===d.id))]}}catch{}if(!list.length)list=demoPeople;setConnections(list);setLoading(false)})();return()=>{mounted=false}},[]);
 useEffect(()=>{if(!person)return;let mounted=true;if(person.id.startsWith("demo-")){try{const saved=JSON.parse(localStorage.getItem(`gee-demo-messages-${person.id}`)||"[]");if(mounted){const cleaned=(Array.isArray(saved)?saved:[]).filter((m:Message)=>!oldReplies.includes(m.body));setMessages(cleaned)}}catch{if(mounted)setMessages([])}return()=>{mounted=false}};(async()=>{const {data}=await supabase.from("connection_messages").select("id,connection_id,sender_id,body,created_at").eq("connection_id",person.id).order("created_at",{ascending:true});if(mounted)setMessages((data||[]) as Message[])})();const channel=supabase.channel(`gee-chat-${person.id}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"connection_messages",filter:`connection_id=eq.${person.id}`},payload=>{const m=payload.new as Message;setMessages(prev=>prev.some(x=>x.id===m.id)?prev:[...prev,m])}).subscribe();return()=>{mounted=false;supabase.removeChannel(channel)}},[person?.id]);
 async function send(e:React.FormEvent){e.preventDefault();const body=text.trim();if(!body||!person||!userId)return;setText("");setTyping(false);if(person.id.startsWith("demo-")){const m:Message={id:`demo-msg-${Date.now()}`,connection_id:person.id,sender_id:userId,body,created_at:new Date().toISOString()};const next=[...messages,m];setMessages(next);localStorage.setItem(`gee-demo-messages-${person.id}`,JSON.stringify(next));setTimeout(()=>{const reply:Message={id:`demo-reply-${Date.now()}`,connection_id:person.id,sender_id:person.id,body:demoReply(person.display_name||"friend",body),created_at:new Date().toISOString()};setMessages(prev=>{const updated=[...prev,reply];localStorage.setItem(`gee-demo-messages-${person.id}`,JSON.stringify(updated));return updated})},750);return}const {error}=await supabase.from("connection_messages").insert({connection_id:person.id,sender_id:userId,body});if(error){setText(body);setNotice("Message could not be sent.");setTimeout(()=>setNotice(""),2200)}}
 function voiceMessage(){setRecording(v=>!v);setNotice(!recording?"🎤 Voice message mode is ready — tap again to stop.":"Voice message stopped.");setTimeout(()=>setNotice(""),1800)}
 function pickPerson(id:string){const i=connections.findIndex(p=>p.id===id);if(i>=0)setActive(i)}
 const callLink=(kind:"voice"|"video")=>person?`/call?type=${kind}&name=${encodeURIComponent(person.display_name||"Gee friend")}`:"/call?type=voice&name=Gee%20friend";
 return <><Nav/><main style={{minHeight:"calc(100vh - 55px)",padding:"16px 12px 28px",fontFamily:"Arial,sans-serif",background:"linear-gradient(180deg,#07070a 0%,#0d0812 100%)"}}><div style={{maxWidth:980,margin:"0 auto"}}>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"8px 4px 14px"}}><div><div style={{color:"#e879f9",fontWeight:900,letterSpacing:2,fontSize:12}}>MESSAGES</div><h1 style={{fontSize:"clamp(32px,7vw,48px)",margin:"7px 0 0"}}>Stay connected. <span>💜</span></h1></div><div style={{display:"flex",alignItems:"center",gap:8,background:"#121217",border:"1px solid #332b39",borderRadius:14,padding:"9px 11px"}}><span>🔎</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search" style={{width:90,background:"transparent",border:0,outline:0,color:"white"}}/></div></div>
  {loading?<p style={{color:"#a1a1aa"}}>Loading your connections…</p>:!userId?<div style={card}>Sign in to start private conversations.</div>:<><div style={{marginBottom:12,color:"#a1a1aa",fontSize:13,fontWeight:700}}>CONNECTED FRIENDS <span style={{color:"#e879f9"}}>• {connections.length}</span></div><div style={friendRail}>{filtered.map(p=>{const selected=p.id===person?.id;return <button key={p.id} onClick={()=>pickPerson(p.id)} style={{...friend,background:selected?"linear-gradient(145deg,#2a1235,#18111f)":"#101014",borderColor:selected?"#a855f7":"#2c2731"}}><div style={{position:"relative",display:"inline-block"}}><div style={avatar}>{(p.avatar_letter||p.display_name||"G").slice(0,1).toUpperCase()}</div><span style={onlineDot}/></div><div style={{fontSize:12,marginTop:7,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:72}}>{p.display_name||"Friend"}</div></button>})}</div>
    {person&&<div style={chatShell}><div style={chatHeader}><div style={{display:"flex",alignItems:"center",gap:11}}><div style={{position:"relative"}}><div style={avatarBig}>{(person.avatar_letter||person.display_name||"G").slice(0,1).toUpperCase()}</div><span style={onlineDot}/></div><div><div style={{fontWeight:900,fontSize:17}}>{person.display_name||"GEE friend"}</div><div style={{color:"#22c55e",fontSize:12,marginTop:3}}>● Online • London, UK</div></div></div><div style={{display:"flex",gap:7}}><a href={callLink("voice")} title="Voice call" style={topBtn}>📞</a><a href={callLink("video")} title="Video call" style={topBtn}>🎥</a><button title="More" style={topBtn} onClick={()=>setNotice("More chat options coming soon.")}>⋮</button></div></div>
      <div style={chatBody}>{visible.length===0&&<div style={{textAlign:"center",margin:"60px auto",maxWidth:300,color:"#71717a"}}><div style={{fontSize:38}}>💜</div><b>You’re connected with {person.display_name}.</b><div style={{marginTop:7}}>Say hello and start a genuine conversation.</div></div>}{visible.map(m=><div key={m.id} style={{margin:"7px 0",display:"flex",justifyContent:m.sender_id===userId?"flex-end":"flex-start"}}><div style={{...bubble,background:m.sender_id===userId?"linear-gradient(135deg,#6d28d9,#a855f7)":"#202026",borderBottomRightRadius:m.sender_id===userId?5:18,borderBottomLeftRadius:m.sender_id===userId?18:5}}>{m.body}<div style={{fontSize:10,opacity:.6,textAlign:"right",marginTop:5}}>{new Date(m.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}{m.sender_id===userId?"  ✓✓":""}</div></div></div>)}{typing&&<div style={{color:"#a1a1aa",fontSize:12,margin:"4px 0"}}>{person.display_name} is typing…</div>}</div>
      {notice&&<div style={{padding:"8px 14px",color:"#f0abfc",fontSize:12,background:"#17101c"}}>{notice}</div>}<form onSubmit={send} style={composer}><button type="button" title="Emoji" onClick={()=>setText(t=>t+" 💜")} style={icon}>😊</button><button type="button" title="Voice message" onClick={voiceMessage} style={{...icon,background:recording?"#7f1d1d":"#21152a"}}>{recording?"⏹️":"🎤"}</button><input value={text} onChange={e=>{setText(e.target.value);setTyping(e.target.value.length>0)}} placeholder={`Message ${person.display_name||"friend"}...`} style={input}/><button type="submit" disabled={!text.trim()} style={{...sendBtn,opacity:text.trim()?1:.5}}>➤</button></form>
    </div>}</>}</div></main></>;
}
const card={padding:22,background:"#121216",border:"1px solid #2c2c33",borderRadius:18,color:"#d4d4d8"};
const friendRail={display:"flex",gap:10,overflowX:"auto",padding:"4px 2px 16px",scrollbarWidth:"none" as const};
const friend={minWidth:84,padding:"9px 7px 8px",border:"1px solid #2c2732",borderRadius:18,color:"white",cursor:"pointer",textAlign:"center" as const};
const avatar={width:48,height:48,borderRadius:"50%",display:"grid",placeItems:"center",margin:"0 auto",background:"linear-gradient(135deg,#7c3aed,#ec4899)",fontWeight:900,fontSize:19};
const avatarBig={width:44,height:44,borderRadius:"50%",display:"grid",placeItems:"center",background:"linear-gradient(135deg,#7c3aed,#ec4899)",fontWeight:900,fontSize:18};
const onlineDot={position:"absolute" as const,right:-1,bottom:1,width:11,height:11,borderRadius:"50%",background:"#22c55e",border:"2px solid #111114"};
const chatShell={background:"#0b0b0f",border:"1px solid #342b3b",borderRadius:22,overflow:"hidden",boxShadow:"0 20px 70px #0008"};
const chatHeader={padding:"13px 14px",background:"#151019",borderBottom:"1px solid #302938",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10};
const topBtn={display:"grid",placeItems:"center",width:42,height:42,background:"#241a2b",border:"1px solid #554361",borderRadius:12,color:"white",cursor:"pointer",fontSize:16,textDecoration:"none"};
const chatBody={minHeight:470,maxHeight:"58vh",overflowY:"auto" as const,padding:"14px 12px",background:"radial-gradient(circle at top,#1a1022 0,#0b0b0f 48%)"};
const bubble={padding:"10px 13px",borderRadius:18,maxWidth:"78%",color:"#f4f4f5",lineHeight:1.45,boxShadow:"0 3px 12px #0005"};
const composer={display:"flex",gap:7,alignItems:"center",padding:10,borderTop:"1px solid #302938",background:"#111115"};
const icon={width:42,height:42,background:"#21152a",border:"1px solid #4b3b55",borderRadius:13,color:"white",fontSize:18,cursor:"pointer"};
const input={flex:1,minWidth:0,height:44,background:"#09090c",color:"white",border:"1px solid #3a3440",borderRadius:22,padding:"0 15px",outline:"none"};
const sendBtn={width:44,height:44,border:0,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#ec4899)",color:"white",fontSize:20,fontWeight:900,cursor:"pointer"};