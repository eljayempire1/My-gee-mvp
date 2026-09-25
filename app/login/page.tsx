"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "../components/Nav";
import { supabase } from "../../lib/supabase";

const APP_URL = "https://my-gee-mvp.vercel.app";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMessage("");
    try {
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${APP_URL}/login` } });
      if (result.error) throw result.error;
      if (mode === "signin") router.push("/profile");
      else setMessage("Account created. Check your email to confirm your address. 💜");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sign-in is not available right now. You can still enter My Gee in demo mode below.");
    } finally { setLoading(false); }
  }

  function continueDemo() {
    localStorage.setItem("gee-demo-session", JSON.stringify({ id: "demo-user", email: email || "guest@mygee.app", name: "Eljay" }));
    router.push("/connections");
  }

  return <><Nav /><main style={{minHeight:"calc(100vh - 55px)",display:"grid",placeItems:"center",padding:24,fontFamily:"Arial,sans-serif"}}>
    <div style={{width:"100%",maxWidth:430,padding:28,border:"1px solid #303038",borderRadius:24,background:"#121216"}}>
      <div style={{color:"#e879f9",fontWeight:900,letterSpacing:2}}>MY GEE</div>
      <h1 style={{margin:"12px 0 8px"}}>{mode === "signin" ? "Welcome back" : "Join My Gee"}</h1>
      <p style={{color:"#a1a1aa",lineHeight:1.5}}>Talk to your Gee and build genuine connections.</p>
      <form onSubmit={submit}>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email" required autoComplete="email" style={input}/>
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" required autoComplete={mode === "signin" ? "current-password" : "new-password"} style={input}/>
        <button disabled={loading} style={button}>{loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
      </form>
      {message && <div style={{marginTop:14,padding:12,borderRadius:12,background:"#1b1520",color:"#e9d5ff",lineHeight:1.45}}>{message}</div>}
      <button type="button" onClick={continueDemo} style={demoButton}>Continue in demo mode 💜</button>
      <button type="button" onClick={()=>{setMode(mode === "signin" ? "signup" : "signin");setMessage("")}} style={switcher}>{mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
    </div>
  </main></>;
}

const input: React.CSSProperties = {width:"100%",boxSizing:"border-box",marginTop:12,padding:14,borderRadius:12,border:"1px solid #3b3b43",background:"#0d0d0f",color:"white",fontSize:16};
const button: React.CSSProperties = {width:"100%",marginTop:16,padding:14,border:0,borderRadius:12,background:"linear-gradient(90deg,#7c3aed,#c026d3)",color:"white",fontWeight:800,fontSize:16};
const demoButton: React.CSSProperties = {width:"100%",marginTop:10,padding:14,border:"1px solid #6d3b86",borderRadius:12,background:"#24152d",color:"#f5d0fe",fontWeight:800,fontSize:15};
const switcher: React.CSSProperties = {width:"100%",marginTop:16,padding:10,border:0,background:"transparent",color:"#d8b4fe",fontWeight:700};
