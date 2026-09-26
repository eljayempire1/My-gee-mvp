import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string; companionName?: string; gender?: "male" | "female" };
    const text = body.text?.trim();
    const companionName = body.companionName?.trim() || "My Gee";
    const key = companionName.toLowerCase();
    const gender = key.startsWith("elijah") ? "male" : key.startsWith("emma") ? "female" : (body.gender === "female" ? "female" : "male");
    // Server-side mapping: the browser/device never selects the voice.
    // Onyx is the selected male voice; Nova is the selected female voice.
    const voice = gender === "male" ? "onyx" : "nova";

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
    if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });

    const instructions = gender === "male"
      ? `Speak as ${companionName}, a natural adult male companion. Warm, grounded, relaxed, confident and conversational. Clear modern Standard English. Natural contemporary Black conversational character without imitation or caricature. No Nigerian Pidgin, broken English, exaggerated slang, or feminine delivery. Use natural emotional variation, pauses and intonation that fit the meaning.`
      : `Speak as ${companionName}, a natural adult female companion. Warm, grounded, relaxed, confident and conversational. Clear modern Standard English. No broken English or exaggerated slang. Use natural emotional variation, pauses and intonation that fit the meaning.`;

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, input: text.slice(0, 1800), response_format: "mp3", instructions, speed: 1.0 }),
    });

    if (!response.ok) {
      console.error("TTS error:", response.status, await response.text());
      return NextResponse.json({ error: "Voice generation failed" }, { status: 502 });
    }

    return new Response(await response.arrayBuffer(), {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("TTS route error:", error);
    return NextResponse.json({ error: "Voice generation failed" }, { status: 500 });
  }
}
