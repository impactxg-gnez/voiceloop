import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing OpenAI directly...');
    
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'No OpenAI API key found',
        message: 'Please add OPENAI_API_KEY to your Vercel environment variables',
        envVars: {
          OPENAI_API_KEY: false
        }
      });
    }

    // Use OpenAI directly
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say 'Hello, OpenAI test successful'" }],
      max_tokens: 10,
    });

    return NextResponse.json({
      success: true,
      message: 'OpenAI direct connection working',
      result: completion.choices[0].message.content,
      modelName: 'gpt-3.5-turbo',
      apiKeyLength: apiKey.length
    });
  } catch (error) {
    console.error('OpenAI direct test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'OpenAI direct connection failed', 
        details: error?.message 
      },
      { status: 500 }
    );
  }
}
