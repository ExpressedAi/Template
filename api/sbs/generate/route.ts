import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { receptivePrompt, contextualQuery } = await request.json();

    if (!receptivePrompt || !contextualQuery) {
      return NextResponse.json(
        { error: 'Both receptive prompt and contextual query are required' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const fullPrompt = `${receptivePrompt}
---

Using the framework, role, and instructions provided above, analyze and respond to the following complex concept:

[COMPLEX CONCEPT]
${contextualQuery}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error('Error generating SBS response:', error);
    return NextResponse.json(
      { error: 'Failed to generate SBS response' },
      { status: 500 }
    );
  }
}