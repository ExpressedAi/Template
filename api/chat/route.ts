import {
  GoogleGenerativeAI,
  Part,
  Content,
  FunctionCall,
} from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { toolDeclarations, executeTool, ToolResult } from "@/lib/tools";
import { neuralHighway } from "@/lib/neural-highway";

// Hardcoding the API key as requested.
const genAI = new GoogleGenerativeAI("AIzaSyD-tDr0hdkyFnJjqrEkP0D9qbCsimKiVxQ");

interface RequestBody {
  prompt: string;
  file?: {
    mimeType: string;
    data: string; // base64 encoded string
  };
  messages?: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    state?: string;
  }>;
  agentConfig?: {
    mainPrompt: string;
    commands: Array<any>;
    cartridges: Array<any>;
    updatedAt: number;
  };
  sessionId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, file, messages = [], agentConfig, sessionId } = (await req.json()) as RequestBody;

    // Debug logging
    console.log('Agent Config received:', {
      hasConfig: !!agentConfig,
      hasMainPrompt: !!agentConfig?.mainPrompt,
      mainPromptLength: agentConfig?.mainPrompt?.length || 0,
      commandsCount: agentConfig?.commands?.length || 0,
      cartridgesCount: agentConfig?.cartridges?.length || 0
    });

    if (!prompt && !file) {
      return NextResponse.json(
        { error: "Prompt or file is required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      tools: [{ functionDeclarations: toolDeclarations }] // Empty tools array - ready for REST API tools
    });

    // Build conversation history from previous messages
    const contents: Content[] = [];
    
    // Add system prompt with Neural Highway context
    if (agentConfig?.mainPrompt && agentConfig.mainPrompt.trim()) {
      let systemPrompt = agentConfig.mainPrompt;
      
      // 🧠👁️ ADD NEURAL HIGHWAY CONTEXT (including live vision analysis)
      if (sessionId) {
        try {
          const recentContext = await neuralHighway.getSessionContext(sessionId, 100); // Get enough for 50 vision + other contexts
          console.log('Retrieved Neural Highway context:', recentContext?.length || 0, 'items');
          
          if (recentContext && recentContext.length > 0) {
            // Get LAST 50 vision contexts for comprehensive visual timeline
            const allVisionContexts = recentContext.filter(ctx => ctx && ctx.agentId === 'vision').slice(0, 50);
            const otherContexts = recentContext.filter(ctx => ctx && ctx.agentId !== 'vision').slice(0, 5);
            
            let neuralContextAddendum = '\n\n--- NEURAL HIGHWAY LIVE CONTEXT ---\n';
            
            if (allVisionContexts.length > 0) {
              neuralContextAddendum += `👁️ LIVE SCREEN TIMELINE (${allVisionContexts.length} snapshots from GPT-4.1-nano):\n`;
              allVisionContexts.forEach((ctx, i) => {
                if (ctx && ctx.payload && ctx.timestamp) {
                  const timestamp = new Date(ctx.timestamp).toLocaleTimeString();
                  const analysis = ctx.payload.analysis || 'No analysis';
                  // Sanitize analysis to prevent role confusion
                  const cleanAnalysis = analysis.replace(/\b(user|model|assistant):/gi, 'person:');
                  neuralContextAddendum += `${timestamp}: ${cleanAnalysis}\n`;
                }
              });
            }
            
            if (otherContexts.length > 0) {
              neuralContextAddendum += '\n🧠 OTHER AGENT CONTEXT:\n';
              otherContexts.forEach((ctx, i) => {
                if (ctx && ctx.payload && ctx.agentId) {
                  try {
                    const preview = JSON.stringify(ctx.payload).slice(0, 150);
                    // Sanitize preview to prevent role confusion
                    const cleanPreview = preview.replace(/\b(user|model|assistant):/gi, 'person:');
                    neuralContextAddendum += `  ${i + 1}. [${ctx.agentId}]: ${cleanPreview}...\n`;
                  } catch (e) {
                    console.error('Error processing context payload:', e);
                  }
                }
              });
            }
            
            neuralContextAddendum += '--- END NEURAL HIGHWAY CONTEXT ---\n';
            systemPrompt += neuralContextAddendum;
          }
        } catch (error) {
          console.error('Failed to retrieve Neural Highway context for main chat:', error);
        }
      }
      
      contents.push({
        role: "user",
        parts: [{ text: `System: ${systemPrompt}` }]
      });
      contents.push({
        role: "model",
        parts: [{ text: "I understand. I'll follow those instructions and integrate the Neural Highway live context into my responses." }]
      });
    }
    
    // Add conversation history (excluding the last assistant message if it's "thinking")
    for (const msg of messages) {
      if (msg.role === "assistant" && (msg.state === "thinking" || msg.content === "")) {
        continue; // Skip thinking/empty assistant messages
      }
      
      contents.push({
        role: msg.role,
        parts: [{ text: msg.content }]
      });
    }

    // Build current message parts
    const currentParts: Part[] = [];
    if (prompt) {
      currentParts.push({ text: prompt });
    }
    if (file) {
      currentParts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data,
        },
      });
    }

    // Add current user message to conversation
    contents.push({ role: "user", parts: currentParts });

    const maxSteps = 8; // Safety cap for compositional loops

    // Compositional loop
    for (let step = 0; step < maxSteps; step++) {
      console.log('Sending request to Gemini, step:', step);
      const result = await model.generateContent({ contents });
      console.log('Received response from Gemini');
      const response = result.response;
      const functionCalls = response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        // Append the model's turn that contained the tool call(s)
        contents.push(response.candidates![0].content);

        // Execute each call in parallel
        const toolResults = await Promise.all(
          functionCalls.map(async (call: FunctionCall) => {
            return executeTool(call);
          })
        );

        // Append tool results to the conversation history
        contents.push({
          role: "user",
          parts: toolResults.map((toolResult: ToolResult) => ({
            functionResponse: {
              name: toolResult.name,
              response: toolResult.error
                ? { error: toolResult.error }
                : { result: toolResult.result },
            },
          })),
        });

        // Continue loop for possible composition
        continue;
      } else {
        // No function calls, so we have the final response.
        const streamResult = await model.generateContentStream({ contents });

        const readableStream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            for await (const chunk of streamResult.stream) {
              const text = chunk.text();
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            }
            controller.close();
          },
        });

        return new Response(readableStream, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    }

    // If loop finishes due to maxSteps, send a fallback message.
    const fallbackContent: Content[] = [
      ...contents,
      {
        role: "model",
        parts: [
          { text: "I seem to be stuck in a loop. Could you rephrase your request?" },
        ],
      },
    ];
    const streamResult = await model.generateContentStream({
      contents: fallbackContent,
    });
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of streamResult.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      },
    });
    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error in chat API route:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}