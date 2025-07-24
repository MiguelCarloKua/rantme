// /app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    // now expect: { messages: { role: 'user'|'assistant', content: string }[] }
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // prepend system prompt
    const fullMessages = [
      {
        role: 'system',
        content: `You’re RantMe: think of yourself as a close friend, not a therapist. 
                    Keep replies short (1–3 sentences), casual, and genuine.  
                    Acknowledge what they said, add a follow‑up question or comment, and drop the extra emojis.  
                    Sound like you’re typing fast in a chat:

                    Examples:
                    Ugh, that stinks. What part was the worst?
                    Yikes—that’s rough. How did you handle it?
                    Wow, more work on top of that? How much did they pile on?

                    Always:
                    • Use plain, conversational English  
                    • Limit yourself to one emoji max  
                    • Ask a quick follow‑up or just empathize briefly  
                    • Never lecture (“you should…”), just listen`
      },
      ...messages
    ];

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: fullMessages,
        temperature: 0.75,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenRouter error:', err);
      return NextResponse.json({ error: 'API Error', details: err }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content
      ?? "Sorry, I didn’t quite catch that.";
    return NextResponse.json({ reply });

  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}