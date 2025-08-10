import { NextRequest, NextResponse } from "next/server";
import { createOpenAIProvider } from "@/lib/openai-provider";
import { neuralHighway, createNeuralContext } from "@/lib/neural-highway";

interface RequestBody {
  imageData: string;
  prompt: string;
  tokenLimit?: number;
  sessionId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { imageData, prompt, tokenLimit = 50, sessionId } = (await req.json()) as RequestBody;

    if (!imageData || !prompt) {
      return NextResponse.json(
        { error: "Image data and prompt are required" },
        { status: 400 }
      );
    }

    // Use your OpenAI key for vision analysis with GPT-4.1-nano
    const openaiKey = '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';
    const provider = createOpenAIProvider(openaiKey, 'gpt-4.1-nano-2025-04-14');

    const result = await provider.generateVisionAnalysis(imageData, prompt, tokenLimit);

    // 🧠👁️ BROADCAST VISION ANALYSIS TO NEURAL HIGHWAY
    if (sessionId && result) {
      try {
        await neuralHighway.broadcastContextPulse(
          createNeuralContext('vision', 'screen-analysis', {
            analysis: result,
            prompt: prompt,
            timestamp: Date.now(),
            model: 'gpt-4.1-nano-2025-04-14',
            tokenLimit: tokenLimit
          }, sessionId, 'urgent') // Vision is URGENT priority!
        );
        console.log('🧠👁️ Vision analysis broadcasted to Neural Highway!');
      } catch (error) {
        console.error('Failed to broadcast vision analysis to Neural Highway:', error);
      }
    }

    return new Response(result, {
      headers: { 
        "Content-Type": "text/plain; charset=utf-8",
      },
    });

  } catch (error) {
    console.error("Error in vision analysis API route:", error);
    return NextResponse.json(
      { error: "An error occurred while processing vision analysis." },
      { status: 500 }
    );
  }
}