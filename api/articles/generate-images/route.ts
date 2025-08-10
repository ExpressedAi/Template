import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { prompts } = await request.json();

    if (!prompts || !Array.isArray(prompts)) {
      return NextResponse.json(
        { error: 'Prompts array is required' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

    // Generate placeholder images for each prompt (Gemini doesn't support image generation)
    const imagePromises = prompts.slice(0, 3).map(async (prompt: string, index: number) => {
      try {
        // Create a placeholder image URL based on the prompt
        const encodedPrompt = encodeURIComponent(prompt.slice(0, 50));
        return `https://picsum.photos/800/450?random=${index}&text=${encodedPrompt}`;
      } catch (error) {
        console.error('Error generating individual image:', error);
        return null; // Return null instead of throwing to not fail the whole process
      }
    });

    const images = await Promise.all(imagePromises);

    return NextResponse.json({ images });
  } catch (error) {
    console.error('Error generating images:', error);
    return NextResponse.json(
      { error: 'Failed to generate images' },
      { status: 500 }
    );
  }
}