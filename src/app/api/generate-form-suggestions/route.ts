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
    console.log('API Key available:', !!(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY));

    // Try multiple model names as fallback
    const models = [
      'googleai/gemini-1.5-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro'
    ];

    let result;
    let lastError;

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        result = await ai.generateText({
          model: model,
          prompt: `Generate 5 customer feedback questions for: "${description}". 
          
          Return the questions as a simple numbered list, one per line.`,
        });
        console.log(`Success with model: ${model}`);
        break;
      } catch (error) {
        console.log(`Failed with model ${model}:`, error);
        lastError = error;
        continue;
      }
    }

    if (!result) {
      console.log('All AI models failed, using fallback suggestions');
      // Fallback suggestions based on description keywords
      const fallbackSuggestions = [
        "What did you like most about your experience?",
        "What could we improve?",
        "How would you rate your overall satisfaction?",
        "Would you recommend us to others?",
        "Any additional comments or feedback?"
      ];
      
      return NextResponse.json({
        suggestions: fallbackSuggestions.map(question => ({
          question,
          type: 'voice' as const,
          options: []
        })),
      });
    }

    console.log('AI Response:', result.text);

    // Parse the response into individual questions
    const questions = result.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && (line.match(/^\d+\./) || line.match(/^[•\-\*]/)))
      .map(line => line.replace(/^[\d\.\•\-\*]\s*/, ''))
      .filter(q => q.length > 0) // Remove empty questions
      .slice(0, 8); // Limit to 8 questions

    console.log('Parsed questions:', questions);
    console.log('Question count:', questions.length);

    // If no questions were parsed, try a different approach
    if (questions.length === 0) {
      console.log('No questions parsed, trying alternative parsing...');
      const altQuestions = result.text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 10) // Questions should be reasonably long
        .slice(0, 8);
      
      console.log('Alternative questions:', altQuestions);
      
      if (altQuestions.length > 0) {
        questions.push(...altQuestions);
      }
    }

    // Convert to the expected format
    const suggestions = questions.map(question => ({
      question: question.trim(),
      type: 'voice' as const,
      options: []
    })).filter(s => s.question.length > 0);

    console.log('Final suggestions:', suggestions);

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
