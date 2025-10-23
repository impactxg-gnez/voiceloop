import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Google AI directly...');
    
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

    // Use Google Generative AI directly
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
      }
    });

    const result = await model.generateContent("Say 'Hello, this is a test'");
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      success: true,
      message: 'Google AI direct connection working',
      result: text,
      modelName: 'gemini-1.5-flash',
      apiKeyLength: apiKey.length
    });
  } catch (error) {
    console.error('Google AI direct test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Google AI direct connection failed', 
        details: error?.message 
      },
      { status: 500 }
    );
  }
}
