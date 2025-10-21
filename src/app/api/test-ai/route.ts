import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing AI connection...');
    console.log('API Key available:', !!process.env.GOOGLE_AI_API_KEY || !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY);
    
    const result = await ai.generateText({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: 'Generate 3 simple questions for a customer feedback form about a restaurant.',
    });

    return NextResponse.json({
      success: true,
      result: result.text,
      apiKeySet: !!(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
    });
  } catch (error) {
    console.error('AI Test Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      apiKeySet: !!(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
    }, { status: 500 });
  }
}
