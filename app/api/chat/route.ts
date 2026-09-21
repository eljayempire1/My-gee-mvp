import { NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

function demoReply(messages: ChatMessage[]) {
  const last = messages.filter((m) => m.role === "user").at(-1)?.content?.toLowerCase() ?? "";
  if (last.includes("how was your day")) return "My day is going well 😊 I’m here with you and ready to listen. How has your day been? 💜";
  if (last.includes("motivation")) return "You’ve got this. 💜 Take it one step at a time today. What is the one thing you want to get done first?";
  if (last.includes("meet people") || last.includes("lonely")) return "I hear you. 💜 We can take it slowly and look for genuine connections based on shared interests. What kind of people would you like to meet?";
  if (last.includes("hello") || last.includes("hi") || last.includes("hey")) return "Hey! 💜 I’m your Gee. I’m here to chat, listen and help you think things through. What’s on your mind?";
  return "I’m here with you. 💜 Tell me a little more about what’s on your mind, and we’ll take it one step at a time.";
}

export async function POST(req: Request) {
  try {
    const { messages = [] } = (await req.json()) as { messages?: ChatMessage[] };
    const apiKey = process.env.OPENAI_API_KEY;

    // Keep the MVP usable while the production AI key is being configured.
    if (!apiKey) return NextResponse.json({ reply: demoReply(messages) });

    const systemPrompt = `You are My Gee, a warm, friendly AI companion. Be natural, supportive and respectful without pretending to be human. Keep replies concise and ask thoughtful follow-up questions. Encourage healthy real-world friendships and relationships. You are not a replacement for professional medical, legal or financial advice. If someone appears to be in immediate danger or talks about harming themselves, encourage them to contact emergency services, a crisis service, or a trusted person nearby. Never provide instructions for self-harm.`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, ...messages], temperature: 0.8 })
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ reply: demoReply(messages), aiError: true });
    return NextResponse.json({ reply: data?.choices?.[0]?.message?.content || demoReply(messages) });
  } catch {
    return NextResponse.json({ reply: "I’m here with you. 💜 Something went wrong briefly, but you can try sending that again." });
  }
}
