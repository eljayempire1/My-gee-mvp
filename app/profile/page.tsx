"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import Nav from "../components/Nav";

export default function Profile() {
  const [name, setName] = useState("Eljay");
  const [bio, setBio] = useState("Open to genuine conversations, new connections and positive vibes. 💜");
  const [city, setCity] = useState("London, UK");
  const [saved, setSaved] = useState(false);
  const interests = ["Business", "Music", "Travel", "Food", "Fitness", "Technology"];
  return <><Nav /><main style={{ minHeight: "100vh", padding: "34px 18px", fontFamily: "Arial, sans-serif" }}><div style={{ maxWidth: 760, margin: "0 auto" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 20 }}><div><div style={{ color: "#e879f9", fontWeight: 800, letterSpacing: 2 }}>MY PROFILE</div><h1 style={{ fontSize: 46, margin: "12px 0 4px" }}>{name}</h1><p style={{ color: "#a1a1aa", marginTop: 0 }}>{city}</p></div><Link href="/settings" style={{ color: "white", textDecoration: "none", border: "1px solid #38383f", padding: "10px 14px", borderRadius: 12 }}>Settings</Link></div>
    <section style={{ marginTop: 24, padding: 22, background: "linear-gradient(145deg,#18111f,#101014)", border: "1px solid #34303b", borderRadius: 24 }}><div style={{ width: 96, height: 96, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#a855f7,#ec4899)", fontSize: 38, fontWeight: 900, marginBottom: 20 }}>{name.charAt(0).toUpperCase()}</div>
      <label style={label}>Name</label><input value={name} onChange={e=>setName(e.target.value)} style={inputStyle}/><label style={label}>City</label><input value={city} onChange={e=>setCity(e.target.value)} style={inputStyle}/><label style={label}>About you</label><textarea value={bio} onChange={e=>setBio(e.target.value)} rows={4} style={{...inputStyle,resize:"vertical"}}/>
      <h3 style={{ margin: "20px 0 10px" }}>Interests</h3><div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>{interests.map(i=><span key={i} style={{padding:"8px 12px",borderRadius:999,background:"#27132e",color:"#f0abfc",fontSize:13}}>{i}</span>)}</div>
      <button onClick={()=>{setSaved(true);setTimeout(()=>setSaved(false),1800)}} style={{marginTop:22,width:"100%",padding:14,border:0,borderRadius:13,background:"linear-gradient(90deg,#7c3aed,#c026d3)",color:"white",fontWeight:800}}>{saved?"Saved ✓":"Save profile"}</button>
    </section></div></main></>;
}

const label: CSSProperties = { display:"block", color:"#a1a1aa", margin:"16px 0 7px" };
const inputStyle: CSSProperties = { width:"100%",boxSizing:"border-box",background:"#0d0d10",color:"white",border:"1px solid #34343c",borderRadius:12,padding:13,fontSize:15,outline:"none" };
