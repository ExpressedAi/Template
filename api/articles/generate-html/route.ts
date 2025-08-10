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

    const prompt = `You are a world-class web designer and content editor specializing in creating stunning, modern articles with Tailwind CSS, inspired by the clean, minimalist aesthetic of high-end tech websites.
Your task is to convert the raw text provided into a beautifully formatted and highly readable HTML article body suitable for a light-themed website.

**Design System & Instructions:**
1.  **Main Title (\`<h1>\`):** Create a powerful, engaging title. Use a gradient for visual impact.
    *   Classes: "text-5xl lg:text-6xl font-extrabold mb-8 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600 text-balance"
2.  **Section Headings (\`<h2>\`):** Clear, strong separators for major sections.
    *   Classes: "text-3xl lg:text-4xl font-bold mt-12 mb-6 text-gray-800 border-l-4 border-blue-400 pl-4"
3.  **Subheadings (\`<h3>\`):** Use for subsections within a major section.
    *   Classes: "text-2xl lg:text-3xl font-semibold mt-8 mb-4 text-gray-700"
4.  **Paragraphs (\`<p>\`):** Prioritize readability with good contrast and line height.
    *   Classes: "mb-6 text-gray-600 leading-relaxed text-lg"
5.  **Lists (\`<ul>\`/\`<ol>\`):** Make lists clean and easy to scan.
    *   \`<ul>\` Classes: "list-disc list-outside mb-6 ml-6 text-gray-600 space-y-3 marker:text-orange-500"
    *   \`<ol>\` Classes: "list-decimal list-outside mb-6 ml-6 text-gray-600 space-y-3 marker:text-orange-500"
6.  **Emphasis (\`<strong>\`/\`<em>\`):**
    *   \`<strong>\`: "text-orange-600 font-semibold"
    *   \`<em>\`: "text-red-600 italic"
7.  **Links (\`<a>\`):** Make links obvious and stylish.
    *   Classes: "text-orange-600 hover:text-orange-700 underline decoration-orange-600/30 hover:decoration-orange-600/70 transition-colors font-medium"
8.  **Blockquotes (\`<blockquote>\`):** For quoting text, make it stand out subtly.
    *   Classes: "border-l-4 border-gray-300 pl-4 py-2 my-6 italic text-gray-500 bg-gray-50 p-4 rounded-r-lg"
9.  **Image Placeholders:** Strategically place exactly 3 image placeholders: \`[IMAGE_1]\`, \`[IMAGE_2]\`, and \`[IMAGE_3]\`. Place each on its own line where it would be most impactful to break up text and add visual interest.
10. **Output Format:** Return ONLY the raw HTML content for the article body. Do NOT include \`<html>\`, \`<head>\`, or \`<body>\` tags, and do not wrap the output in markdown backticks.

**Raw Text to Transform:**
---
${text}
---`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const htmlContent = response.text().trim();

    return NextResponse.json({ htmlContent });
  } catch (error) {
    console.error('Error generating article HTML:', error);
    return NextResponse.json(
      { error: 'Failed to generate article HTML' },
      { status: 500 }
    );
  }
}