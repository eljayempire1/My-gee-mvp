import Link from "next/link";
import Nav from "./components/Nav";

export default function Home() {
  return <><Nav /><main style={{ minHeight: "calc(100vh - 55px)", padding: "60px 18px", fontFamily: "Arial, sans-serif", background: "radial-gradient(circle at 50% 0%,#24102f 0%,#09090b 48%)" }}>
    <div style={{ maxWidth: 1050, margin: "0 auto", textAlign: "center" }}>
      <div style={{ color: "#e879f9", fontWeight: 900, letterSpacing: 3 }}>MY GEE</div>
      <h1 style={{ fontSize: "clamp(48px, 9vw, 86px)", lineHeight: .98, margin: "22px auto", maxWidth: 900 }}>You don&apos;t have to face today alone.</h1>
      <p style={{ color: "#a1a1aa", fontSize: 20, lineHeight: 1.65, maxWidth: 700, margin: "0 auto 30px" }}>An AI companion to talk to, plus a safer way to discover real people with shared interests and build genuine connections.</p>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}><Link href="/chat" style={button}>Talk to My Gee →</Link><Link href="/discover" style={secondary}>Meet people</Link></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginTop: 65, textAlign: "left" }}>
        {[['🤖','24/7 AI companion','Talk, reflect, plan and laugh with your Gee.'],['👥','Real connections','Discover people around shared interests.'],['🛡️','Safety first','Privacy controls, blocking and reporting are built in.'],['💜','A kinder world','A space designed around conversation and belonging.']].map(([icon,title,body]) => <div key={title} style={{ padding: 20, border: "1px solid #2c2630", borderRadius: 20, background: "rgba(18,18,22,.8)" }}><div style={{ fontSize: 25 }}>{icon}</div><h3>{title}</h3><p style={{ color: "#a1a1aa", lineHeight: 1.5 }}>{body}</p></div>)}
      </div>
    </div>
  </main></>;
}

const button: React.CSSProperties = { background: "linear-gradient(90deg,#7c3aed,#c026d3)", color: "white", padding: "15px 24px", borderRadius: 13, textDecoration: "none", fontWeight: 800 };
const secondary: React.CSSProperties = { background: "#121216", color: "white", padding: "15px 24px", borderRadius: 13, textDecoration: "none", border: "1px solid #44404a", fontWeight: 700 };
