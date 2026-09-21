import Link from "next/link";

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#09090b",
      color: "white",
      padding: "60px 24px",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{
        maxWidth: 900,
        margin: "0 auto",
        textAlign: "center"
      }}>
        <div style={{
          color: "#c084fc",
          fontWeight: 800,
          letterSpacing: 2
        }}>
          MY GEE
        </div>

        <h1 style={{
          fontSize: "clamp(44px, 8vw, 76px)",
          lineHeight: 1,
          margin: "20px 0"
        }}>
          You don't have to face today alone.
        </h1>

        <p style={{
          color: "#a1a1aa",
          fontSize: 19,
          lineHeight: 1.6,
          maxWidth: 650,
          margin: "0 auto 30px"
        }}>
          My Gee gives you an AI companion to talk to and a safe space
          to discover real people with shared interests.
        </p>

        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap"
        }}>
          <Link
            href="/chat"
            style={{
              background: "#9333ea",
              color: "white",
              padding: "14px 22px",
              borderRadius: 12,
              textDecoration: "none",
              fontWeight: 700
            }}
          >
            Talk to My Gee
          </Link>

          <Link
            href="/discover"
            style={{
              background: "#18181b",
              color: "white",
              padding: "14px 22px",
              borderRadius: 12,
              textDecoration: "none",
              border: "1px solid #303038"
            }}
          >
            Meet people
          </Link>
        </div>
      </div>
    </main>
  );
}
