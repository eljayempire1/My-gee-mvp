import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      text?: string;
      voice?: string;
      companionName?: string;
      gender?: "male" | "female";
    };

    const cleanText = body.text?.trim();
    const companionName = body.companionName?.trim() || "My Gee";
    const name = companionName.toLowerCase();
    const gender = body.gender || (name.startsWith("elijah") ? "male" : name.startsWith("emma") ? "female" : "female");
    const voice = gender === "male" ? "onyx" : "nova";
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
    if (!cleanText) return NextResponse.json({ error: "Text is required" }, { status: 400 });

    const instructions = gender === "male"
      ? `Natural, warm masculine voice for ${companionName}. Friendly, relaxed, conversational and steady. Use a clear Nigerian-English/Pidgin rhythm when appropriate. Keep a consistent masculine voice. Do not sound robotic, exaggerated, breathy or feminine.`
      : `Natural, warm feminine voice for ${companionName}. Friendly, relaxed, conversational and steady. Keep a consistent feminine voice. Do not sound robotic, exaggerated or masculine.`;

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice,
        input: cleanText.slice(0, 1800),
        response_format: "mp3",
        instructions,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("TTS error:", response.status, detail);
      return NextResponse.json({ error: "Voice generation failed" }, { status: 502 });
    }

    const audio = await response.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("TTS route error:", error);
    return NextResponse.json({ error: "Voice generation failed" }, { status: 500 });
  }
}
