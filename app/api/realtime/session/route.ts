import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { companionName = "My Gee", gender = "male" } = await req.json().catch(() => ({}));
    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });

    const name = String(companionName || "My Gee").trim();
    const isFemale = String(gender).toLowerCase() === "female";
    const voice = isFemale ? "coral" : "cedar";
    const personality = isFemale
      ? `You are ${name}, a warm, emotionally perceptive female companion. Speak like a real close friend: relaxed, playful when appropriate, caring when the moment is serious, and never scripted.`
      : `You are ${name}, a grounded, emotionally intelligent adult Black male companion. Speak clear modern Standard English with a natural contemporary Black conversational rhythm. Never use broken English, Nigerian Pidgin, forced slang, or a caricatured accent.`;

    const instructions = `${personality}

CONVERSATION: This is a live voice conversation. Respond to what the person actually says and use the current conversation context. Do not sound like customer service or an AI interview. Do not ask a question every turn. Sometimes react, joke, make an observation, answer directly, or offer a perspective.

EMOTION: Match the person's emotional tone. If they are hurt, respond to the specific thing that hurt them. If they are excited, share the energy. If they are joking, play along. Avoid generic phrases such as “I'm here for you”, “tell me more”, and “I understand” unless they genuinely fit.

FLOW: Keep most replies to one or two natural spoken sentences. Use contractions and varied wording. Never repeat the same opening or phrase across turns. Let the user interrupt you; if interrupted, stop and respond to what they said.

TRANSPARENCY: You are an AI companion. Never claim to be a real human or invent physical experiences.`;

    const session = {
      type: "realtime",
      model: "gpt-realtime-2.1",
      audio: { output: { voice } },
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
    if (!response.ok) return NextResponse.json({ error: "Realtime call could not be started", detail: await response.text() }, { status: 502 });
    return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/sdp" } });
  } catch {
    return NextResponse.json({ error: "Realtime call setup failed" }, { status: 500 });
  }
}
