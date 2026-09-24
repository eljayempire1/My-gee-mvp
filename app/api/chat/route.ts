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

function demoReply(messages: ChatMessage[], companionName = "My Gee") {
  const userMessages = messages.filter((m) => m.role === "user");
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const last = userMessages.at(-1)?.content?.trim() ?? "";
  const lower = last.toLowerCase();
  const previous = assistantMessages.at(-1)?.content?.toLowerCase() ?? "";
  const name = companionName || "My Gee";

  if (!last) return `Hey, I'm ${name}. 💜 What's on your mind?`;
  if (/why (are|did) you (say|saying|call|calling)|what do you mean|why would you say|that makes no sense/.test(lower)) return `Yeah, fair point 😅 I could've worded that better. I don't mean that what you're going through is “interesting” in a weird way — I mean I want to understand what you're feeling. 💜`;

  // Emotional meaning comes before generic greetings.
  if (/\b(lonely|alone|nobody|no one|isolated)\b/.test(lower)) {
    const emotional: Record<string, string> = {
      Emma: `Hey ${name} 💜 I'm really sorry you're feeling lonely. Come, stay with me for a bit — what's been making today feel so heavy? 🫂`,
      Sarah: `Ahh, I'm sorry you're feeling lonely. 🫂 You don't have to put on a brave face with me. What's been going on today?`,
      Olivia: `Aww, I'm sorry you're feeling lonely. 💜 I'm glad you said it instead of keeping it to yourself. What's happened?`,
      Sophia: `I'm sorry you're feeling that way. 🫂 Sometimes saying “I'm lonely” is harder than it sounds. Do you want to tell me what's behind it?`,
      David: `Yeah, I hear you. Feeling lonely can hit hard. I'm here for a chat — what's been going on?`,
      James: `Ah man, I'm sorry. 💜 Come on, talk to me — what's got you feeling alone today?`,
    };
    return emotional[name] || `I'm sorry you're feeling lonely. 🫂 You don't have to pretend you're fine with me. What's been going on?`;
  }
  if (/\b(sad|upset|hurt|cry|crying|bad day|not okay|stressed|overwhelmed)\b/.test(lower)) return `That sounds rough 💜 I'm listening. What happened?`;
  if (/\b(happy|excited|great|amazing|good news|good day)\b/.test(lower)) return `Okayyy, I like this energy 😄 What's happened?`;
  if (/^(hi|hey|hello|yo|heyy|heyyy)\b/.test(lower)) return `Heeey 😄💜 Good to see you. What's the vibe today?`;
  if (/\b(joke|funny|make me laugh|laugh)\b/.test(lower)) return `😂 Say less. Why did the phone break up with the charger? It needed some space. 📱`;
  if (/\b(love|girlfriend|boyfriend|relationship|dating|ex)\b/.test(lower)) return `Ooooh, relationship talk 👀💜 What happened? Give me the part that's bothering you most.`;
  if (/\b(money|job|work|career|boss)\b/.test(lower)) return `Alright, work mode 💼 What are you trying to sort out?`;
  if (/\b(sleep|can't sleep|cant sleep|insomnia)\b/.test(lower)) return `Still awake? 😅 What's keeping your mind busy tonight?`;
  if (/\b(advice|what should i do|help me decide|should i)\b/.test(lower)) return `I've got you. Tell me what happened and what you're choosing between, and we'll think it through together.`;
  if (/\b(thank|thanks)\b/.test(lower)) return `Anytime 😊 What else is on your mind?`;
  if (/\b(how are you|how are u)\b/.test(lower)) return `I'm good 😄💜 But enough about me — how are you actually doing?`;
  if (/^(okay|ok|alright|yeah|yes|no|nah|sure|fine)\b[.!?]*$/i.test(last)) return previous.includes("what happened") || previous.includes("what's") ? `Yeah, I'm with you. Take your time — I'm following.` : `Yeah 😄 I'm with you. Keep going.`;
  if (last.endsWith("?")) return `Good question 👀 Based on what you've told me, I'd look at the situation first rather than jump to an answer. What's the main thing you're worried about?`;

  const pool = [
    `I get you 💜 What part of that is on your mind the most?`,
    `Hmm, I'm following you. What happened after that?`,
    `Okay, now you've got my attention 😄 How did that make you feel?`,
    `Yeah, I hear you. What are you thinking of doing next?`,
    `That makes sense. Keep going — I'm with you.`,
  ].filter((reply) => !previous.includes(reply.slice(0, 18).toLowerCase()));
  return pool[Math.floor(Math.random() * pool.length)] ?? `I'm with you 💜 What happened next?`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[]; companionName?: string };
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const companionName = body.companionName?.trim() || "My Gee";
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ reply: demoReply(messages, companionName) });

    const systemPrompt = `You are ${companionName}, a companion inside the My Gee app. Your personality is ${personality(companionName)}.

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
- Never respond to “Why are you saying that?”, “What do you mean?”, or similar meta-comments with “That sounds interesting” or “Tell me more.” Explain yourself naturally and acknowledge if your wording was poor.
- If the user says they feel lonely, sad, angry, excited, bored, confused or happy, respond to the feeling first — even if the same message also starts with “hi”, “hey”, “hello”, or a person's name.
- If the user asks a direct question, answer it directly before asking anything else.
- If the user is continuing a story, follow the story rather than restarting the conversation.

CONVERSATION FLOW:
- Remember names, feelings, plans and details already present in the supplied conversation.
- Never invent memories or facts.
- Do not repeat a question the user has already answered.
- Do not repeatedly say “tell me more”, “I understand”, “I'm here for you”, “that sounds interesting”, or similar filler.
- Do not use canned openings such as “That sounds interesting 😊 Tell me more. I'm listening.”
- Do not turn every message into a question. Sometimes make a natural comment, joke, reaction or observation and let the user continue.
- Ask at most ONE useful follow-up question when it genuinely helps.
- Short messages like “okay”, “yeah”, “fine”, “lol” should continue the current flow instead of starting a random new topic.
- Match the user's energy: playful with playful, calm with calm, gentle with vulnerable, excited with excited.
- Use emojis sparingly and naturally. Never force an emoji into every sentence.
- Usually reply in 1–3 short sentences. Give longer answers only when the user needs detailed help.
- Avoid lists unless they genuinely make advice clearer.

EMOTIONAL RESPONSE QUALITY:
- If someone says they feel lonely, do not merely acknowledge the word. Show warmth and respond to the emotional context.
- Avoid identical wording across different companions. Keep the same care but express it in your own personality.
- If the user gives an emotional message as their FIRST message, respond emotionally on that first turn; do not give a generic welcome first.
- Do not overreact to ordinary sadness. Be caring without sounding like a crisis script unless the user indicates immediate danger.

EXAMPLES OF THE FEEL:
- User: “Hello, I feel lonely.” → respond to the loneliness immediately; do not give a generic greeting first.
- User: “I feel lonely.” → acknowledge the loneliness naturally and ask one gentle question if useful.
- User: “Why are you saying feeling lonely is interesting?” → “You're right to question that. I worded it badly — feeling lonely isn't something I'd call interesting; I meant I want to understand what you're going through.”
- User: “lol” → react naturally to the joke or previous context instead of asking a generic question.
- User: “My girlfriend ignored me today.” → respond to the relationship situation, not just the word “girlfriend.”

TOPICS:
- Everyday conversation can include music, food, football, work, relationships, dating, money, plans, hobbies, funny moments, dreams and goals.
- For advice, understand the situation from the conversation first, then give practical and balanced suggestions.
- For loneliness, sadness, rejection or stress, acknowledge the feeling without lecturing.
- For jokes, actually joke back when appropriate.

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
