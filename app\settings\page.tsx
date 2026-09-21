"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Settings() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [message, setMessage] = useState("");

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please sign in first.");
      return;
    }

    const interestList = interests
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name,
        city,
        bio,
        interests: interestList,
        onboarding_complete: true
      })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Your Gee profile has been saved! 💜");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#09090b",
        color: "white",
        padding: 24,
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: 650,
          margin: "40px auto",
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
          YOUR PROFILE
        </div>

        <h1>Make your Gee yours</h1>

        <p style={{ color: "#a1a1aa" }}>
          Tell people a little about yourself and what you enjoy.
        </p>

        <form
          onSubmit={saveProfile}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            marginTop: 24
          }}
        >
          <input
            placeholder="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            style={inputStyle}
          />

          <textarea
            placeholder="Tell us about yourself"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={{
              ...inputStyle,
              minHeight: 120,
              resize: "vertical"
            }}
          />

          <input
            placeholder="Interests — e.g. football, music, business"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            style={inputStyle}
          />

          <button
            type="submit"
            style={{
              background: "#9333ea",
              color: "white",
              border: 0,
              borderRadius: 12,
              padding: 15,
              fontWeight: 700
            }}
          >
            Save profile
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
              color: "#d8b4fe"
            }}
          >
            {message}
          </div>
        )}
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  background: "#09090b",
  color: "white",
  border: "1px solid #303038",
  borderRadius: 12,
  padding: 14,
  outline: "none"
};
