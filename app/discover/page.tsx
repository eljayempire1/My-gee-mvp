"use client";
import { useEffect,useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../components/Nav";

type Person={id:string;display_name:string|null;city:string|null;bio:string|null;interests:string[]};
const demoPeople:Person[]=[
 {id:"demo-emma",display_name:"Emma",city:"London, UK",bio:"Music, travel and finding good food. Always happy to meet genuine people.",interests:["Music","Travel","Food"]},
 {id:"demo-sarah",display_name:"Sarah",city:"London, UK",bio:"Creative, curious and always planning the next adventure.",interests:["Travel","Art","Business"]},
 {id:"demo-olivia",display_name:"Olivia",city:"London, UK",bio:"Coffee, books and good conversations. Always up for discovering somewhere new.",interests:["Books","Coffee","Travel"]},
 {id:"demo-sophia",display_name:"Sophia",city:"London, UK",bio:"Love fitness, fashion and trying new restaurants with positive people.",interests:["Fitness","Fashion","Food"]},
 {id:"demo-david",display_name:"David",city:"London, UK",bio:"Tech, business and fitness. Looking for positive conversations.",interests:["Technology","Business","Fitness"]},
 {id:"demo-james",display_name:"James",city:"London, UK",bio:"Football, music and exploring London. Always happy to meet genuine people.",interests:["Football","Music","Travel"]},
 {id:"demo-elijah",display_name:"Elijah OBONOGWU",city:"London, UK",bio:"Entrepreneurial, relaxed and into great food, music and good vibes.",interests:["Business","Music","Food"]},
 {id:"demo-daniel",display_name:"Daniel",city:"London, UK",bio:"Fitness, technology and weekend adventures. Here for genuine connections.",interests:["Fitness","Technology","Travel"]}
];

function normalizePeople(rows:Person[]){
  return rows.map(p=>{
    const name=(p.display_name||"").trim().toLowerCase();
    if(name==="michael"||name==="micheal") return {...p,display_name:"Elijah OBONOGWU",bio:p.bio||"Entrepreneurial, relaxed and into great food, music and good vibes.",interests:p.interests?.length?p.interests:["Business","Music","Food"]};
    return p;
  });
}

export default function Discover(){
 const [people,setPeople]=useState<Person[]>([]); const [message,setMessage]=useState("Loading people..."); const [notice,setNotice]=useState(""); const [connecting,setConnecting]=useState(""); const [connected,setConnected]=useState<string[]>([]);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem("gee-demo-connections")||"[]");if(Array.isArray(saved))setConnected(saved)}catch{} loadPeople()},[]);
 async function loadPeople(){const {data,error}=await supabase.rpc("discover_people",{limit_count:20});if(error||!data?.length){setPeople(demoPeople);setMessage("");return}setPeople(normalizePeople(data));setMessage("")}
 async function connect(person:Person){if(connecting)return;setConnecting(person.id);const {data:{user}}=await supabase.auth.getUser();if(!user){setNotice("Please sign in to send a connection request. 💜");setConnecting("");return}
  if(person.id.startsWith("demo-")){const next=connected.includes(person.id)?connected:[...connected,person.id];setConnected(next);localStorage.setItem("gee-demo-connections",JSON.stringify(next));setNotice(`You are connected with ${person.display_name||"this person"}! 💜`);setConnecting("");setTimeout(()=>setNotice(""),2500);return}
  const {error}=await supabase.from("connections").insert({requester_id:user.id,recipient_id:person.id});if(error){setNotice(error.message)}else{setConnected(prev=>prev.includes(person.id)?prev:[...prev,person.id]);setNotice("Connection request sent! 💜")}setConnecting("");setTimeout(()=>setNotice(""),2500)
 }
 return <><Nav/><main style={{minHeight:"100vh",padding:"30px 18px",fontFamily:"Arial,sans-serif"}}><div style={{maxWidth:1000,margin:"0 auto"}}><div style={{color:"#e879f9",fontWeight:800,letterSpacing:2}}>DISCOVER</div><h1 style={{fontSize:"clamp(38px,7vw,58px)",margin:"12px 0"}}>Find your people 💜</h1><p style={{color:"#a1a1aa",fontSize:18}}>Discover people, friendships and genuine connections.</p>{message&&<div style={{marginTop:25,padding:18,background:"#18181b",border:"1px solid #303038",borderRadius:15,color:"#a1a1aa"}}>{message}</div>}{notice&&<div style={{marginTop:15,padding:13,borderRadius:12,background:"#241331",color:"#f0abfc"}}>{notice}</div>}<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:18,marginTop:28}}>{people.map(p=><div key={p.id} style={{background:"linear-gradient(145deg,#18111f,#111114)",border:"1px solid #342c3b",borderRadius:22,padding:22}}><div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:58,height:58,borderRadius:"50%",display:"grid",placeItems:"center",background:"linear-gradient(135deg,#a855f7,#ec4899)",fontSize:22,fontWeight:900}}>{(p.display_name||"G").charAt(0).toUpperCase()}</div><div><h3 style={{margin:0,fontSize:20}}>{p.display_name||"Gee member"}</h3><span style={{color:"#a1a1aa"}}>📍 {p.city||"UK"}</span></div></div><p style={{color:"#d4d4d8",lineHeight:1.55}}>{p.bio||"Open to making a new connection."}</p><div>{(p.interests||[]).map(i=><span key={i} style={{display:"inline-block",padding:"7px 10px",margin:3,borderRadius:999,background:"#241331",color:"#d8b4fe",fontSize:12}}>{i}</span>)}</div><div style={{display:"flex",gap:8,marginTop:16}}><button type="button" onClick={()=>connect(p)} disabled={connecting===p.id||connected.includes(p.id)} style={{flex:1,background:"linear-gradient(135deg,#7c3aed,#c026d3)",color:"white",border:0,borderRadius:12,padding:13,fontWeight:800,opacity:(connecting===p.id||connected.includes(p.id))?.7:1,cursor:"pointer"}}>{connected.includes(p.id)?"💜 Connected":connecting===p.id?"Sending...":"💜 Connect"}</button><button type="button" onClick={()=>setNotice("⭐ Super connection selected")} style={{width:52,background:"#17131d",color:"#f0abfc",border:"1px solid #4a4050",borderRadius:12,fontSize:20,cursor:"pointer"}}>⭐</button></div></div>)}</div></div></main></>
}
