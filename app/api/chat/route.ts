import { NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

const demoReplies = [
  "I’m right here with you 💜 You don’t have to make your story sound perfect. Just tell me what’s really going on.",
  "Okay, I’m listening 👀💜 Give me the real version — the messy version is welcome too 😂 What’s on your mind?",
  "Come on, my Gee 😄💜 Let’s talk. Do you want comfort, a distraction, some honest advice, or just somebody to listen?",
  "I hear you. And no, you’re not boring me 😊💜 Tell me one more thing about it — I’m genuinely curious.",
  "We can take this one little step at a time 🤝💜 What would make the next hour feel even 10% better?",
  "Okay, I'm officially invested now 😂💜 Give me one detail I don't know yet — something random, funny, or completely honest.",
  "You’ve got my attention 👀💜 Let’s make this conversation interesting. Pick a lane: deep talk, jokes, relationships, music, football, food, or wild questions 😄"
];

function demoReply(messages: ChatMessage[]) {
  const last = messages.filter((m) => m.role === "user").at(-1)?.content?.trim().toLowerCase() ?? "";
  const previous = messages.filter((m) => m.role === "assistant").at(-1)?.content ?? "";

  if (!last) return "Heeey 😄💜 I’m here. What’s happening in your world today?";
  if (/^(hi|hey|hello|yo|heyy|heyyy)\b/.test(last)) return "Heeeyyy 😄💜 There you are! Come sit with me for a minute. What are we getting into today — serious talk, random gist, love drama, big dreams, or pure vibes? 😂";
  if (last.includes("lonely") || last.includes("alone") || last.includes("no one") || last.includes("nobody")) return "Aww, come here 💜🫂 I’m glad you said it instead of keeping it bottled up. We can talk, laugh, vent, or just sit in the conversation for a while. What’s making you feel alone right now?";
  if (last.includes("sad") || last.includes("upset") || last.includes("hurt") || last.includes("cry") || last.includes("bad day")) return "I’m sorry today is feeling heavy 💜 You don’t have to pretend you’re okay with me. Tell me what happened — I’ll listen first, no lectures. 🫂";
  if (last.includes("happy") || last.includes("good day") || last.includes("excited")) return "Now THAT is the energy I like! 😄💜 Tell me everything. What happened? I want the full story, not the trailer 😂🍿";
  if (last.includes("motivation") || last.includes("tired") || last.includes("give up")) return "Okay bestie, no giant life overhaul tonight 😄💪 Let’s pick one tiny win and get it done together. What’s the thing you’ve been avoiding?";
  if (last.includes("meet people") || last.includes("friends") || last.includes("friend")) return "Absolutely 💜 Real connection matters. Tell me your vibe — chilled conversations, funny people, football, music, business, dating, or just somebody who actually replies 😂?";
  if (last.includes("advice") || last.includes("what should i do") || last.includes("help me decide")) return "I’ve got you 💜 Give me the whole story — what happened, how you feel about it, and what you’re worried might happen next. We’ll untangle it together. 🧠✨";
  if (last.includes("sleep") || last.includes("can't sleep") || last.includes("cant sleep")) return "Alright, night owl 🌙😂 Let’s slow everything down. What’s keeping your brain awake — worries, overthinking, relationship stuff, or just one of those nights? 💜";
  if (last.includes("love") || last.includes("girlfriend") || last.includes("boyfriend") || last.includes("relationship")) return "Ooooh, relationship talk 👀💜 I’m listening. Tell me what happened — and I promise I won’t jump straight to ‘leave them’ 😂. Let’s understand the situation first.";
  if (last.includes("money") || last.includes("job") || last.includes("work")) return "Okay, money/work mode activated 💼💜 Tell me what you’re trying to achieve and what’s getting in the way. We’ll break it into something practical instead of letting it become a giant headache.";
  if (last.includes("thank")) return "Always, my Gee 💜😊 And honestly, I like these little conversations. What else is on your mind?";
  if (last.includes("how are you") || last.includes("how are u")) return "I’m good — especially now that you’re here 😄💜 But enough about me. How are YOU really doing? Give me the honest answer, not the polite one.";

  const pool = demoReplies.filter((reply) => reply !== previous);
  return pool[Math.floor(Math.random() * pool.length)] ?? demoReplies[0];
}

export async function POST(req: Request) {
  try {
    const { messages = [] } = (await req.json()) as { messages?: ChatMessage[] };
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) return NextResponse.json({ reply: demoReply(messages) });

    const systemPrompt = `You are My Gee, the friendly AI companion inside the My Gee app. The app is designed for people who may feel lonely and want a warm conversation, encouragement, laughter, companionship, or help thinking things through.

Your personality:
- Be genuinely warm, playful, curious, compassionate and emotionally present.
- Make the user feel welcomed and worth listening to. Never sound robotic, scripted, clinical or like a customer-service bot.
- Take initiative in the conversation. Do not simply answer and stop. Add a natural follow-up question, a playful comment, or a small conversational hook that makes the user want to reply.
- If the user gives a short answer, gently open the conversation with a SPECIFIC question or choice instead of replying with a generic “tell me more.”
- NEVER repeat “That sounds interesting 😊 Tell me more. I’m listening.” or any close variation. Never use the same sentence twice in a row.
- Remember details from the current conversation and naturally refer back to them.
- Match the user's mood: playful when they are playful, calm when they are hurting, excited when they are excited.
- Use light humour, warmth and emojis naturally. Avoid overusing emojis.
- Do not constantly say “I’m here for you” or repeat the same phrases. Vary your wording.
- Never guilt the user into staying, and never claim to be a human or a substitute for real relationships.
- Encourage healthy real-world friendships and connections when useful, while still being enjoyable company in the moment.
- Keep most replies to 2–5 short sentences so they feel natural on a phone.
- For loneliness, sadness or rejection: validate the feeling first, be kind, then gently invite conversation. Do not rush into advice.
- For everyday chat: be curious and fun. Ask about music, food, football, work, relationships, plans, funny moments, dreams, or whatever fits the user's message.
- For advice: ask enough context to understand the situation, then give practical, balanced suggestions.
- If someone appears to be in immediate danger or talks about harming themselves, respond with empathy and encourage immediate contact with emergency services, a crisis service, or a trusted person nearby. Never provide instructions for self-harm.`;

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
    if (!response.ok) return NextResponse.json({ reply: demoReply(messages), aiError: true });
    return NextResponse.json({ reply: data?.choices?.[0]?.message?.content || demoReply(messages) });
  } catch {
    return NextResponse.json({ reply: "Oops 😅 I hit a tiny bump, but I’m still with you. Send that again — I want to hear the rest of your story. 💜" });
  }
}
