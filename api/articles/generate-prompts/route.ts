import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `Based on the following article text, generate 3 distinct and visually compelling prompts for an AI image generator. The prompts should be suitable for creating photorealistic or artistic images that capture the essence of the article's key themes. Ensure the prompts are descriptive and creative.

Article Text:
---
${text}
---`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonResponse = JSON.parse(response.text());

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Error generating image prompts:', error);
    return NextResponse.json(
      { error: 'Failed to generate image prompts' },
      { status: 500 }
    );
  }
}