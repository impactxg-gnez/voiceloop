import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ai } from '@/ai/genkit';

const FormSuggestionSchema = z.object({
  suggestions: z.array(z.string()).describe('Array of suggested questions for the form'),
});

export async function POST(request: NextRequest) {
  try {
    const { description, formType = 'voice' } = await request.json();

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    const formTypeInstructions = {
      voice: 'Generate open-ended questions that encourage detailed voice responses. Focus on qualitative feedback.',
      mcq: 'Generate multiple choice questions with 3-5 options each. Include both the question and the answer choices.',
      ranking: 'Generate questions that ask users to rank or prioritize items. Include the items to be ranked.'
    };

    const result = await ai.generateObject({
      model: 'googleai/gemini-2.5-flash',
      schema: FormSuggestionSchema,
      prompt: `You are an expert form builder. Based on the following description and form type, generate 5-8 relevant questions.

Description: "${description}"
Form Type: ${formType}

${formTypeInstructions[formType as keyof typeof formTypeInstructions]}

Guidelines for generating questions:
1. Focus on questions that match the specified form type
2. Include questions about specific pain points or improvements
3. Ask about user experience and satisfaction
4. Include demographic or context questions when relevant
5. Make questions clear and easy to understand
6. Avoid leading or biased questions
7. Consider both quantitative and qualitative feedback

Generate questions that would be most valuable for ${formType}-based feedback collection.`,
    });

    return NextResponse.json({
      suggestions: result.object.suggestions,
    });
  } catch (error) {
    console.error('Error generating form suggestions:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      description,
      formType
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
