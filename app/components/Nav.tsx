"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const items = [
  ["Gee AI", "/chat"],
  ["Discover", "/discover"],
  ["Messages", "/messages"],
  ["Connections", "/connections"],
  ["Profile", "/profile"],
] as const;

export default function Nav() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const matches = query.trim() ? items.filter(([label]) => label.toLowerCase().includes(query.trim().toLowerCase())) : items;

  return <nav style={{position:"sticky",top:0,zIndex:50,backdropFilter:"blur(20px)",background:"rgba(9,9,11,.94)",borderBottom:"1px solid #2a2330"}}>
    <div style={{maxWidth:1180,margin:"0 auto",padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
      <Link href="/" style={{color:"white",textDecoration:"none",fontWeight:900,letterSpacing:1,marginRight:4,whiteSpace:"nowrap",fontSize:15}}><span style={{color:"#d946ef",fontSize:19}}>♥</span> MY GEE</Link>
      <div style={{display:"flex",alignItems:"center",gap:5,flex:1,overflowX:"auto",scrollbarWidth:"none"}}>
        {items.map(([label,href])=><Link key={href} href={href} style={{color:pathname===href?"#f0abfc":"#b4b0ba",textDecoration:"none",fontSize:13,fontWeight:750,whiteSpace:"nowrap",padding:"8px 9px",borderRadius:10,background:pathname===href?"#2a1232":"transparent"}}>{label}</Link>)}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,position:"relative",flexShrink:0}}>
        {searchOpen && <div style={{position:"absolute",right:88,top:50,width:210,padding:8,background:"#151118",border:"1px solid #4b3155",borderRadius:14,boxShadow:"0 15px 45px #0009"}}>
          <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search My Gee..." style={{width:"100%",boxSizing:"border-box",background:"#0c0b0e",color:"white",border:"1px solid #3a303e",borderRadius:10,padding:"10px 11px",outline:"none"}} />
          {query && matches.length>0 && <div style={{paddingTop:6}}>{matches.map(([label,href])=><Link key={href} href={href} onClick={()=>setSearchOpen(false)} style={{display:"block",padding:"8px 9px",color:"#f5d0fe",textDecoration:"none",borderRadius:8}}>{label}</Link>)}</div>}
          {query && matches.length===0 && <div style={{padding:"9px",color:"#8f8995",fontSize:12}}>No matches yet.</div>}
        </div>}
        <button aria-label="Search" onClick={()=>setSearchOpen(v=>!v)} style={navButton}>{searchOpen?"✕":"⌕"}</button>
        <Link href="/settings" aria-label="Settings" title="Settings" style={{...navButton,textDecoration:"none",display:"grid",placeItems:"center"}}>⚙</Link>
      </div>
    </div>
  </nav>;
}

const navButton={width:38,height:38,borderRadius:11,border:"1px solid #45364b",background:"#17121a",color:"#f0d9f7",cursor:"pointer",fontSize:19};
