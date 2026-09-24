"use client";
import { useEffect,useRef,useState } from "react";
import { useSearchParams } from "next/navigation";

type SpeechRecognitionLike = { lang:string; continuous?:boolean; interimResults?:boolean; start:()=>void; stop:()=>void; onresult:((event:any)=>void)|null; onend:(()=>void)|null; onerror?:((event:any)=>void)|null };
declare global { interface Window { webkitSpeechRecognition?:new()=>SpeechRecognitionLike; SpeechRecognition?:new()=>SpeechRecognitionLike } }

export default function CallPage(){
 const params=useSearchParams(); const type=params.get("type")==="video"?"video":"voice"; const name=params.get("name")||"Gee friend";
 const videoRef=useRef<HTMLVideoElement>(null); const streamRef=useRef<MediaStream|null>(null); const recognitionRef=useRef<SpeechRecognitionLike|null>(null); const speakingRef=useRef(false); const aliveRef=useRef(true);
 const [status,setStatus]=useState("Starting call…"); const [seconds,setSeconds]=useState(0); const [muted,setMuted]=useState(false); const [camera,setCamera]=useState(type==="video"); const [error,setError]=useState(""); const [voiceOn,setVoiceOn]=useState(false); const [listening,setListening]=useState(false);

 function speak(text:string,onDone?:()=>void){
  if(typeof window==="undefined"||!("speechSynthesis" in window)){onDone?.();return;}
  window.speechSynthesis.cancel(); speakingRef.current=true;
  const u=new SpeechSynthesisUtterance(text); u.lang="en-GB"; u.rate=.98; u.pitch=1; u.volume=1;
  u.onend=()=>{speakingRef.current=false;onDone?.()}; u.onerror=()=>{speakingRef.current=false;onDone?.()};
  window.speechSynthesis.speak(u);
 }

 function beginListening(){
  const Recognition=typeof window!=="undefined"?(window.SpeechRecognition||window.webkitSpeechRecognition):undefined;
  if(!Recognition){setError("Voice input is not supported here. Please use Chrome on Android.");return;}
  if(!aliveRef.current||speakingRef.current)return;
  try{
   const recognition=new Recognition(); recognition.lang="en-GB"; recognition.continuous=false; recognition.interimResults=false; recognitionRef.current=recognition; setListening(true);
   recognition.onresult=async(event:any)=>{
    const text=event.results?.[0]?.[0]?.transcript?.trim()||""; setListening(false); if(!text)return; setStatus("Thinking…");
    try{const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"system",content:`You are ${name}, a warm My Gee companion. Speak naturally, briefly, warmly, and conversationally. Do not sound robotic. This is a live voice conversation.`},{role:"user",content:text}]})}); const data=await r.json(); const answer=data.reply||"I'm here with you. Tell me more."; if(voiceOn&&aliveRef.current)speak(answer,()=>{if(aliveRef.current){setStatus("Connected");beginListening()}}); else setStatus("Connected");}
    catch{const answer="I'm having trouble connecting right now, but I'm still here with you."; if(voiceOn)speak(answer,()=>{if(aliveRef.current){setStatus("Connected");beginListening()}}); else setStatus("Connected");}
   };
   recognition.onend=()=>setListening(false); recognition.onerror=()=>setListening(false); recognition.start();
  }catch{setListening(false)}
 }

 function startVoice(){
  setVoiceOn(true); setError(""); setStatus("Connected");
  const intro=`Hi, I'm ${name}. I'm here with you. You can talk to me naturally. What's on your mind?`;
  speak(intro,()=>{if(aliveRef.current)beginListening()});
 }

 useEffect(()=>{aliveRef.current=true; const start=async()=>{try{const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:type==="video"});if(!aliveRef.current)return;streamRef.current=stream;if(videoRef.current&&type==="video"){videoRef.current.srcObject=stream;await videoRef.current.play().catch(()=>{})}setStatus("Connected");}catch(e){console.error(e);setError("Microphone/camera permission is needed to start the call.");setStatus("Call not started");}};start();return()=>{aliveRef.current=false;recognitionRef.current?.stop();streamRef.current?.getTracks().forEach(t=>t.stop());if(typeof window!=="undefined"&&"speechSynthesis" in window)window.speechSynthesis.cancel()}},[type]);
 useEffect(()=>{if(status!=="Connected"&&status!=="Thinking…")return;const id=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(id)},[status]);
 function toggleMute(){const next=!muted;streamRef.current?.getAudioTracks().forEach(t=>t.enabled=!next);setMuted(next)}
 function toggleCamera(){if(type!=="video")return;const next=!camera;streamRef.current?.getVideoTracks().forEach(t=>t.enabled=next);setCamera(next)}
 function end(){recognitionRef.current?.stop();streamRef.current?.getTracks().forEach(t=>t.stop());if(typeof window!=="undefined"&&"speechSynthesis" in window)window.speechSynthesis.cancel();window.location.href="/messages"}
 const mins=String(Math.floor(seconds/60)).padStart(2,"0"),secs=String(seconds%60).padStart(2,"0");
 return <main style={{minHeight:"100vh",background:"radial-gradient(circle at top,#24102f,#07070a 55%)",color:"white",fontFamily:"Arial,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><section style={{width:"100%",maxWidth:520,background:"#111116",border:"1px solid #3b3042",borderRadius:28,overflow:"hidden",boxShadow:"0 25px 80px #0009"}}>
  <header style={{padding:"18px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #302938"}}><a href="/messages" style={{color:"#ddd",textDecoration:"none",fontSize:25}}>‹</a><div style={{textAlign:"center"}}><div style={{fontWeight:900}}>{type==="video"?"🎥 Video call":"📞 Voice call"}</div><div style={{fontSize:12,color:"#22c55e",marginTop:4}}>● {status} {status==="Connected"?`• ${mins}:${secs}`:""}</div></div><div style={{width:25}}/></header>
  <div style={{minHeight:520,display:"grid",placeItems:"center",padding:20,position:"relative",background:"linear-gradient(180deg,#160d1d,#08080b)"}}>
   {type==="video"?<video ref={videoRef} muted playsInline style={{width:"100%",maxHeight:520,objectFit:"cover",borderRadius:20,background:"#050505"}}/>:<div style={{width:150,height:150,borderRadius:"50%",display:"grid",placeItems:"center",background:"linear-gradient(135deg,#7c3aed,#ec4899)",fontSize:58,fontWeight:900,boxShadow:voiceOn?"0 0 100px #c026d388":"0 0 80px #a855f766"}}>{name.charAt(0).toUpperCase()}</div>}
   <div style={{position:"absolute",bottom:30,left:0,right:0,textAlign:"center"}}><div style={{fontSize:24,fontWeight:900}}>{name}</div><div style={{color:"#a1a1aa",marginTop:6}}>{error|| (listening?"🎙️ Listening…":voiceOn?"🔊 Voice is on — talk naturally":"You're connected to the GEE call screen 💜")}</div>
   {type==="voice"&&!voiceOn&&status==="Connected"&&<button onClick={startVoice} style={{marginTop:18,padding:"13px 22px",borderRadius:999,border:"1px solid #c084fc",background:"linear-gradient(135deg,#7c3aed,#c026d3)",color:"white",fontWeight:800,fontSize:16}}>🔊 Start voice</button>}</div>
  </div>
  <div style={{display:"flex",justifyContent:"center",gap:14,padding:20,borderTop:"1px solid #302938"}}><button onClick={toggleMute} style={control}>{muted?"🔇":"🎙️"}</button>{type==="video"&&<button onClick={toggleCamera} style={control}>{camera?"📷":"🚫"}</button>}<button onClick={end} style={{...control,background:"#b91c1c",borderColor:"#ef4444"}}>☎</button></div>
  <div style={{padding:"0 20px 20px",textAlign:"center",fontSize:11,color:"#71717a"}}>GEE MVP voice uses your browser's speech audio. Live person-to-person calling still needs WebRTC/signaling.</div>
 </section></main>
}
const control={width:56,height:56,borderRadius:"50%",border:"1px solid #554361",background:"#241a2b",color:"white",fontSize:21,cursor:"pointer"};