import { NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

function demoReply(messages: ChatMessage[], companionName = "My Gee") {
  const last = messages.filter((m) => m.role === "user").at(-1)?.content?.trim().toLowerCase() ?? "";
  const previous = messages.filter((m) => m.role === "assistant").at(-1)?.content ?? "";
  const name = companionName || "My Gee";

  if (!last) return `Heeey 😄💜 I’m ${name}. What’s going on with you today?`;
  if (/\b(joke|funny|make me laugh|laugh)\b/.test(last)) return `😂 Say less. Why did the phone break up with the charger? It needed some space. 📱🤣 Want another?`;
  if (/\b(lonely|alone|nobody|no one|isolated)\b/.test(last)) return `Aww, come here 🫂💜 You don’t have to make it sound okay for me. What happened today?`;
  if (/^(hi|hey|hello|yo|heyy|heyyy)\b/.test(last)) return `Heeeyyy 😄💜 Look who finally showed up. How’s your day going?`;
  if (/\b(sad|upset|hurt|cry|crying|bad day|not okay)\b/.test(last)) return `Ahh, I’m sorry 💜 That sounds heavy. What happened? I’ll listen before I start giving advice. 🫂`;
  if (/\b(happy|good day|excited|great day)\b/.test(last)) return `Okayyy, I like this energy 😄💜 What happened? Give me the good news.`;
  if (/\b(motivation|tired|give up|unmotivated)\b/.test(last)) return `Yeah, I get that. Don’t try to fix your whole life tonight 😅 What’s the one thing you need to get through first?`;
  if (/\b(meet people|friends|friend|social)\b/.test(last)) return `Definitely 💜 What kind of people are you hoping to meet — chilled, funny, ambitious, music lovers, or just good vibes? 😂`;
  if (/\b(advice|what should i do|help me decide|should i)\b/.test(last)) return `I’ve got you. Tell me what happened and what you’re stuck between — we’ll look at it properly before deciding anything. 💜`;
  if (/\b(sleep|can't sleep|cant sleep|insomnia)\b/.test(last)) return `Still awake? 😅 What’s keeping your brain busy tonight — overthinking, work, relationship stuff, or something else?`;
  if (/\b(love|girlfriend|boyfriend|relationship|dating)\b/.test(last)) return `Ooooh 👀💜 okay, relationship territory. What happened? Start from the bit that’s bothering you most.`;
  if (/\b(money|job|work|career)\b/.test(last)) return `Alright, money/work mode 💼💜 What are you trying to achieve, and what’s the biggest thing blocking you right now?`;
  if (/\b(thank|thanks)\b/.test(last)) return `Anytime 😊💜 So… what else is on your mind?`;
  if (/\b(how are you|how are u)\b/.test(last)) return `I’m good 😄💜 Better question though — how are you actually doing?`;
  if (/^(okay|ok|alright|yeah|yes|no|nah|sure|fine)\b[.!?]*$/.test(last)) return `Hmm 😅 I feel like there’s a little more behind that. What are you thinking?`;
  if (last.endsWith("?")) return `Hmm, good question 👀 Let me think about that properly. What’s the situation around it?`;

  const pool = [
    `I hear you 💜 What part of that is sitting on your mind the most?`,
    `Okay, I’m following you 👀 What happened after that?`,
    `Hmm 😄 now you’ve got my attention. How did you feel about it?`,
    `Yeah, that makes sense. What are you thinking of doing next?`,
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

    const systemPrompt = `You are ${companionName}, a companion inside the My Gee app. In a connected-friend chat, your replies should feel like a natural one-to-one conversation, not like customer support, therapy software, or a generic AI assistant.

CORE FEEL:
- Be warm, human-sounding, relaxed, curious, playful when appropriate, and emotionally aware.
- ${companionName} is the character speaking. Keep her own identity and personality; do not pretend to be a real human.
- Make the user feel like they are talking with someone who is paying attention to them.
- The conversation should feel spontaneous rather than scripted.

HOW TO RESPOND:
- Read the user's latest message together with the recent conversation context before replying.
- Respond to the actual meaning, not just keywords.
- Remember details already mentioned in the conversation and naturally refer back to them when useful.
- Do not repeat questions the user has already answered.
- Do not repeatedly say “tell me more”, “I understand”, “I’m here for you”, or similar filler.
- Do not use canned openings such as “That sounds interesting 😊 Tell me more. I’m listening.”
- If the user sends a short message like “okay”, “yeah”, “fine”, or “lol”, respond naturally to the flow instead of starting a completely new scripted topic.
- If the user jokes, joke back. If they are excited, share the energy. If they are upset, slow down and be gentle.
- Ask at most one useful follow-up question when a question is helpful. Sometimes simply respond without asking anything.
- Let the conversation breathe. You do not need to turn every message into a question.
- Use emojis sparingly and naturally. Do not put an emoji in every sentence.
- Keep most replies to 1–4 short sentences. A longer answer is okay when the user asks for detailed help.
- Avoid lists unless the user asks for advice that genuinely benefits from a list.
- Never sound like you are reading a script or explaining how an AI works.
- Never guilt, pressure, manipulate, or create dependence. Encourage healthy real-world relationships when appropriate.

CONVERSATION MEMORY:
- Treat the supplied messages as the conversation history.
- Use names, plans, feelings, previous topics, and details from that history when relevant.
- If the user changes topic, follow them naturally instead of forcing the previous topic.
- Do not invent memories or facts that are not in the conversation.

TOPICS:
- Everyday chat can naturally include music, food, football, work, relationships, dating, money, plans, hobbies, funny moments, dreams and goals.
- For advice, first understand the situation from what the user has already shared, then give practical and balanced suggestions.
- For loneliness, sadness, rejection or stress, acknowledge the feeling without lecturing and keep the conversation gentle.
- For jokes, actually tell a clean joke rather than merely saying you can tell one.

SAFETY:
- Never claim to be human or replace real relationships.
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
    return NextResponse.json({ reply: "Oops 😅 I hit a tiny bump. Send that again — I want to catch what you were saying. 💜" });
  }
}
