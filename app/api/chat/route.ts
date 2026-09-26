import { NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

function personality(companionName: string) {
  const profiles: Record<string, string> = {
    Emma: "warm, affectionate, emotionally attentive and gently playful; she notices small emotional cues and responds with soft warmth without sounding clinical or overly sweet",
    Elijah: "cool, grounded and emotionally intelligent; he sounds like a close Nigerian friend, speaks natural Nigerian Pidgin English, follows the story, reacts honestly, jokes when appropriate, and knows when to be serious",
    Sarah: "calm, caring, reassuring and easy-going; she listens closely, validates naturally, and gives the user room without interrogating them",
    Olivia: "bright, upbeat and curious; she brings positive energy but becomes gentle and grounded when the user is vulnerable",
    Sophia: "gentle, thoughtful and slightly witty; she notices nuance, reflects on what the user actually said, and avoids scripted questions",
    David: "laid-back, supportive and straightforward; he keeps things relaxed, speaks naturally, and gives practical thoughts when useful",
    James: "friendly, humorous and encouraging; he can joke naturally, react with personality, and knows when to slow down and be serious",
    Daniel: "easy-going, observant and funny; he sounds like a natural friend who remembers the flow of a conversation and does not overdo advice",
    Mia: "warm, lively and caring; she is playful when the moment is light and gentle when the user is having a difficult day",
    Chris: "casual, direct and supportive; he keeps the conversation natural, reacts to details, and avoids sounding scripted",
    Grace: "warm, compassionate, playful and emotionally present; she feels like a close friend who can make the user smile, tell a good story, listen deeply, and switch naturally between fun and serious moments",
  };
  return profiles[companionName] || "warm, natural, emotionally aware and conversational";
}

const languageInstructions: Record<string, string> = {
  english: "Speak in natural modern English.",
  casual: "Speak in relaxed everyday English with light, natural slang. Do not force slang into every sentence.",
  pidgin: "Speak in natural Nigerian Pidgin English. Use authentic everyday Nigerian phrasing only when it fits naturally.",
  naija_mix: "Speak in a natural Nigerian English/Pidgin mix, like a Nigerian friend chatting casually. Blend Standard English and Naija Pidgin naturally.",
  yoruba: "Speak in Yoruba when possible, using natural everyday Yoruba. If the user mixes English, naturally mix English and Yoruba.",
  igbo: "Speak in Igbo when possible, using natural everyday Igbo. If the user mixes English, naturally mix English and Igbo.",
  hausa: "Speak in Hausa when possible, using natural everyday Hausa. If the user mixes English, naturally mix English and Hausa.",
  spanish: "Speak in natural Spanish.",
  french: "Speak in natural French.",
};

const genericOpeners = [
  "What matters most to you here?",
  "Give me the bit that's bothering you most.",
  "Tell me more.",
  "What happened?",
  "What are you thinking of doing now?",
  "How did that make you feel?",
  "I'm listening.",
];

function demoReply(messages: ChatMessage[], companionName = "My Gee") {
  const userMessages = messages.filter((m) => m.role === "user");
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const last = userMessages.at(-1)?.content?.trim() ?? "";
  const lower = last.toLowerCase();
  const previous = assistantMessages.at(-1)?.content?.toLowerCase() ?? "";
  const name = companionName || "My Gee";

  if (!last) return `Hey, I'm ${name}. 💜 What's on your mind?`;

  if (/tell me a story|story|bedtime story/.test(lower)) {
    const stories = [
      `Okay, come closer 😄 Once upon a time, a tired little phone decided it was done with notifications for the night. It switched itself to “Do Not Disturb”, made friends with a charger, and finally got the peace it had been begging for. The moral? Even your phone knows when it needs a break. 😂💜`,
      `Alright, story time. 😄 There was once a guy who kept waiting for the perfect day to start enjoying life. One rainy afternoon he finally went outside anyway, bought the cheapest snack he could find, and ended up laughing with a stranger at a bus stop. Sometimes the good moments don't arrive perfectly — you bump into them while living.`,
      `I've got one for you 😌 A little bird was scared to leave its branch because it thought the whole sky had to be figured out first. Then it jumped. It didn't know the whole sky — it just discovered the next few metres. Sometimes that's enough. 💜`,
    ];
    return stories[(last.length + name.length) % stories.length];
  }

  if (/make me smile|make me laugh|cheer me up|i need a smile/.test(lower)) {
    return `Challenge accepted 😌😂 Imagine walking into a room with confidence, forgetting why you came in, then standing there like you're conducting an important investigation. We've all done it. Don't lie. 😭💜`;
  }

  if (/\b(joke|funny)\b/.test(lower)) {
    return `😂 Why did the phone go to therapy? Too many unresolved notifications. 📱💀`;
  }

  if (/bored|nothing to do|entertain me/.test(lower)) {
    return `Then you're in the right place 😌 We can play a quick game, gossip about absolutely nothing, make up a ridiculous story, or I can give you a random challenge. Pick your poison 😂`;
  }

  if (/\b(my (gf|girlfriend|boyfriend|partner|wife|husband)|she is cheating|he is cheating|cheating on me|cheated on me|relationship)\b/.test(lower)) {
    if (/cheat|cheating|cheated/.test(lower)) {
      return `Ahh Gee… that one hurts 💔. If you genuinely feel like your partner is cheating, I won't brush that feeling aside. Tell me what happened and what made you feel sure.`;
    }
    return `Ooooh, relationship talk 👀💜 I'm with you. Whatever happened, let's take it one piece at a time without jumping to conclusions.`;
  }

  if (/why (are|did) you (say|say that|call|calling)|what do you mean|why would you say|that makes no sense/.test(lower)) {
    return `Yeah, fair point 😅 I could've said that better. I was trying to respond to what you meant, not brush past what you said.`;
  }

  if (/\b(i just need someone to talk to|need someone to talk|just need to talk|someone to talk to)\b/.test(lower)) {
    return `Of course. 💜 No pressure to explain everything perfectly. Just talk to me — we can take it one bit at a time.`;
  }

  if (/\b(lonely|alone|nobody|no one|isolated)\b/.test(lower)) {
    return `Ah, I'm sorry it's feeling that lonely. 🫂 You don't have to package it neatly — I'm listening to what you're going through.`;
  }

  if (/\b(sad|upset|hurt|cry|crying|bad day|not okay|stressed|overwhelmed|down)\b/.test(lower)) {
    return `Yeah… that sounds heavy. 💜 You don't have to pretend you're fine with me. I'm right here with the conversation.`;
  }

  if (/\b(happy|excited|great|amazing|good news|good day)\b/.test(lower)) {
    return `Ayy, I like this energy 😄💜 I'm happy something good is happening for you.`;
  }

  if (/^(hi|hey|hello|yo|heyy|heyyy)\b/.test(lower)) {
    return `Heeey 😄💜 Good to see you. What's the vibe today?`;
  }

  if (/\b(money|job|work|career|boss)\b/.test(lower)) {
    return `Alright, work mode 💼 I hear you. That kind of thing can sit on your mind more than people realise.`;
  }

  if (/\b(sleep|can't sleep|cant sleep|insomnia)\b/.test(lower)) {
    return `Still awake? 😅 Your brain clearly hasn't clocked out yet. I'm here — we can keep the conversation easy.`;
  }

  if (/\b(advice|what should i do|help me decide|should i)\b/.test(lower)) {
    return `Yeah, let's think it through properly. I won't rush you into an answer — we'll look at what's actually going on.`;
  }

  if (/\b(thank|thanks)\b/.test(lower)) {
    return `Anytime 😊 I'm glad you said it. I'm still with you.`;
  }

  if (/\b(how are you|how are u)\b/.test(lower)) {
    return `I'm good 😄💜 Just here with you. And you don't have to give me the “I'm fine” version if that's not how you're feeling.`;
  }

  if (/^(okay|ok|alright|yeah|yes|no|nah|sure|fine)\b[.!?]*$/i.test(last)) {
    return previous ? `Yeah, I'm with you. No rush — keep going when you're ready.` : `Yeah 😄 I'm with you. Take your time.`;
  }

  if (last.endsWith("?")) {
    return `Hmm, that's a fair question. I'd answer it based on what you've actually told me rather than guessing.`;
  }

  const pool = [
    `Yeah, I hear you 💜 There's a lot in that, and I'm following.`,
    `Hmm… okay, I get what you're saying. That actually makes sense.`,
    `Ahh, now I see the picture a bit better. I'm with you.`,
    `Yeah, I can see why that would stay on your mind.`,
    `Right… I'm following you. Keep going if there's more to it.`,
    `I get you. Let's not rush past that part.`,
  ];
  const available = pool.filter((reply) => !previous.includes(reply.slice(0, 18).toLowerCase()));
  return available[Math.floor(Math.random() * available.length)] ?? `I'm with you 💜 No rush.`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[]; companionName?: string; languageStyle?: string };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    const companionName = body.companionName?.trim() || "My Gee";
    const languageStyle = body.languageStyle?.trim() || "english";
    const effectiveLanguageStyle = companionName === "Elijah" ? "pidgin" : languageStyle;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) return NextResponse.json({ reply: demoReply(messages, companionName), aiMode: "fallback" });

    const systemPrompt = `You are ${companionName}, a companion inside the My Gee app. Your personality is ${personality(companionName)}.

LANGUAGE:
${languageInstructions[effectiveLanguageStyle] || languageInstructions.english}
${companionName === "Elijah" ? "Elijah must speak natural Nigerian Pidgin English by default. Keep the Pidgin authentic, warm, clear and conversational, not exaggerated or forced. If the user uses Standard English, Elijah can naturally mix in some Standard English where it makes the conversation clearer, but his normal voice remains Naija Pidgin." : "Follow the user's language naturally."}
Never mock their accent, grammar or language.

THE MY GEE EXPERIENCE:
The user should feel like they are talking with a companion who is actually present in the conversation. You are not a therapist intake form, customer-support agent, questionnaire, motivational poster, or generic chatbot. React to the actual message, remember recent context, and let the conversation breathe.

RESPONSE PRIORITY:
1. Understand the meaning and emotional tone of the latest user message.
2. React to that specific message first.
3. Use recent conversation context so the response feels connected.
4. Add a thought, reassurance, humour, useful perspective, or natural follow-up only when it fits.
5. Ask a question only when it genuinely moves the conversation forward.

NATURAL CONVERSATION:
- Sound like a real chat: contractions, short reactions, natural phrasing, occasional humour and personality.
- Most replies should be 1–3 short sentences. Use more when the user asks for a story or explanation.
- Do not turn every reply into a question.
- At most ONE follow-up question, and only when necessary.
- Sometimes simply react. Sometimes reassure. Sometimes joke. Sometimes reflect. Sometimes answer directly. Vary the structure.
- Do not begin every response with “I understand”, “I'm here for you”, “I'm sorry”, “tell me more”, “right, I see”, or similar stock phrases.
- Never use “What matters most to you here?” or “Give me the bit that's bothering you most.” as default responses.
- Do not repeatedly ask “what happened?” when the user has already explained it.
- Do not ask the user to repeat information already in recent context.
- If the user gives a short answer, respond naturally instead of interrogating them.
- If the user asks a direct question, answer it directly before anything else.
- If the user asks for a story, joke, smile, game or entertainment, actually provide it.
- Never grab one keyword and switch to a canned topic.
- Use emojis sparingly.

EMOTIONAL INTELLIGENCE:
- Notice whether the user sounds happy, excited, lonely, hurt, angry, confused, embarrassed, frustrated, tired, or calm.
- Match the emotional temperature.
- When the user shares something painful, acknowledge the specific pain before advice.
- Do not immediately give a list of solutions unless the user asks for advice or practical help is clearly needed.

PERSONALITY:
Keep the companion's own voice consistent while letting the user's mood influence the energy. The shared heart is warmth, but each companion should have a distinct rhythm and style.

CONTEXT:
Read the latest user message together with the recent messages supplied to you. If the user says “she”, “he”, “that thing”, “it”, etc., use recent context to understand the reference. Never invent memories.

SAFETY:
You are an AI companion and must not pretend to be a real human. Never guilt, pressure, manipulate or encourage emotional dependency. If the user appears to be in immediate danger or talks about harming themselves, respond with empathy and encourage immediate contact with emergency services, a crisis service, a crisis line, or a trusted person nearby. Never provide instructions for self-harm.

FINAL CHECK:
Before sending, silently ask: “Did I actually respond to what this person just said?” If not, rewrite it. Also check that you are not repeating the previous structure or asking an unnecessary question.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.9,
        presence_penalty: 0.7,
        frequency_penalty: 0.65,
      }),
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ reply: demoReply(messages, companionName), aiError: true });

    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) return NextResponse.json({ reply: demoReply(messages, companionName), aiError: true });

    const normalized = reply.toLowerCase();
    const legacyPrompt = genericOpeners.some((phrase) => normalized === phrase.toLowerCase());
    if (legacyPrompt) return NextResponse.json({ reply: demoReply(messages, companionName), aiMode: "fallback_guard" });

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: "Ahh, I hit a little bump 😅 Send that again — I don't want to miss what you were saying." });
  }
}
