import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string; companionName?: string; gender?: "male" | "female" };
    const text = body.text?.trim();
    const companionName = body.companionName?.trim() || "My Gee";
    const key = companionName.toLowerCase();
    const gender = key.startsWith("elijah") ? "male" : key.startsWith("emma") ? "female" : (body.gender || "male");

    // Use separate, explicit voices. Do not fall back to browser/device speech synthesis.
    // Cedar is used for male companions; Coral for female companions.
    const voice = gender === "male" ? "cedar" : "coral";

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
    if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });

    const instructions = gender === "male"
      ? `Speak as ${companionName}: a natural adult male companion. Warm, grounded, relaxed, confident and conversational. Use clear modern Standard English. Natural contemporary Black British/African-diaspora conversational feel without imitation or caricature. No Nigerian Pidgin, no broken English, no exaggerated slang, no feminine delivery. Vary emotion and intonation naturally according to the meaning of the sentence.`
      : `Speak as ${companionName}: a natural adult female companion. Warm, grounded, relaxed, confident and conversational. Use clear modern Standard English. No broken English or exaggerated slang. Vary emotion and intonation naturally according to the meaning of the sentence.`;

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice,
        input: text.slice(0, 1800),
        response_format: "mp3",
        instructions,
      }),
    });

    if (!response.ok) {
      console.error("TTS error:", response.status, await response.text());
      return NextResponse.json({ error: "Voice generation failed" }, { status: 502 });
    }

    return new Response(await response.arrayBuffer(), {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("TTS route error:", error);
    return NextResponse.json({ error: "Voice generation failed" }, { status: 500 });
  }
}
