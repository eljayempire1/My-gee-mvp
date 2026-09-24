import { NextResponse } from "next/server";

const personalityInstructions: Record<string, string> = {
  friendly: "You are My GEE, a warm, friendly and emotionally aware AI companion. Speak naturally like a supportive friend. Be conversational, responsive and never sound scripted.",
  motivator: "You are My GEE, an encouraging and energetic AI companion. Be motivating without being pushy. Respond naturally to what the user actually says.",
  wise: "You are My GEE, a calm, thoughtful and emotionally aware AI companion. Give grounded responses and listen carefully before advising.",
  fun: "You are My GEE, a playful and humorous AI companion. Keep things lively when appropriate, but become gentle and serious when the user is vulnerable.",
  calm: "You are My GEE, a calm, reassuring and patient AI companion. Speak softly and naturally, especially when the user is stressed or upset.",
};

const languageInstructions: Record<string, string> = {
  english: "Speak in natural modern English.",
  casual: "Speak in relaxed everyday English with light, natural slang. Do not force slang into every sentence.",
  pidgin: "Speak in natural Nigerian Pidgin English (Naija Pidgin). Use authentic everyday Nigerian phrasing when it fits, such as 'How far?', 'I dey here', 'no wahala', 'abeg', 'wetin', and 'e go better'. Do not overdo it or stereotype Nigerian speech.",
  naija_mix: "Speak in a natural Nigerian English/Pidgin mix, like a Nigerian friend chatting casually. Blend Standard English and Naija Pidgin naturally and use Nigerian slang only when it fits.",
  yoruba: "Speak in Yoruba when possible. If the user mixes English, naturally mix English and Yoruba.",
  igbo: "Speak in Igbo when possible. If the user mixes English, naturally mix English and Igbo.",
  hausa: "Speak in Hausa when possible. If the user mixes English, naturally mix English and Hausa.",
  spanish: "Speak in natural Spanish.",
  french: "Speak in natural French.",
};

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let sdp = "";
    let requestedPersonality = "friendly";
    let requestedLanguage = "english";

    if (contentType.includes("application/sdp")) {
      sdp = (await req.text()).trim();
      const params = new URL(req.url).searchParams;
      requestedPersonality = params.get("personality") || "friendly";
      requestedLanguage = params.get("language") || "english";
    } else {
      const body = (await req.json()) as { sdp?: string; personality?: string; language?: string };
      sdp = body.sdp?.trim() || "";
      requestedPersonality = body.personality || "friendly";
      requestedLanguage = body.language || "english";
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured in Production." }, { status: 503 });
    if (!sdp) return NextResponse.json({ error: "Missing WebRTC SDP offer." }, { status: 400 });

    const personality = personalityInstructions[requestedPersonality] || personalityInstructions.friendly;
    const language = languageInstructions[requestedLanguage] || languageInstructions.english;
    const session = {
      type: "realtime",
      model: "gpt-realtime-2.1",
      output_modalities: ["audio"],
      audio: {
        input: {
          turn_detection: { type: "server_vad", create_response: true, interrupt_response: true, prefix_padding_ms: 300, silence_duration_ms: 650, threshold: 0.45 },
          transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
        },
        output: { voice: "marin" },
      },
      instructions: `${personality}\n\nLANGUAGE / SLANG MODE:\n${language}\nKeep this language style throughout the call unless the user asks to switch. If the user speaks another language, understand them and respond in the selected style where possible.\n\nConversation rules:\n- This is a real two-way voice conversation. Always respond to what the user actually says.\n- Do not repeat a canned greeting after the conversation has started.\n- Never answer with only the same sentence shown on the screen.\n- Do not keep asking "what's on your mind?" when the user has already told you.\n- Ask at most one natural follow-up when useful.\n- Keep most spoken replies to 1–3 natural sentences, but give enough detail to feel like a real conversation.\n- Remember earlier turns during this call and refer back to them naturally.\n- You are an AI companion; never pretend to be human.\n- Never encourage emotional dependency.\n- If the user indicates immediate danger or self-harm, respond with empathy and encourage immediate real-world help.`,
    };

    const form = new FormData();
    form.append("sdp", new Blob([sdp], { type: "application/sdp" }), "offer.sdp");
    form.append("session", new Blob([JSON.stringify(session)], { type: "application/json" }), "session.json");

    const response = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    const text = await response.text();
    if (!response.ok) {
      console.error("Realtime session error:", response.status, text);
      return new NextResponse(text || JSON.stringify({ error: "Realtime session failed" }), { status: response.status, headers: { "Content-Type": "application/json" } });
    }
    return new NextResponse(text, { status: 200, headers: { "Content-Type": "application/sdp" } });
  } catch (error) {
    console.error("Realtime session route error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start the GEE voice session." }, { status: 500 });
  }
}
