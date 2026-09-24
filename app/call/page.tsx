"use client";
import { useEffect,useRef,useState } from "react";
import { useSearchParams } from "next/navigation";

type SpeechRecognitionLike = { lang:string; continuous?:boolean; interimResults?:boolean; start:()=>void; stop:()=>void; onresult:((event:any)=>void)|null; onend:(()=>void)|null; onerror?:((event:any)=>void)|null };
declare global { interface Window { webkitSpeechRecognition?:new()=>SpeechRecognitionLike; SpeechRecognition?:new()=>SpeechRecognitionLike } }

export default function CallPage(){
 const params=useSearchParams(); const type=params.get("type")==="video"?"video":"voice"; const name=params.get("name")||"Gee friend";
 const videoRef=useRef<HTMLVideoElement>(null); const streamRef=useRef<MediaStream|null>(null); const recognitionRef=useRef<SpeechRecognitionLike|null>(null); const audioRef=useRef<HTMLAudioElement|null>(null); const aliveRef=useRef(true); const startingVoiceRef=useRef(false);
 const [status,setStatus]=useState("Starting call…"); const [seconds,setSeconds]=useState(0); const [muted,setMuted]=useState(false); const [camera,setCamera]=useState(type==="video"); const [error,setError]=useState(""); const [voiceOn,setVoiceOn]=useState(false); const [listening,setListening]=useState(false);

 async function playVoice(text:string){
  if(!aliveRef.current)return false;
  try{
   if(audioRef.current){audioRef.current.pause();audioRef.current.src="";}
   const response=await fetch("/api/tts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})});
   if(!response.ok)throw new Error("TTS failed");
   const blob=await response.blob(); const url=URL.createObjectURL(blob); const audio=new Audio(url); audio.preload="auto"; audio.volume=1; audioRef.current=audio;
   await audio.play();
   await new Promise<void>(resolve=>{audio.onended=()=>{URL.revokeObjectURL(url);resolve()};audio.onerror=()=>{URL.revokeObjectURL(url);resolve()}});
   return true;
  }catch(e){console.error(e);return false;}
 }

 function beginListening(){
  const Recognition=typeof window!=="undefined"?(window.SpeechRecognition||window.webkitSpeechRecognition):undefined;
  if(!Recognition){setError("Voice input is not supported here. Please use Chrome on Android.");return;}
  if(!aliveRef.current)return;
  try{
   const recognition=new Recognition(); recognition.lang="en-GB"; recognition.continuous=false; recognition.interimResults=false; recognitionRef.current=recognition; setListening(true);
   recognition.onresult=async(event:any)=>{
    const text=event.results?.[0]?.[0]?.transcript?.trim()||""; setListening(false); if(!text)return; setStatus("Thinking…");
    try{
     const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({companionName:name,messages:[{role:"system",content:`You are ${name}, a warm My Gee companion. Speak naturally, briefly, warmly, and conversationally. Do not sound robotic. This is a live voice conversation.`},{role:"user",content:text}]})});
     const data=await r.json(); const answer=data.reply||"I'm here with you. Tell me more.";
     if(voiceOn&&aliveRef.current){const played=await playVoice(answer);if(!played)setError("I couldn't play the voice audio. Check your phone media volume.");setStatus("Connected");if(played)beginListening();} else setStatus("Connected");
    }catch{const answer="I'm having trouble connecting right now, but I'm still here with you.";if(voiceOn){const played=await playVoice(answer);setStatus("Connected");if(played)beginListening();}else setStatus("Connected");}
   };
   recognition.onend=()=>setListening(false); recognition.onerror=()=>setListening(false); recognition.start();
  }catch{setListening(false)}
 }

 async function startVoice(){
  if(startingVoiceRef.current||voiceOn)return;
  startingVoiceRef.current=true;setError("");setVoiceOn(true);setStatus("Connecting voice…");
  const played=await playVoice(`Hi, I'm ${name}. I'm here with you. You can talk to me naturally. What's on your mind?`);
  startingVoiceRef.current=false;
  if(!played){setVoiceOn(false);setStatus("Connected");setError("No voice audio played. Please turn up your phone's media volume and tap Start voice again.");return;}
  if(aliveRef.current){setStatus("Connected");beginListening();}
 }

 useEffect(()=>{aliveRef.current=true;const start=async()=>{try{const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:type==="video"});if(!aliveRef.current)return;streamRef.current=stream;if(videoRef.current&&type==="video"){videoRef.current.srcObject=stream;await videoRef.current.play().catch(()=>{})}setStatus("Connected");}catch(e){console.error(e);setError("Microphone/camera permission is needed to start the call.");setStatus("Call not started");}};start();return()=>{aliveRef.current=false;recognitionRef.current?.stop();streamRef.current?.getTracks().forEach(t=>t.stop());if(audioRef.current){audioRef.current.pause();audioRef.current.src=""}}},[type]);
 useEffect(()=>{if(status!=="Connected"&&status!=="Thinking…")return;const id=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(id)},[status]);
 function toggleMute(){const next=!muted;streamRef.current?.getAudioTracks().forEach(t=>t.enabled=!next);setMuted(next)}
 function toggleCamera(){if(type!=="video")return;const next=!camera;streamRef.current?.getVideoTracks().forEach(t=>t.enabled=next);setCamera(next)}
 function end(){recognitionRef.current?.stop();streamRef.current?.getTracks().forEach(t=>t.stop());if(audioRef.current){audioRef.current.pause();audioRef.current.src=""}window.location.href="/messages"}
 const mins=String(Math.floor(seconds/60)).padStart(2,"0"),secs=String(seconds%60).padStart(2,"0");
 return <main style={{minHeight:"100vh",background:"radial-gradient(circle at top,#24102f,#07070a 55%)",color:"white",fontFamily:"Arial,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><section style={{width:"100%",maxWidth:520,background:"#111116",border:"1px solid #3b3042",borderRadius:28,overflow:"hidden",boxShadow:"0 25px 80px #0009"}}>
  <header style={{padding:"18px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #302938"}}><a href="/messages" style={{color:"#ddd",textDecoration:"none",fontSize:25}}>‹</a><div style={{textAlign:"center"}}><div style={{fontWeight:900}}>{type==="video"?"🎥 Video call":"📞 Voice call"}</div><div style={{fontSize:12,color:"#22c55e",marginTop:4}}>● {status} {status==="Connected"?`• ${mins}:${secs}`:""}</div></div><div style={{width:25}}/></header>
  <div style={{minHeight:520,display:"grid",placeItems:"center",padding:20,position:"relative",background:"linear-gradient(180deg,#160d1d,#08080b)"}}>
   {type==="video"?<video ref={videoRef} muted playsInline style={{width:"100%",maxHeight:520,objectFit:"cover",borderRadius:20,background:"#050505"}}/>:<div style={{width:150,height:150,borderRadius:"50%",display:"grid",placeItems:"center",background:"linear-gradient(135deg,#7c3aed,#ec4899)",fontSize:58,fontWeight:900,boxShadow:voiceOn?"0 0 100px #c026f388":"0 0 80px #a855f766"}}>{name.charAt(0).toUpperCase()}</div>}
   <div style={{position:"absolute",bottom:30,left:0,right:0,textAlign:"center"}}><div style={{fontSize:24,fontWeight:900}}>{name}</div><div style={{color:"#a1a1aa",marginTop:6}}>{error|| (listening?"🎙️ Listening…":voiceOn?"🔊 Voice is on — talk naturally":"Tap Start voice to hear your Gee 💜")}</div>
   {type==="voice"&&!voiceOn&&status==="Connected"&&<button onClick={startVoice} style={{marginTop:18,padding:"13px 22px",borderRadius:999,border:"1px solid #c084fc",background:"linear-gradient(135deg,#7c3aed,#c026d3)",color:"white",fontWeight:800,fontSize:16}}>🔊 Start voice</button>}</div>
  </div>
  <div style={{display:"flex",justifyContent:"center",gap:14,padding:20,borderTop:"1px solid #302938",flexWrap:"wrap"}}>{type==="voice"&&!voiceOn&&<button onClick={startVoice} style={{...control,width:"auto",padding:"0 22px",borderRadius:999,background:"linear-gradient(135deg,#7c3aed,#c026d3)",borderColor:"#c084fc",fontWeight:800}}>🔊 Start voice</button>}<button onClick={toggleMute} style={control}>{muted?"🔇":"🎙️"}</button>{type==="video"&&<button onClick={toggleCamera} style={control}>{camera?"📷":"🚫"}</button>}<button onClick={end} style={{...control,background:"#b91c1c",borderColor:"#ef4444"}}>☎</button></div>
  <div style={{padding:"0 20px 20px",textAlign:"center",fontSize:11,color:"#71717a"}}>My Gee now uses server-generated AI speech instead of relying on the phone's browser speech engine.</div>
 </section></main>
}
const control={width:56,height:56,borderRadius:"50%",border:"1px solid #554361",background:"#241a2b",color:"white",fontSize:21,cursor:"pointer"};