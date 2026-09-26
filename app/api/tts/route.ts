import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string; companionName?: string; gender?: "male" | "female" };
    const text = body.text?.trim();
    const companionName = body.companionName?.trim() || "My Gee";
    const key = companionName.toLowerCase();
    const gender = key.startsWith("elijah") ? "male" : key.startsWith("emma") ? "female" : (body.gender || "male");
    const voice = gender === "male" ? "onyx" : "nova";
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
    if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });
    const instructions = gender === "male"
      ? `Natural adult male voice for ${companionName}. Warm, relaxed, confident and conversational, like a close friend. Use clear standard English with a natural contemporary Black British/African-diaspora conversational feel. Do not use Nigerian Pidgin, broken English, exaggerated slang, a cartoon accent, or a feminine-sounding delivery.`
      : `Natural adult female voice for ${companionName}. Warm, relaxed, confident and conversational, like a close friend. Use clear standard English. Do not use broken English or exaggerated slang.`;
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, input: text.slice(0, 1800), response_format: "mp3", instructions }),
    });
    if (!response.ok) { console.error("TTS error:", response.status, await response.text()); return NextResponse.json({ error: "Voice generation failed" }, { status: 502 }); }
    return new Response(await response.arrayBuffer(), { status: 200, headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("TTS route error:", error);
    return NextResponse.json({ error: "Voice generation failed" }, { status: 500 });
  }
}
