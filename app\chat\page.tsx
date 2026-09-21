"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey, I'm your Gee. 💜 What's on your mind today?"
    }
  ]);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendMessage() {
    if (!text.trim() || busy) return;

    const message = text.trim();

    setText("");

    const updatedMessages = [
      ...messages,
      {
        role: "user" as const,
        content: message
      }
    ];

    setMessages(updatedMessages);
    setBusy(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: updatedMessages
        })
      });

      const data = await response.json();

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content:
            data.reply ||
            "I'm here with you. Tell me what's going on."
        }
      ]);
    } catch {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting right now. Please try again."
        }
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#09090b",
        color: "white",
        fontFamily: "Arial, sans-serif",
        padding: "24px"
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          minHeight: "90vh",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: "1px solid #27272a",
            paddingBottom: 18
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg,#a855f7,#ec4899)",
              fontWeight: 900
            }}
          >
            G
          </div>

          <div>
            <h2 style={{ margin: 0 }}>My Gee</h2>
            <span style={{ color: "#a1a1aa" }}>
              Your AI companion
            </span>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            padding: "25px 0",
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                alignSelf:
                  message.role === "user"
                    ? "flex-end"
                    : "flex-start",
                maxWidth: "80%",
                padding: "13px 16px",
                borderRadius: 18,
                background:
                  message.role === "user"
                    ? "#9333ea"
                    : "#18181b",
                border:
                  message.role === "assistant"
                    ? "1px solid #303038"
                    : "none",
                lineHeight: 1.5
              }}
            >
              {message.content}
            </div>
          ))}

          {busy && (
            <div
              style={{
                alignSelf: "flex-start",
                color: "#a1a1aa"
              }}
            >
              Gee is thinking…
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            borderTop: "1px solid #27272a",
            paddingTop: 15
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Talk to your Gee..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            style={{
              flex: 1,
              minHeight: 52,
              resize: "none",
              background: "#111113",
              color: "white",
              border: "1px solid #303038",
              borderRadius: 12,
              padding: 14
            }}
          />

          <button
            onClick={sendMessage}
            disabled={busy}
            style={{
              border: 0,
              borderRadius: 12,
              padding: "0 20px",
              background: "#9333ea",
              color: "white",
              fontWeight: 700
            }}
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
