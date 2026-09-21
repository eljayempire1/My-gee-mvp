"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Nav from "../components/Nav";

type SpeechRecognitionLike = { lang: string; start: () => void; stop: () => void; onresult: ((event: any) => void) | null; onend: (() => void) | null; onerror?: (() => void) | null };
declare global { interface Window { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike } }

const personalities = [
  { id:"friendly", label:"😊 Friendly", intro:"I'm your friendly Gee. Tell me what's on your mind." },
  { id:"motivator", label:"💪 Motivator", intro:"Let's go! Tell me what you're trying to achieve and we'll tackle it together." },
  { id:"wise", label:"🧠 Wise", intro:"I'm here to listen carefully and help you think things through." },
  { id:"fun", label:"😂 Fun", intro:"Alright, let's keep it fun! What's happening? 😄" },
  { id:"calm", label:"🌙 Calm", intro:"Take a breath. I'm here with you. We can take this slowly." },
];

export default function Voice() {
  const [listening, setListening] = useState(false);
  const [reply, setReply] = useState(personalities[0].intro);
  const [busy, setBusy] = useState(false);
  const [personality, setPersonality] = useState("friendly");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  function speak(text: string) { if (typeof window !== "undefined" && "speechSynthesis" in window) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang="en-GB"; u.rate=.98; window.speechSynthesis.speak(u); } }

  function choosePersonality(id: string) {
    setPersonality(id);
    const p = personalities.find(x=>x.id===id) || personalities[0];
    setReply(p.intro);
    speak(p.intro);
  }

  function stopCall() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setListening(false);
  }

  function startListening() {
    if (listening) { stopCall(); return; }
    const Recognition = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : undefined;
    if (!Recognition) { const msg="Voice input isn't supported by this browser yet. Try Chrome on Android or Safari on iPhone."; setReply(msg); speak(msg); return; }
    const recognition = new Recognition(); recognition.lang="en-GB"; recognitionRef.current=recognition; setListening(true);
    recognition.onresult = async (event) => {
      const text=event.results?.[0]?.[0]?.transcript || ""; if(!text) return; setBusy(true);
      try { const p=personalities.find(x=>x.id===personality) || personalities[0]; const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"system",content:`Speak in a ${p.id} personality.`},{role:"user",content:text}]})}); const data=await r.json(); const answer=data.reply || "I'm listening. Tell me more."; setReply(answer); speak(answer); }
      catch { const msg="I'm having trouble connecting right now. Please try again."; setReply(msg); speak(msg); }
      finally { setBusy(false); }
    };
    recognition.onend=()=>setListening(false); recognition.onerror=()=>setListening(false); recognition.start();
  }

  return <><Nav /><main style={{minHeight:"calc(100vh - 55px)",padding:"24px 18px",fontFamily:"Arial,sans-serif"}}><div style={{maxWidth:680,margin:"0 auto",textAlign:"center"}}>
    <Link href="/chat" style={{display:"inline-block",color:"#d8b4fe",textDecoration:"none",marginBottom:16}}>← Back to chat</Link>
    <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"7px 12px",borderRadius:999,background:"#15131a",border:"1px solid #3b3340",color:"#c4b5fd",fontSize:13}}><span style={{color:"#22c55e"}}>●</span>{listening?"Live voice session":"Gee voice"}</div>
    <div style={{width:130,height:130,borderRadius:"50%",margin:"26px auto 18px",display:"grid",placeItems:"center",fontSize:48,background:"linear-gradient(135deg,#581c87,#db2777)",boxShadow:listening?"0 0 70px #c026d388":"0 0 45px #7c3aed66"}}>💜</div>
    <h1 style={{fontSize:42,margin:"0 0 7px"}}>Call My Gee</h1><p style={{color:"#a1a1aa",fontSize:17}}>Talk naturally. Choose the vibe you want.</p>
    <div style={{display:"flex",gap:8,overflowX:"auto",padding:"18px 2px",marginBottom:8}}>{personalities.map(p=><button key={p.id} onClick={()=>choosePersonality(p.id)} style={{whiteSpace:"nowrap",padding:"10px 13px",borderRadius:999,border:personality===p.id?"1px solid #c026d3":"1px solid #383044",background:personality===p.id?"#28102f":"#121016",color:"#f3e8ff",fontWeight:700}}>{p.label}</button>)}</div>
    <div style={{margin:"14px 0 28px",padding:20,borderRadius:22,background:"linear-gradient(145deg,#18131f,#111114)",border:"1px solid #3b3340",color:"#f5f3ff",lineHeight:1.65,minHeight:70}}>{busy?"Gee is thinking… ✨":reply}</div>
    <button onClick={startListening} style={{width:118,height:118,borderRadius:"50%",border:"1px solid #c084fc",background:listening?"linear-gradient(135deg,#991b1b,#dc2626)":"linear-gradient(135deg,#7c3aed,#c026d3)",color:"white",fontSize:42,boxShadow:listening?"0 0 45px #dc262688":"0 0 35px #7c3aed66"}}>{listening?"☎️":"📞"}</button>
    <p style={{color:"#a1a1aa",marginTop:16,fontWeight:700}}>{listening?"Tap to end call":"Tap to call Gee"}</p>
    {listening && <button onClick={stopCall} style={{marginTop:4,padding:"10px 18px",borderRadius:12,border:"1px solid #3f3f46",background:"#18181b",color:"#e4e4e7"}}>End voice session</button>}
    <div style={{display:"flex",justifyContent:"center",gap:9,marginTop:28,flexWrap:"wrap"}}>{["🎙️ Voice input","🔊 Spoken replies","😊 Personality","🔒 Private session"].map(x=><span key={x} style={{padding:"8px 11px",borderRadius:999,border:"1px solid #383044",background:"#121016",color:"#c4b5fd",fontSize:12}}>{x}</span>)}</div>
  </div></main></>;
}
