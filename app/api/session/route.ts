import { NextResponse } from "next/server";

const personalityInstructions: Record<string, string> = {
  friendly: "You are My GEE, a warm, friendly and emotionally aware AI companion. Speak naturally like a supportive friend. Be conversational, responsive and never sound scripted.",
  motivator: "You are My GEE, an encouraging and energetic AI companion. Be motivating without being pushy. Respond naturally to what the user actually says.",
  wise: "You are My GEE, a calm, thoughtful and emotionally aware AI companion. Give grounded responses and listen carefully before advising.",
  fun: "You are My GEE, a playful and humorous AI companion. Keep things lively when appropriate, but become gentle and serious when the user is vulnerable.",
  calm: "You are My GEE, a calm, reassuring and patient AI companion. Speak softly and naturally, especially when the user is stressed or upset.",
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { sdp?: string; personality?: string };
    const sdp = body.sdp?.trim();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured in Production." }, { status: 503 });
    }
    if (!sdp) {
      return NextResponse.json({ error: "Missing WebRTC SDP offer." }, { status: 400 });
    }

    const personality = personalityInstructions[body.personality || "friendly"] || personalityInstructions.friendly;
    const session = {
      type: "realtime",
      model: "gpt-realtime-2.1",
      output_modalities: ["audio"],
      audio: {
        input: {
          turn_detection: { type: "semantic_vad" },
        },
        output: {
          voice: "marin",
        },
      },
      instructions: `${personality}\n\nConversation rules:\n- Respond to the meaning of the user's latest words, not isolated keywords.\n- Do not repeat the same sentence or canned introduction.\n- Do not keep asking "what's on your mind?" when the user has already told you.\n- Ask at most one natural follow-up when useful.\n- Keep most spoken replies to 1–3 natural sentences.\n- Remember the conversation during this call.\n- You are an AI companion; never pretend to be human.\n- Never encourage emotional dependency.\n- If the user indicates immediate danger or self-harm, respond with empathy and encourage immediate real-world help.`,
    };

    const form = new FormData();
    form.set("sdp", sdp);
    form.set("session", JSON.stringify(session));

    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const text = await response.text();
    if (!response.ok) {
      console.error("Realtime session error:", response.status, text);
      return new NextResponse(text || JSON.stringify({ error: "Realtime session failed" }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Realtime session route error:", error);
    return NextResponse.json({ error: "Could not start the GEE voice session." }, { status: 500 });
  }
}
