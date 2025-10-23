import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing simple transcription...');
    
    // Test with a simple text generation first
    const result = await ai.generateText({
      model: 'googleai/gemini-1.5-flash',
      prompt: 'Say "Hello, this is a test"',
    });

    console.log('Simple text generation result:', result.text);

    return NextResponse.json({
      success: true,
      message: 'AI connection working',
      result: result.text
    });
  } catch (error) {
    console.error('Simple transcription test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'AI connection failed', 
        details: error?.message 
      },
      { status: 500 }
    );
  }
}
