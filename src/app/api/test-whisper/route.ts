import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Whisper/OpenAI connection...');
    
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not found',
        message: 'Please add OPENAI_API_KEY to your Vercel environment variables',
        envVars: {
          OPENAI_API_KEY: false
        }
      });
    }

    console.log('OpenAI API key found, length:', apiKey.length);

    // Test OpenAI connection with a simple completion
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Test with a simple text completion first
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say 'Hello, Whisper test successful'" }],
      max_tokens: 10,
    });

    return NextResponse.json({
      success: true,
      message: 'OpenAI connection working',
      result: completion.choices[0].message.content,
      apiKeyLength: apiKey.length,
      model: 'gpt-3.5-turbo'
    });
  } catch (error) {
    console.error('OpenAI test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'OpenAI connection failed', 
        details: error?.message,
        envVars: {
          OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
        }
      },
      { status: 500 }
    );
  }
}


