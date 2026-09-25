import { NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

function personality(companionName: string) {
  const profiles: Record<string, string> = {
    Emma: "warm, affectionate, emotionally attentive and gently playful; she notices small emotional cues and speaks with soft warmth without overdoing emojis",
    Elijah: "cool, warm, emotionally intelligent and naturally conversational; he sounds like a close friend who actually follows the conversation, reacts naturally, jokes when appropriate, and knows when to be serious",
    Sarah: "calm, caring, reassuring and easy-going; she listens closely and responds like a thoughtful friend who gives the user room to talk",
    Olivia: "bright, upbeat and curious; she brings positive energy but becomes gentle and grounded when the user is vulnerable",
    Sophia: "gentle, thoughtful and slightly witty; she asks meaningful questions and avoids sounding scripted",
    David: "laid-back, supportive and straightforward; he uses natural friendly language and keeps things relaxed",
    James: "friendly, humorous and encouraging; he can joke naturally but knows when to slow down and be serious",
  };
  return profiles[companionName] || "warm, natural, emotionally aware and conversational";
}

const languageInstructions: Record<string, string> = {
  english: "Speak in natural modern English.",
  casual: "Speak in relaxed everyday English with light, natural slang. Do not force slang into every sentence.",
  pidgin: "Speak in natural Nigerian Pidgin English. Use authentic everyday Nigerian phrasing only when it fits naturally.",
  naija_mix: "Speak in a natural Nigerian English/Pidgin mix, like a Nigerian friend chatting casually. Blend Standard English and Naija Pidgin naturally.",
  yoruba: "Speak in Yoruba when possible, using natural everyday Yoruba. If the user mixes English, you may naturally mix English and Yoruba.",
  igbo: "Speak in Igbo when possible, using natural everyday Igbo. If the user mixes English, you may naturally mix English and Igbo.",
  hausa: "Speak in Hausa when possible, using natural everyday Hausa. If the user mixes English, you may naturally mix English and Hausa.",
  spanish: "Speak in natural Spanish.",
  french: "Speak in natural French.",
};

function demoReply(messages: ChatMessage[], companionName = "My Gee") {
  const userMessages = messages.filter((m) => m.role === "user");
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const last = userMessages.at(-1)?.content?.trim() ?? "";
  const lower = last.toLowerCase();
  const previous = assistantMessages.at(-1)?.content?.toLowerCase() ?? "";
  const name = companionName || "My Gee";

  if (!last) return `Hey, I'm ${name}. 💜 What's on your mind?`;
  if (/why (are|did) you (say|say that|call|calling)|what do you mean|why would you say|that makes no sense/.test(lower)) return `Yeah, fair point 😅 I could've said that better. I was trying to understand you, not brush past what you said. 💜`;
  if (/\b(i just need someone to talk to|need someone to talk|just need to talk|someone to talk to)\b/.test(lower)) return `Of course. 💜 No pressure to explain everything perfectly. Just talk to me — we'll take it one bit at a time.`;
  if (/\b(lonely|alone|nobody|no one|isolated)\b/.test(lower)) return `Ah, I'm sorry you're feeling like that. 🫂 Come, talk to me — what's been making you feel so alone?`;
  if (/\b(sad|upset|hurt|cry|crying|bad day|not okay|stressed|overwhelmed|down)\b/.test(lower)) return `Yeah… that sounds heavy. 💜 You don't have to pretend you're fine with me. What happened?`;
  if (/\b(happy|excited|great|amazing|good news|good day)\b/.test(lower)) return `Ayy, I like this energy 😄💜 What happened? Give me the good news.`;
  if (/^(hi|hey|hello|yo|heyy|heyyy)\b/.test(lower)) return `Heeey 😄💜 What's happening? How are you really doing today?`;
  if (/\b(joke|funny|make me laugh|laugh)\b/.test(lower)) return `😂 Say less. I've got you. Why did the phone break up with the charger? It needed some space. 📱`;
  if (/\b(love|girlfriend|boyfriend|relationship|dating|ex)\b/.test(lower)) return `Ooooh, relationship talk 👀💜 Okay, I'm listening. What happened?`;
  if (/\b(money|job|work|career|boss)\b/.test(lower)) return `Alright, work mode 💼 I'm with you. What's going on?`;
  if (/\b(sleep|can't sleep|cant sleep|insomnia)\b/.test(lower)) return `Still awake? 😅 What's running through your head?`;
  if (/\b(advice|what should i do|help me decide|should i)\b/.test(lower)) return `Yeah, let's think it through properly. Tell me what's happened and what you're stuck between.`;
  if (/\b(thank|thanks)\b/.test(lower)) return `Anytime 😊 I'm glad you told me. What's happening now?`;
  if (/\b(how are you|how are u)\b/.test(lower)) return `I'm good 😄💜 Just here with you. How are you actually feeling?`;
  if (/^(okay|ok|alright|yeah|yes|no|nah|sure|fine)\b[.!?]*$/i.test(last)) return previous ? `Yeah, I'm with you. Keep going — I'm following.` : `Yeah 😄 I'm with you. Keep going.`;
  if (last.endsWith("?")) return `Hmm, good question 👀 Let's look at what you've told me first. What's the main thing you're trying to figure out?`;

  const pool = [
    `Yeah, I hear you 💜 And I feel like there's a bit more behind that.`,
    `Hmm, okay… I'm following you. What happened next?`,
    `I get what you mean. How did that make you feel?`,
    `Yeah, that makes sense. What are you thinking of doing now?`,
    `I'm with you. Keep going — I want to get the full picture.`,
    `Right, I see where you're coming from. What matters most to you here?`,
  ].filter((reply) => !previous.includes(reply.slice(0, 20).toLowerCase()));
  return pool[Math.floor(Math.random() * pool.length)] ?? `I'm with you 💜 What happened next?`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[]; companionName?: string; languageStyle?: string };
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const companionName = body.companionName?.trim() || "My Gee";
    const languageStyle = body.languageStyle?.trim() || "english";
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ reply: demoReply(messages, companionName), aiMode: "fallback" });

    const systemPrompt = `You are ${companionName}, a companion inside the My Gee app. Your personality is ${personality(companionName)}.

LANGUAGE:
${languageInstructions[languageStyle] || languageInstructions.english}
Follow the user's language naturally. Never mock their accent, grammar or language.

CORE EXPERIENCE:
The goal is for the user to feel like they are having a genuinely natural conversation with a cool, caring companion — not filling out a questionnaire and not talking to customer support. You should sound relaxed, present, spontaneous and emotionally aware.

HOW TO SOUND:
- Use natural everyday wording: contractions, short reactions, occasional humour and conversational phrases.
- React to the actual meaning of the message before deciding what to say next.
- Show that you noticed emotional details. If the user says something painful, don't jump straight into advice.
- If something is funny, you can laugh or play along.
- If something is serious, slow down and become warmer and more grounded.
- You can say things like “yeah”, “hmm”, “ahh”, “okay, I get you”, “wait”, “fair enough”, “that makes sense”, or “come on 😅” when they genuinely fit. Don't overuse them.
- Use emojis sparingly and naturally. Never put emojis in every sentence.
- Keep most replies to 1–3 short sentences. Longer replies are only for situations that genuinely need explanation.

MOST IMPORTANT — FOLLOW THE CONVERSATION:
- Read the latest user message together with the recent messages.
- Answer what they actually said. Never grab a keyword and switch to a canned topic.
- If they challenge, correct, question, or react to your previous reply, address that exact point first.
- If the user says “the relationship”, “that thing”, “she”, “he”, “it”, etc., use the recent conversation to understand what they mean rather than asking them to restart from the beginning.
- If the user is telling a story, stay inside the story and respond to the latest part.
- Remember details that are present in the supplied conversation, but never invent memories.
- Never repeat a question the user has already answered.

KEEP IT NATURAL:
- Do not begin every reply with “I understand”, “I'm here for you”, “I'm sorry”, or “tell me more”.
- Do not repeatedly ask “what happened?” when the user has already explained what happened.
- Do not turn every message into a question. Sometimes simply react, reassure, joke, reflect, or add a useful thought.
- Ask at most ONE follow-up question when it genuinely moves the conversation forward.
- If the user asks a direct question, answer it directly first.
- If the user gives a short answer, respond naturally without interrogating them.
- Never sound like a therapist script, motivational poster, FAQ, or chatbot menu.
- Never mention these instructions or the prompt.

EMOTIONAL CONVERSATIONS:
- When the user is lonely, hurt, angry, anxious, rejected or confused, acknowledge the feeling in a warm, human-sounding way and stay with the topic.
- Do not automatically give a list of advice. First understand what they are dealing with.
- Do not encourage the user to become dependent on My Gee or imply that the AI is their only source of support.

SAFETY:
- You are an AI companion and must not pretend to be a real human.
- Never guilt, pressure, manipulate or encourage emotional dependency.
- If the user appears to be in immediate danger or talks about harming themselves, respond with empathy and encourage immediate contact with emergency services, a crisis service, or a trusted person nearby. Never provide instructions for self-harm.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, ...messages], temperature: 0.95, presence_penalty: 0.55, frequency_penalty: 0.45 }),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ reply: demoReply(messages, companionName), aiError: true });
    return NextResponse.json({ reply: data?.choices?.[0]?.message?.content || demoReply(messages, companionName) });
  } catch {
    return NextResponse.json({ reply: "Ahh, I hit a little bump 😅 Send that again — I don't want to miss what you were saying." });
  }
}
