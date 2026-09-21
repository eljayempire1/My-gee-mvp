"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();

    if (!email) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/chat`
            : undefined
      }
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Check your email. We've sent you a secure My Gee sign-in link."
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#09090b",
        color: "white",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          background: "#121216",
          border: "1px solid #2a2a30",
          borderRadius: 20,
          padding: 28
        }}
      >
        <div
          style={{
            color: "#c084fc",
            fontWeight: 800,
            letterSpacing: 2
          }}
        >
          MY GEE
        </div>

        <h1 style={{ fontSize: 36, marginBottom: 10 }}>
          Welcome back
        </h1>

        <p style={{ color: "#a1a1aa", lineHeight: 1.5 }}>
          Enter your email and we'll send you a secure sign-in link.
        </p>

        <form
          onSubmit={signIn}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: 24
          }}
        >
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{
              background: "#09090b",
              color: "white",
              border: "1px solid #303038",
              borderRadius: 12,
              padding: 14,
              outline: "none"
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#9333ea",
              color: "white",
              border: 0,
              borderRadius: 12,
              padding: 14,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {loading ? "Sending..." : "Send sign-in link"}
          </button>
        </form>

        {message && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              background: "#1b1224",
              border: "1px solid #4c1d6d",
              borderRadius: 12,
              color: "#d8b4fe",
              lineHeight: 1.4
            }}
          >
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
