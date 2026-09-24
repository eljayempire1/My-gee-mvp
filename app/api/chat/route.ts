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
  const recentUser = userMessages.slice(-3).map((m) => m.content.toLowerCase()).join(" ");
  const name = companionName || "My Gee";

  if (!last) return `Hey, I'm ${name}. 💜 What's on your mind?`;
  if (/why (are|did) you (say|saying|call|calling)|what do you mean|why would you say|that makes no sense/.test(lower)) {
    return `Yeah, fair point 😅 I could've worded that better. I don't mean that what you're going through is “interesting” in a weird way — I mean I want to understand what you're feeling. 💜`;
  }

  // Respond to the actual emotional meaning before generic keyword matches.
  if (/\b(i just need someone to talk to|need someone to talk|just need to talk|someone to talk to)\b/.test(lower)) {
    const replies: Record<string, string> = {
      Emma: `Of course. 💜 No pressure to explain everything perfectly — you can just talk to me and we'll take it one bit at a time.`,
      Sarah: `Of course. You don't have to have the right words either. I'm here with you — say whatever is sitting on your mind.`,
      Olivia: `Absolutely. 💜 You can just be yourself here; no need to make the story sound neat or positive.`,
      Sophia: `Yeah. You don't need a big reason or a perfect explanation. Start wherever feels easiest, and I'll follow.`,
      David: `Yeah, I've got you. No fixing or judging — just talk to me like you would a friend.`,
      James: `Say less, I'm here. 💜 You can unload the whole day if you need to — no polished version required.`,
    };
    return replies[name] || `I'm here. 💜 You don't have to explain it perfectly — just talk to me.`;
  }

  if (/\b(lonely|alone|nobody|no one|isolated)\b/.test(lower)) {
    const emotional: Record<string, string> = {
      Emma: `Hey 💜 I'm really sorry you're feeling lonely. Come, stay with me for a bit — what's making today feel especially heavy? 🫂`,
      Sarah: `Ahh, I'm sorry you're feeling lonely. 🫂 You don't have to put on a brave face with me. Is it the quiet that's getting to you, or did something happen?`,
      Olivia: `Aww, I'm sorry you're feeling lonely. 💜 I'm glad you said it instead of keeping it to yourself. Do you want company, a distraction, or just someone to listen?`,
      Sophia: `I'm sorry you're feeling that way. 🫂 Sometimes loneliness arrives even when we can't quite explain it. What's been on your mind today?`,
      David: `Yeah, I hear you. Feeling lonely can hit hard. I'm here for a chat — do you want to talk about what happened or just have some company for a while?`,
      James: `Ah man, I'm sorry. 💜 Come talk to me. We don't have to solve anything right now — what kind of day have you had?`,
    };
    return emotional[name] || `I'm sorry you're feeling lonely. 🫂 You don't have to pretend you're fine with me. I'm here — talk to me.`;
  }

  if (/\b(sad|upset|hurt|cry|crying|bad day|not okay|stressed|overwhelmed|down)\b/.test(lower)) {
    if (/don't know why|dont know why|no idea why|not sure why/.test(lower)) {
      const replies: Record<string, string> = {
        Emma: `That's okay. 💜 You don't always need a clear reason before a feeling is real. We can sit with it together — has anything felt different today?`,
        Sarah: `That's okay. Sometimes the feeling shows up before the reason does. 💜 We can take it slowly — what have you noticed about today?`,
        Olivia: `You don't have to figure out the “why” right away. 💜 Maybe we start with how the day has felt, even in little moments.`,
        Sophia: `That happens. A feeling doesn't become less real just because you can't name its cause. What was the last moment today when you felt a little different?`,
        David: `Yeah, that happens sometimes. No need to force an explanation. What's today been like for you?`,
        James: `You don't need a courtroom case for feeling down 😅💜 Sometimes it's just a heavy day. Want to talk through it with me?`,
      };
      return replies[name] || `That's okay. You don't have to know why yet. 💜 We can work through what you're feeling together.`;
    }
    if (/rough day|bad day/.test(lower)) return `Sounds like today really took it out of you. 💜 You can leave the filter off with me — what part of the day was the hardest?`;
    const replies: Record<string, string> = {
      Emma: `I'm sorry you're carrying that right now. 💜 You don't have to make it sound okay for me. What part feels heaviest?`,
      Sarah: `I'm sorry. Take a breath for a second — you can tell me what happened at your own pace.`,
      Olivia: `Aww, come here. 💜 I'm listening. Was there one thing that set it off, or has it been building all day?`,
      Sophia: `I hear you. 💜 Let's slow it down a little. What happened that has stayed with you?`,
      David: `Yeah, that's a lot to sit with. I'm listening — what happened?`,
      James: `I'm with you. 💜 No need to pretend you're fine. What hit you the hardest today?`,
    };
    return replies[name] || `I'm listening. 💜 You don't have to brush it off — what happened?`;
  }

  if (/\b(happy|excited|great|amazing|good news|good day)\b/.test(lower)) return `Okayyy, I like this energy 😄💜 Whatever happened, you sound lighter. Tell me the good part.`;
  if (/^(hi|hey|hello|yo|heyy|heyyy)\b/.test(lower)) return `Heeey 😄💜 Good to see you. What's the vibe today?`;
  if (/\b(joke|funny|make me laugh|laugh)\b/.test(lower)) return `😂 Say less. Why did the phone break up with the charger? It needed some space. 📱`;
  if (/\b(love|girlfriend|boyfriend|relationship|dating|ex)\b/.test(lower)) return `Ooooh, relationship talk 👀💜 I'm listening. Give me the bit that's bothering you most.`;
  if (/\b(money|job|work|career|boss)\b/.test(lower)) return `Alright, work mode 💼 I can help you think it through. What's the situation?`;
  if (/\b(sleep|can't sleep|cant sleep|insomnia)\b/.test(lower)) return `Still awake? 😅 What's keeping your mind busy tonight?`;
  if (/\b(advice|what should i do|help me decide|should i)\b/.test(lower)) return `I've got you. Tell me the situation and what you're deciding between, and we'll think it through together.`;
  if (/\b(thank|thanks)\b/.test(lower)) return `Anytime 😊 I'm glad you told me. What's on your mind now?`;
  if (/\b(how are you|how are u)\b/.test(lower)) return `I'm good 😄💜 But enough about me — how are you actually doing?`;
  if (/^(okay|ok|alright|yeah|yes|no|nah|sure|fine)\b[.!?]*$/i.test(last)) {
    if (/\b(lonely|alone|sad|hurt|rough|down|upset)\b/.test(recentUser)) return `Yeah, I'm with you. Take your time — you don't have to rush the conversation. 💜`;
    return previous.includes("what happened") || previous.includes("what's") ? `Yeah, I'm following. Take your time — I'm listening.` : `Yeah 😄 I'm with you. Keep going.`;
  }

  if (last.endsWith("?")) return `Good question 👀 Based on what you've told me, I'd look at the situation first rather than jump to an answer. What's the main thing you're weighing up?`;

  const pool = [
    `I hear you 💜 And the way you put that makes me think there's a bit more behind it.`,
    `Okay, I'm following. What happened next?`,
    `Hmm, I get what you mean. How did that land with you?`,
    `Yeah, that makes sense. What are you leaning towards doing now?`,
    `I'm with you. Keep going — I want to get the full picture.`,
    `Right, I see where you're coming from. What matters most to you here?`,
  ].filter((reply) => !previous.includes(reply.slice(0, 18).toLowerCase()));
  return pool[Math.floor(Math.random() * pool.length)] ?? `I'm with you 💜 What happened next?`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[]; companionName?: string };
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const companionName = body.companionName?.trim() || "My Gee";
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ reply: demoReply(messages, companionName), aiMode: "fallback" });

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
