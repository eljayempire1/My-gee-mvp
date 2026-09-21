"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../components/Nav";

type Person = { id: string; display_name: string | null; city: string | null; bio: string | null; interests: string[] };
const demoPeople: Person[] = [
  { id:"demo-emma", display_name:"Emma", city:"London, UK", bio:"Music, travel and finding good food. Always happy to meet genuine people.", interests:["Music","Travel","Food"] },
  { id:"demo-david", display_name:"David", city:"London, UK", bio:"Tech, business and fitness. Looking for positive conversations.", interests:["Technology","Business","Fitness"] },
  { id:"demo-sarah", display_name:"Sarah", city:"London, UK", bio:"Creative, curious and always planning the next adventure.", interests:["Travel","Art","Business"] },
];

export default function Discover() {
  const [people, setPeople] = useState<Person[]>([]);
  const [message, setMessage] = useState("Loading people...");
  useEffect(() => { loadPeople(); }, []);
  async function loadPeople() {
    const { data, error } = await supabase.rpc("discover_people", { limit_count: 20 });
    if (error || !data?.length) { setPeople(demoPeople); setMessage(""); return; }
    setPeople(data); setMessage("");
  }
  async function connect(personId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || personId.startsWith("demo-")) { alert("Sign in to send a real connection request. 💜"); return; }
    const { error } = await supabase.from("connections").insert({ requester_id: user.id, recipient_id: personId });
    alert(error ? error.message : "Connection request sent! 💜");
  }
  return <><Nav /><main style={{ minHeight:"100vh",padding:"34px 18px",fontFamily:"Arial,sans-serif" }}><div style={{maxWidth:1000,margin:"0 auto"}}><div style={{color:"#e879f9",fontWeight:800,letterSpacing:2}}>DISCOVER</div><h1 style={{fontSize:"clamp(40px,7vw,60px)",margin:"15px 0"}}>Find your people.</h1><p style={{color:"#a1a1aa",fontSize:18,lineHeight:1.5}}>Discover people based on shared interests and send a connection request.</p>{message&&<div style={{marginTop:30,padding:18,background:"#18181b",border:"1px solid #303038",borderRadius:15,color:"#a1a1aa"}}>{message}</div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:16,marginTop:30}}>{people.map(person=><div key={person.id} style={{background:"#121216",border:"1px solid #2a2a30",borderRadius:20,padding:22}}><div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:52,height:52,borderRadius:"50%",display:"grid",placeItems:"center",background:"linear-gradient(135deg,#a855f7,#ec4899)",fontWeight:900}}>{(person.display_name||"G").charAt(0).toUpperCase()}</div><div><h3 style={{margin:0}}>{person.display_name||"Gee member"}</h3><span style={{color:"#a1a1aa"}}>{person.city||"UK"}</span></div></div><p style={{color:"#a1a1aa",lineHeight:1.5}}>{person.bio||"Open to making a new connection."}</p><div>{(person.interests||[]).map(i=><span key={i} style={{display:"inline-block",padding:"6px 10px",margin:3,borderRadius:999,background:"#241331",color:"#d8b4fe",fontSize:12}}>{i}</span>)}</div><button onClick={()=>connect(person.id)} style={{width:"100%",marginTop:16,background:"#9333ea",color:"white",border:0,borderRadius:12,padding:13,fontWeight:700}}>Connect</button></div>)}</div>
  </div></main></>;
}
