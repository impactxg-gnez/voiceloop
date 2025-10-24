import { NextRequest, NextResponse } from 'next/server';
import { extractResponseFields } from '@/ai/flows/extract-response-fields';

export async function POST(request: NextRequest) {
  try {
    const { questionText, responseText } = await request.json();

    if (!questionText || !responseText) {
      return NextResponse.json(
        { error: 'Question text and response text are required' },
        { status: 400 }
      );
    }

    console.log('Extracting fields from response:', {
      question: questionText,
      response: responseText,
    });

    // Extract structured fields using AI
    const fields = await extractResponseFields(questionText, responseText);

    console.log('Extracted fields:', fields);

    return NextResponse.json({
      success: true,
      fields,
      questionText,
      responseText,
    });
  } catch (error: any) {
    console.error('Error in extract-fields API:', error);
    return NextResponse.json(
      {
        error: 'Failed to extract fields',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
