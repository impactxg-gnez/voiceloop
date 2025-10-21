import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ai } from '@/ai/genkit';

const FormSuggestionSchema = z.object({
  suggestions: z.array(z.object({
    question: z.string().describe('The question text'),
    type: z.enum(['voice', 'mc', 'ranking']).describe('The recommended question type'),
    options: z.array(z.string()).optional().describe('Options for MCQ or ranking questions')
  })).describe('Array of suggested questions with their recommended types'),
});

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    const result = await ai.generateObject({
      model: 'googleai/gemini-2.0-flash-exp',
      schema: FormSuggestionSchema,
      prompt: `You are an expert form builder. Based on the following description, generate 5-8 relevant questions with the most appropriate question type for each.

Description: "${description}"

Guidelines for generating questions:
1. Analyze the description and suggest the most appropriate question type for each question:
   - VOICE: For open-ended questions that need detailed, qualitative responses
   - MC: For questions with clear, limited answer choices (include 3-5 options)
   - RANKING: For questions asking users to prioritize or rank items (include items to rank)
2. Include questions about specific pain points or improvements
3. Ask about user experience and satisfaction
4. Include demographic or context questions when relevant
5. Make questions clear and easy to understand
6. Avoid leading or biased questions
7. For MC and RANKING questions, provide appropriate options
8. Focus on gathering valuable feedback for the described use case

Generate questions that would be most valuable for the described purpose.`,
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
