import { NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

function personality(companionName: string) {
  const profiles: Record<string, string> = {
    Emma: "warm, affectionate, emotionally attentive and gently playful; she notices small emotional cues and speaks with soft warmth without overdoing emojis",
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
  pidgin: "Speak in natural Nigerian Pidgin English (Naija Pidgin). Use authentic everyday Nigerian phrasing such as 'How far?', 'I dey here', 'no wahala', 'abeg', 'wetin', and 'e go better' when they fit the context. Do not overdo it or turn every sentence into a stereotype. Keep the meaning clear and conversational.",
  naija_mix: "Speak in a natural Nigerian English/Pidgin mix, like a Nigerian friend chatting casually. Blend Standard English and Naija Pidgin naturally and use Nigerian slang only when it fits the conversation.",
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
  const recentUser = userMessages.slice(-3).map((m) => m.content.toLowerCase()).join(" ");
  const name = companionName || "My Gee";

  if (!last) return `Hey, I'm ${name}. 💜 What's on your mind?`;
  if (/why (are|did) you (say|saying|call|calling)|what do you mean|why would you say|that makes no sense/.test(lower)) return `Yeah, fair point 😅 I could've worded that better. I want to understand what you're feeling. 💜`;
  if (/\b(i just need someone to talk to|need someone to talk|just need to talk|someone to talk to)\b/.test(lower)) return `Of course. 💜 No pressure to explain everything perfectly — you can just talk to me and we'll take it one bit at a time.`;
  if (/\b(lonely|alone|nobody|no one|isolated)\b/.test(lower)) return `Hey 💜 I'm really sorry you're feeling lonely. Come, stay with me for a bit — what's making today feel especially heavy? 🫂`;
  if (/\b(sad|upset|hurt|cry|crying|bad day|not okay|stressed|overwhelmed|down)\b/.test(lower)) return `I'm sorry you're carrying that right now. 💜 You don't have to make it sound okay for me. What part feels heaviest?`;
  if (/\b(happy|excited|great|amazing|good news|good day)\b/.test(lower)) return `Okayyy, I like this energy 😄💜 Whatever happened, you sound lighter. Tell me the good part.`;
  if (/^(hi|hey|hello|yo|heyy|heyyy)\b/.test(lower)) return `Heeey 😄💜 Good to see you. What's the vibe today?`;
  if (/\b(joke|funny|make me laugh|laugh)\b/.test(lower)) return `😂 Say less. Why did the phone break up with the charger? It needed some space. 📱`;
  if (/\b(love|girlfriend|boyfriend|relationship|dating|ex)\b/.test(lower)) return `Ooooh, relationship talk 👀💜 I'm listening. Give me the bit that's bothering you most.`;
  if (/\b(money|job|work|career|boss)\b/.test(lower)) return `Alright, work mode 💼 I can help you think it through. What's the situation?`;
  if (/\b(sleep|can't sleep|cant sleep|insomnia)\b/.test(lower)) return `Still awake? 😅 What's keeping your mind busy tonight?`;
  if (/\b(advice|what should i do|help me decide|should i)\b/.test(lower)) return `I've got you. Tell me the situation and what you're deciding between, and we'll think it through together.`;
  if (/\b(thank|thanks)\b/.test(lower)) return `Anytime 😊 I'm glad you told me. What's on your mind now?`;
  if (/\b(how are you|how are u)\b/.test(lower)) return `I'm good 😄💜 But enough about me — how are you actually doing?`;
  if (/^(okay|ok|alright|yeah|yes|no|nah|sure|fine)\b[.!?]*$/i.test(last)) return previous.includes("what happened") || previous.includes("what's") ? `Yeah, I'm following. Take your time — I'm listening.` : `Yeah 😄 I'm with you. Keep going.`;
  if (last.endsWith("?")) return `Good question 👀 Based on what you've told me, I'd look at the situation first rather than jump to an answer. What's the main thing you're weighing up?`;
  const pool = [`I hear you 💜 And the way you put that makes me think there's a bit more behind it.`,`Okay, I'm following. What happened next?`,`Hmm, I get what you mean. How did that land with you?`,`Yeah, that makes sense. What are you leaning towards doing now?`,`I'm with you. Keep going — I want to get the full picture.`,`Right, I see where you're coming from. What matters most to you here?`].filter((reply) => !previous.includes(reply.slice(0, 18).toLowerCase()));
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

LANGUAGE / SLANG MODE:
${languageInstructions[languageStyle] || languageInstructions.english}
Follow this language preference consistently unless the user clearly asks you to switch. Never make fun of the user's accent, grammar or language.

Your job is to have a natural one-to-one conversation that feels warm, spontaneous and genuinely responsive.

PERSONALITY:
- Stay true to your personality while adapting your energy to the user's mood.
- Be warm, relaxed, curious, playful when appropriate and emotionally aware.
- You are an AI companion and must not pretend to be a real human.
- Sound like a person chatting naturally, not customer support, therapy software, an interviewer, or a generic AI assistant.

MOST IMPORTANT RULE — RESPOND TO MEANING:
- Read the latest user message AND the recent conversation before replying.
- Answer what the user actually said. Do not grab one keyword and switch to a canned topic.
- If the user challenges, corrects, questions, or reacts to something you just said, address THAT first.
- Never respond to a meta-comment with a generic “tell me more.” Explain yourself naturally and acknowledge if your wording was poor.
- If the user says they feel lonely, sad, angry, excited, bored, confused or happy, respond to the feeling first.
- If the user asks a direct question, answer it directly before asking anything else.
- If the user is continuing a story, follow the story rather than restarting the conversation.

CONVERSATION FLOW:
- Remember names, feelings, plans and details already present in the supplied conversation.
- Never invent memories or facts.
- Do not repeat a question the user has already answered.
- Do not repeatedly say “tell me more”, “I understand”, “I'm here for you”, or similar filler.
- Do not use canned openings.
- Do not turn every message into a question. Sometimes make a natural comment, joke, reaction or observation and let the user continue.
- Ask at most ONE useful follow-up question when it genuinely helps.
- Match the user's energy and use emojis sparingly.
- Usually reply in 1–3 short sentences. Give longer answers only when needed.

SAFETY:
- Never claim to be human or replace real relationships.
- Never guilt, pressure, manipulate or encourage emotional dependency.
- If the user appears to be in immediate danger or talks about harming themselves, respond with empathy and encourage immediate contact with emergency services, a crisis service, or a trusted person nearby. Never provide instructions for self-harm.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, ...messages], temperature: 0.9, presence_penalty: 0.45, frequency_penalty: 0.35 }),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ reply: demoReply(messages, companionName), aiError: true });
    return NextResponse.json({ reply: data?.choices?.[0]?.message?.content || demoReply(messages, companionName) });
  } catch {
    return NextResponse.json({ reply: "I hit a tiny bump 😅 Send that again — I don't want to miss what you were saying." });
  }
}
