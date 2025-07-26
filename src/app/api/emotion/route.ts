// /app/api/emotion/route.ts
import { NextRequest, NextResponse } from 'next/server';

type HFLabel = { label: string; score: number };
type HFResponse = HFLabel[][];

const HF_API_URL = 'https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Invalid text' }, { status: 400 });
    }

    const resp = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('HF inference error:', err);
      return NextResponse.json({ error: 'Inference error', details: err }, { status: 500 });
    }

    const data: HFResponse = await resp.json();

    // Expect data to be [ [ {label, score}, ... ] ]
    if (!Array.isArray(data) || data.length === 0 || !Array.isArray(data[0])) {
      return NextResponse.json({ label: 'neutral' });
    }

    // Filter out any empty labels, sort by highest score
    const candidates = data[0].filter(item => typeof item.label === 'string' && item.label);
    if (candidates.length === 0) {
      return NextResponse.json({ label: 'neutral' });
    }

    const top = candidates.sort((a, b) => b.score - a.score)[0];
    const label = top.label.toLowerCase();

    // Log the detected emotion
    console.log(`Detected emotion: ${label} (score: ${top.score.toFixed(4)})`);

    return NextResponse.json({ label });

  } catch (err) {
    console.error('Emotion route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}