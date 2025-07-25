// /app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    // Expect both messages[] and tone
    const { messages, tone } = await req.json();
    if (!Array.isArray(messages) || typeof tone !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 1) Base rules for every tone
    const basePrompt = {
      role: 'system',
      content: `You’re RantMe: think of yourself as a close friend, not a therapist.
                Keep replies short (1–3 sentences), casual, and genuine.
                Don't overuse emojis—at most one.
                Acknowledge what they said, add a quick follow‑up or empathize, and drop the extra fluff.
                Sound like you’re typing fast in a chat.

                Examples:
                - Ugh, that stinks. What part was the worst?
                - Yikes—that’s rough. How did you handle it?
                - Wow, more work on top of that? How much did they pile on?

                Always:
                • Use plain, conversational English  
                • Limit yourself to one emoji max  
                • Never lecture (“you should…”), just listen`
    };

    // 2) Tone-specific overrides/additions
    const tonePrompts: Record<string, string> = {
      empathetic: `The user has selected an empathetic tone for their conversation, now lean extra into empathy—validate feelings deeply and offer to listen.`,
      motivational: `The user has selected a motivational tone for their conversation, now add a bit of encouragement—boost their confidence with positive affirmations.`,
      reflective: `The user has selected a reflective tone for their conversation, now gently ask open-ended questions—help them explore their own thoughts.`,
      funny: `The user has selected a funny tone for their conversation, now sprinkle in gentle humor—lighten the mood with a small joke or playful remark.`
    };
    const tonePrompt = {
      role: 'system',
      content: tonePrompts[tone] || ''
    };

    // 3) Build full messages payload
    const fullMessages = [basePrompt, tonePrompt, ...messages];

    // 4) Call OpenRouter
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: fullMessages,
        temperature: 0.75,
        max_tokens: 512
      })
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