"use client";
import { useEffect,useRef,useState } from "react";
import { useSearchParams } from "next/navigation";

export default function CallPage(){
 const params=useSearchParams(); const type=params.get("type")==="video"?"video":"voice"; const name=params.get("name")||"Gee friend";
 const videoRef=useRef<HTMLVideoElement>(null); const streamRef=useRef<MediaStream|null>(null); const [status,setStatus]=useState("Starting call…"); const [seconds,setSeconds]=useState(0); const [muted,setMuted]=useState(false); const [camera,setCamera]=useState(type==="video"); const [error,setError]=useState("");
 useEffect(()=>{let alive=true; const start=async()=>{try{const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:type==="video"});if(!alive)return;streamRef.current=stream;if(videoRef.current&&type==="video"){videoRef.current.srcObject=stream;await videoRef.current.play().catch(()=>{})}setStatus("Connected");}catch(e){console.error(e);setError("Microphone/camera permission is needed to start the call.");setStatus("Call not started");}};start();return()=>{alive=false;streamRef.current?.getTracks().forEach(t=>t.stop())}},[type]);
 useEffect(()=>{if(status!=="Connected")return;const id=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(id)},[status]);
 function toggleMute(){const next=!muted;streamRef.current?.getAudioTracks().forEach(t=>t.enabled=!next);setMuted(next)}
 function toggleCamera(){if(type!=="video")return;const next=!camera;streamRef.current?.getVideoTracks().forEach(t=>t.enabled=next);setCamera(next)}
 function end(){streamRef.current?.getTracks().forEach(t=>t.stop());window.location.href="/messages"}
 const mins=String(Math.floor(seconds/60)).padStart(2,"0"),secs=String(seconds%60).padStart(2,"0");
 return <main style={{minHeight:"100vh",background:"radial-gradient(circle at top,#24102f,#07070a 55%)",color:"white",fontFamily:"Arial,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><section style={{width:"100%",maxWidth:520,background:"#111116",border:"1px solid #3b3042",borderRadius:28,overflow:"hidden",boxShadow:"0 25px 80px #0009"}}>
  <header style={{padding:"18px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #302938"}}><a href="/messages" style={{color:"#ddd",textDecoration:"none",fontSize:25}}>‹</a><div style={{textAlign:"center"}}><div style={{fontWeight:900}}>{type==="video"?"🎥 Video call":"📞 Voice call"}</div><div style={{fontSize:12,color:"#22c55e",marginTop:4}}>● {status} {status==="Connected"?`• ${mins}:${secs}`:""}</div></div><div style={{width:25}}/></header>
  <div style={{minHeight:520,display:"grid",placeItems:"center",padding:20,position:"relative",background:"linear-gradient(180deg,#160d1d,#08080b)"}}>
   {type==="video"?<video ref={videoRef} muted playsInline style={{width:"100%",maxHeight:520,objectFit:"cover",borderRadius:20,background:"#050505"}}/>:<div style={{width:150,height:150,borderRadius:"50%",display:"grid",placeItems:"center",background:"linear-gradient(135deg,#7c3aed,#ec4899)",fontSize:58,fontWeight:900,boxShadow:"0 0 80px #a855f766"}}>{name.charAt(0).toUpperCase()}</div>}
   <div style={{position:"absolute",bottom:35,left:0,right:0,textAlign:"center"}}><div style={{fontSize:24,fontWeight:900}}>{name}</div><div style={{color:"#a1a1aa",marginTop:6}}>{error|| (status==="Connected"?"You're connected to the GEE call screen 💜":"Please allow access when asked")}</div></div>
  </div>
  <div style={{display:"flex",justifyContent:"center",gap:14,padding:20,borderTop:"1px solid #302938"}}><button onClick={toggleMute} style={control}>{muted?"🔇":"🎙️"}</button>{type==="video"&&<button onClick={toggleCamera} style={control}>{camera?"📷":"🚫"}</button>}<button onClick={end} style={{...control,background:"#b91c1c",borderColor:"#ef4444"}}>☎</button></div>
  <div style={{padding:"0 20px 20px",textAlign:"center",fontSize:11,color:"#71717a"}}>GEE MVP call screen. Live person-to-person calling needs a signaling service/WebRTC connection between two devices.</div>
 </section></main>
}
const control={width:56,height:56,borderRadius:"50%",border:"1px solid #554361",background:"#241a2b",color:"white",fontSize:21,cursor:"pointer"};