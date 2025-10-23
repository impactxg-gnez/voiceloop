import { NextRequest, NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';

export async function GET(request: NextRequest) {
  try {
    console.log('Listing available models...');
    
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'No API key found',
        envVars: {
          GOOGLE_GENERATIVE_AI_API_KEY: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
          GOOGLE_AI_API_KEY: !!process.env.GOOGLE_AI_API_KEY,
          GEMINI_API_KEY: !!process.env.GEMINI_API_KEY
        }
      });
    }

    // Try to create a simple model instance to test
    const model = google('gemini-1.0-pro', {
      apiKey: apiKey
    });

    return NextResponse.json({
      success: true,
      message: 'Model created successfully',
      modelName: 'gemini-1.0-pro',
      apiKeyLength: apiKey.length
    });
  } catch (error) {
    console.error('List models error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to list models', 
        details: error?.message 
      },
      { status: 500 }
    );
  }
}
