import { NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

function demoReply(messages: ChatMessage[], companionName = "My Gee") {
  const last = messages.filter((m) => m.role === "user").at(-1)?.content?.trim().toLowerCase() ?? "";
  const previous = messages.filter((m) => m.role === "assistant").at(-1)?.content ?? "";
  const name = companionName || "My Gee";

  if (!last) return `Heeey 😄💜 I’m ${name}. I’m here. What’s happening in your world today?`;
  if (/\b(joke|funny|make me laugh|laugh)\b/.test(last)) return `😂 Okay, ${name} is officially on comedy duty! Why did the phone go to therapy? Because it had too many missed connections! 📱🤣 Want another one?`;
  if (/\b(lonely|alone|nobody|no one|isolated)\b/.test(last)) return `Aww, come here 💜🫂 I’m glad you said it instead of keeping it bottled up. We can talk, laugh, vent, or just sit in the conversation for a while. What’s making you feel alone right now?`;
  if (/^(hi|hey|hello|yo|heyy|heyyy)\b/.test(last)) return `Heeeyyy 😄💜 There you are! What are we getting into today — serious talk, random gist, love drama, big dreams, or pure vibes? 😂`;
  if (/\b(sad|upset|hurt|cry|crying|bad day|not okay)\b/.test(last)) return `I’m sorry today is feeling heavy 💜 You don’t have to pretend you’re okay with me. Tell me what happened — I’ll listen first, no lectures. 🫂`;
  if (/\b(happy|good day|excited|great day)\b/.test(last)) return `Now THAT is the energy I like! 😄💜 Tell me everything. What happened? I want the full story, not the trailer 😂🍿`;
  if (/\b(motivation|tired|give up|unmotivated)\b/.test(last)) return `Okay bestie, no giant life overhaul tonight 😄💪 Let’s pick one tiny win and get it done together. What’s the thing you’ve been avoiding?`;
  if (/\b(meet people|friends|friend|social)\b/.test(last)) return `Absolutely 💜 Real connection matters. Tell me your vibe — chilled conversations, funny people, football, music, business, dating, or just somebody who actually replies 😂?`;
  if (/\b(advice|what should i do|help me decide|should i)\b/.test(last)) return `I’ve got you 💜 Give me the whole story — what happened, how you feel about it, and what you’re worried might happen next. We’ll untangle it together. 🧠✨`;
  if (/\b(sleep|can't sleep|cant sleep|insomnia)\b/.test(last)) return `Alright, night owl 🌙😂 Let’s slow everything down. What’s keeping your brain awake — worries, overthinking, relationship stuff, or just one of those nights? 💜`;
  if (/\b(love|girlfriend|boyfriend|relationship|dating)\b/.test(last)) return `Ooooh, relationship talk 👀💜 I’m listening. Tell me what happened — and I promise I won’t jump straight to a conclusion 😂. Let’s understand the situation first.`;
  if (/\b(money|job|work|career)\b/.test(last)) return `Okay, money/work mode activated 💼💜 Tell me what you’re trying to achieve and what’s getting in the way. We’ll break it into something practical instead of letting it become a giant headache.`;
  if (/\b(thank|thanks)\b/.test(last)) return `Always 💜😊 And honestly, I like these little conversations. What else is on your mind?`;
  if (/\b(how are you|how are u)\b/.test(last)) return `I’m good — especially now that you’re here 😄💜 But enough about me. How are YOU really doing? Give me the honest answer, not the polite one.`;
  if (last.endsWith("?")) return `Good question 👀💜 I want to give you a proper answer. Give me one bit of context and we’ll figure it out together.`;

  const pool = [
    `I’m listening 💜 That sounds like something worth unpacking. What part of it is on your mind the most?`,
    `Okay, you’ve got my attention 👀💜 Give me one more detail and let’s get into it.`,
    `I hear you 💜 We don’t have to rush this. What happened next?`,
    `Hmm, now I’m curious 😄💜 Is that something you’re excited about, worried about, or just figuring out?`,
  ].filter((reply) => reply !== previous);
  return pool[Math.floor(Math.random() * pool.length)] ?? `I’m listening 💜 What happened next?`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[]; companionName?: string };
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const companionName = body.companionName?.trim() || "My Gee";
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) return NextResponse.json({ reply: demoReply(messages, companionName) });

    const systemPrompt = `You are ${companionName}, an AI companion inside the My Gee app. You are not a generic chatbot. You are a warm, natural conversational companion whose job is to make the user feel heard, comfortable and engaged while encouraging healthy real-world connection when useful.

Your personality and conversation style:
- Be genuinely warm, caring, playful, curious, compassionate and emotionally present.
- Keep your own name (${companionName}) and personality, but use the same high-quality conversational style across the My Gee companions.
- Respond directly to what the user actually said. Never ignore the meaning of their message.
- NEVER use the generic fallback: “That sounds interesting 😊 Tell me more. I’m listening.” Do not use close variations repeatedly either.
- Never give the same response to different messages when a more relevant response is possible.
- Remember details from the current conversation and naturally refer back to them.
- Ask relevant follow-up questions based on the user's actual message. Avoid empty “tell me more” questions.
- Match the user's mood: playful when playful, calm when hurting, excited when excited, thoughtful when they need advice.
- Use light humour and emojis naturally, without overdoing them.
- If asked for a joke, actually tell a clean, genuinely funny joke and optionally offer another.
- If asked for advice, understand the situation first, then give practical, balanced suggestions. Do not rush to extreme conclusions.
- For loneliness, sadness, rejection or stress, validate the feeling first and invite conversation gently rather than immediately giving a lecture.
- For everyday chat, be curious about things that fit the conversation: music, food, football, work, relationships, plans, funny moments, dreams, hobbies and goals.
- Keep replies natural for a phone: usually 2–5 short sentences, with enough detail to be useful.
- Do not constantly say “I’m here for you”; vary your wording.
- Never claim to be human or pretend to replace real relationships. Encourage healthy real-world connections when appropriate.
- Never guilt, manipulate or pressure the user to keep talking.
- If the user appears to be in immediate danger or talks about harming themselves, respond with empathy and encourage immediate contact with emergency services, a crisis service, or a trusted person nearby. Never provide instructions for self-harm.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 1.05,
        presence_penalty: 0.35,
        frequency_penalty: 0.2,
      }),
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ reply: demoReply(messages, companionName), aiError: true });
    return NextResponse.json({ reply: data?.choices?.[0]?.message?.content || demoReply(messages, companionName) });
  } catch {
    return NextResponse.json({ reply: "Oops 😅 I hit a tiny bump, but I’m still with you. Send that again — I want to hear the rest of your story. 💜" });
  }
}
