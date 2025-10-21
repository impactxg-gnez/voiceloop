import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    console.log('Generating suggestions for:', description);

    // First try a simple text generation to test the connection
    const result = await ai.generateText({
      model: 'googleai/gemini-1.5-flash',
      prompt: `Generate 5 customer feedback questions for: "${description}". 
      
      Return the questions as a simple list, one per line.`,
    });

    console.log('AI Response:', result.text);

    // Parse the response into individual questions
    const questions = result.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, ''))
      .slice(0, 8); // Limit to 8 questions

    // Convert to the expected format
    const suggestions = questions.map(question => ({
      question,
      type: 'voice' as const,
      options: []
    }));

    return NextResponse.json({
      suggestions,
    });
  } catch (error) {
    console.error('Error generating form suggestions:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      description
    });
    return NextResponse.json(
      { 
        error: 'Failed to generate suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
