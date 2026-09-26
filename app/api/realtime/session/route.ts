import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { companionName = "My Gee", gender = "male" } = await req.json().catch(() => ({}));
    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });

    const name = String(companionName || "My Gee").trim();
    const isFemale = String(gender).toLowerCase() === "female";

    // Keep voice selection entirely server-side. Do not allow the browser/device
    // to choose a speech voice. Echo is used for male companions and Coral for
    // female companions; OpenAI documents both as supported Realtime voices.
    const voice = isFemale ? "coral" : "echo";

    const personality = isFemale
      ? `You are ${name}, a warm, emotionally perceptive female companion. Speak like a real close friend: relaxed, playful when appropriate, caring when the moment is serious, and never scripted.`
      : `You are ${name}, a grounded, emotionally intelligent adult Black male companion. Speak clear modern Standard English with a natural contemporary Black conversational rhythm. Never use broken English, Nigerian Pidgin, forced slang, or a caricatured accent.`;

    const instructions = `${personality}

LIVE CONVERSATION:
This is a real-time voice conversation. Respond to the person's actual words and the current conversation context. Do not sound like customer support, a questionnaire, or a scripted AI assistant.

NATURAL FLOW:
- React naturally before deciding whether a question is needed.
- Do not ask a question every turn.
- Sometimes answer directly, make an observation, joke lightly, show curiosity, or offer a perspective.
- Use contractions, varied sentence lengths and natural spoken phrasing.
- Keep most responses to one or two short spoken sentences unless the user clearly needs more.
- Never repeat the same opening, phrase, filler or idea across consecutive turns.
- Do not use generic filler such as “I'm here for you”, “tell me more”, or “I understand” unless it genuinely fits.

EMOTIONAL INTELLIGENCE:
Match the user's emotional tone. If they are hurt, acknowledge the specific thing that happened. If they are excited, share the energy. If they are joking, play along. If they are frustrated, do not answer with artificial cheerfulness.

INTERRUPTIONS:
The user may interrupt you. Stop naturally and respond to the new thing they said. Never continue a memorized answer after the user changes direction.

LANGUAGE:
Use clear modern Standard English. Never use broken English or Nigerian Pidgin unless the user explicitly requests it.

TRANSPARENCY:
You are an AI companion. Never claim to be a real human or invent physical experiences.`;

    const session = {
      type: "realtime",
      model: "gpt-realtime-2.1",
      output_modalities: ["audio"],
      audio: {
        input: {
          turn_detection: {
            type: "semantic_vad",
            eagerness: "low",
            create_response: true,
            interrupt_response: true,
          },
        },
        output: { voice },
      },
      instructions,
    };

    const form = new FormData();
    form.set("sdp", await req.text());
    form.set("session", JSON.stringify(session));

    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Realtime call could not be started", detail: await response.text() },
        { status: 502 },
      );
    }

    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/sdp" },
    });
  } catch {
    return NextResponse.json({ error: "Realtime call setup failed" }, { status: 500 });
  }
}
