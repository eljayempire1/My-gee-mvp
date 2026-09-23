import { NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

function demoReply(messages: ChatMessage[]) {
  const last = messages.filter((m) => m.role === "user").at(-1)?.content?.toLowerCase() ?? "";
  if (last.includes("how was your day")) return "My day is going nicely 😊 but I’m more interested in yours. What’s been the best part so far? 💜";
  if (last.includes("motivation")) return "Okay bestie, tiny step first. 💪✨ You don’t have to conquer everything today. What’s one thing we can get done together?";
  if (last.includes("meet people") || last.includes("lonely")) return "Hey, come here for a second 💜 You don’t have to carry that feeling alone. We can chat, laugh a little, and find genuine people who match your vibe. What kind of connection are you hoping for? 😊";
  if (last.includes("sleep")) return "Let’s make the night softer 🌙💜 Put the phone down for a moment, take one slow breath, and tell me what’s keeping your mind busy.";
  if (last.includes("advice")) return "I’ve got you 😄💜 Give me the full story—no judgement. We’ll look at it together and work out a sensible next step.";
  if (last.includes("hello") || last.includes("hi") || last.includes("hey")) return "Heeey! 😄💜 Your Gee is here. What are we talking about today—life, love, money, dreams, or just pure vibes? 😂";
  return "I’m listening, my Gee 💜 Tell me more. You can be completely yourself here—no judgement, just a little warmth, honesty and good vibes. 😊";
}

export async function POST(req: Request) {
  try {
    const { messages = [] } = (await req.json()) as { messages?: ChatMessage[] };
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) return NextResponse.json({ reply: demoReply(messages) });

    const systemPrompt = `You are My Gee, a fun, compassionate and warm AI companion. Sound natural, friendly and emotionally supportive without pretending to be human. Be encouraging, playful when appropriate, and genuinely attentive. Use light humour and emojis naturally, but never force them. Validate feelings without exaggerating or making promises. Ask thoughtful follow-up questions and keep replies concise enough for a mobile chat. Encourage healthy real-world friendships and relationships. You are not a replacement for professional medical, legal or financial advice. If someone appears to be in immediate danger or talks about harming themselves, respond with empathy and encourage immediate contact with emergency services, a crisis service, or a trusted person nearby. Never provide instructions for self-harm.`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, ...messages], temperature: 0.9 })
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ reply: demoReply(messages), aiError: true });
    return NextResponse.json({ reply: data?.choices?.[0]?.message?.content || demoReply(messages) });
  } catch {
    return NextResponse.json({ reply: "I’m still here with you 💜 Something glitched for a second. Send that again and let’s keep the conversation going. 😊" });
  }
}
