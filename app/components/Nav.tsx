"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["Home", "/"],
  ["Gee AI", "/chat"],
  ["Discover", "/discover"],
  ["Messages", "/messages"],
  ["Connections", "/connections"],
  ["Profile", "/profile"],
] as const;

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(18px)", background: "rgba(9,9,11,.86)", borderBottom: "1px solid #24242a" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "12px 18px", display: "flex", alignItems: "center", gap: 14, overflowX: "auto" }}>
        <Link href="/" style={{ color: "white", textDecoration: "none", fontWeight: 900, letterSpacing: 1, marginRight: 8, whiteSpace: "nowrap" }}>
          <span style={{ color: "#c026d3" }}>♥</span> MY GEE
        </Link>
        {items.slice(1).map(([label, href]) => (
          <Link key={href} href={href} style={{ color: pathname === href ? "#e879f9" : "#a1a1aa", textDecoration: "none", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
