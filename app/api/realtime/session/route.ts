import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });

    const name = (req.headers.get("x-companion-name") || "My Gee").trim();
    const gender = (req.headers.get("x-companion-gender") || "male").toLowerCase();
    const isFemale = gender === "female";

    // Realtime voices are selected at session creation and cannot be changed after audio starts.
    // Use the current documented voice set and keep selection entirely server-side.
    const voice = isFemale ? "coral" : "cedar";

    const personality = isFemale
      ? `You are ${name}, a warm, emotionally perceptive female companion. Speak like a real close friend: relaxed, playful when appropriate, caring when the moment is serious, and never scripted.`
      : `You are ${name}, a grounded, emotionally intelligent adult Black male companion. Speak clear modern Standard English with a natural contemporary Black conversational rhythm. Never use broken English, Nigerian Pidgin, forced slang, or a caricatured accent.`;

    const instructions = `${personality}

LIVE CONVERSATION:
This is a real-time voice conversation. Respond to the person's actual words and current context. Do not sound like customer support, a questionnaire, or a scripted AI assistant.

NATURAL FLOW:
- React naturally before deciding whether a question is needed.
- Do not ask a question every turn.
- Sometimes answer directly, make an observation, joke lightly, show curiosity, or offer perspective.
- Use contractions and natural spoken phrasing.
- Keep most responses to one or two short spoken sentences unless the user clearly needs more.
- Vary your wording and never repeat the same opening, filler or idea across consecutive turns.
- Avoid generic filler such as “I'm here for you”, “tell me more”, or “I understand” unless it genuinely fits.

EMOTIONAL INTELLIGENCE:
Match the user's emotional tone. If they are hurt, acknowledge the specific thing that happened. If excited, share the energy. If joking, play along. If frustrated, do not answer with artificial cheerfulness.

INTERRUPTIONS:
The user may interrupt you. Stop naturally and respond to the new thing they said. Never continue a memorized answer after the user changes direction.

LANGUAGE:
Use clear modern Standard English. Never use broken English or Nigerian Pidgin unless explicitly requested.

TRANSPARENCY:
You are an AI companion. Never claim to be a real human or invent physical experiences.`;

    const session = {
      type: "realtime",
      model: "gpt-realtime-2.1",
      output_modalities: ["audio"],
      audio: {
        input: { turn_detection: { type: "semantic_vad", eagerness: "low", create_response: true, interrupt_response: true } },
        output: { voice },
      },
      instructions,
    };

    const sdp = await req.text();
    if (!sdp.trim()) return NextResponse.json({ error: "Missing WebRTC offer" }, { status: 400 });

    const form = new FormData();
    form.set("sdp", sdp);
    form.set("session", JSON.stringify(session));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json({ error: "Realtime call could not be started", detail }, { status: 502 });
    }

    return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/sdp" } });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Realtime service timed out" : "Realtime call setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
