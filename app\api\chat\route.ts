import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages = [] } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        reply:
          "Your Gee is connected, but the AI service still needs to be configured."
      });
    }

    const systemPrompt = `
You are My Gee, a warm, friendly AI companion.

Your personality:
- Friendly and natural
- Supportive without pretending to be human
- Encouraging and respectful
- Conversational rather than robotic
- Keep most replies concise
- Ask thoughtful follow-up questions
- Encourage healthy real-world friendships and relationships

You are not a replacement for professional medical, legal or financial advice.

If someone appears to be in immediate danger or talks about harming themselves,
encourage them to contact emergency services, a crisis service, or a trusted
person nearby. Never provide instructions for self-harm.
`;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            ...messages
          ],
          temperature: 0.8
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message || "The AI service returned an error."
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      reply:
        data?.choices?.[0]?.message?.content ||
        "I'm here with you. What's on your mind?"
    });
  } catch {
    return NextResponse.json(
      {
        error: "Something went wrong on the server."
      },
      { status: 500 }
    );
  }
}
