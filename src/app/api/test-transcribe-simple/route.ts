import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing simple transcription...');
    
    console.log('Environment variables check:');
    console.log('GOOGLE_GENERATIVE_AI_API_KEY:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    console.log('GOOGLE_AI_API_KEY:', !!process.env.GOOGLE_AI_API_KEY);
    console.log('GEMINI_API_KEY:', !!process.env.GEMINI_API_KEY);
    
    // Test with a simple text generation first
    const result = await ai.generateText({
      prompt: 'Say "Hello, this is a test"',
    });

    console.log('Simple text generation result:', result.text);

    return NextResponse.json({
      success: true,
      message: 'AI connection working',
      result: result.text,
      envVars: {
        GOOGLE_GENERATIVE_AI_API_KEY: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        GOOGLE_AI_API_KEY: !!process.env.GOOGLE_AI_API_KEY,
        GEMINI_API_KEY: !!process.env.GEMINI_API_KEY
      }
    });
  } catch (error) {
    console.error('Simple transcription test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'AI connection failed', 
        details: error?.message,
        envVars: {
          GOOGLE_GENERATIVE_AI_API_KEY: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
          GOOGLE_AI_API_KEY: !!process.env.GOOGLE_AI_API_KEY,
          GEMINI_API_KEY: !!process.env.GEMINI_API_KEY
        }
      },
      { status: 500 }
    );
  }
}
