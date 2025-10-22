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
          prompt: `Analyze this form request: "${description}"

          Generate ONLY the specific questions requested. Be precise and follow the user's exact requirements.
          
          If the user asks for:
          - "demographic form with only name" → Generate only name-related questions
          - "demographic form with age and city" → Generate only age and city questions
          - "demographic form with name, age, gender" → Generate only name, age, gender questions
          - "customer feedback about restaurants" → Generate restaurant feedback questions
          
          Extract the specific fields/topics the user mentions and generate questions ONLY for those.
          Don't add extra fields that weren't requested.
          
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
      
      // Dynamic fallback suggestions based on description content
      const desc = description.toLowerCase();
      let fallbackSuggestions = [];
      
      // Extract specific fields mentioned in the description
      if (desc.includes('name')) {
        fallbackSuggestions.push("What is your full name?");
      }
      if (desc.includes('age')) {
        fallbackSuggestions.push("What is your age?");
      }
      if (desc.includes('city')) {
        fallbackSuggestions.push("What city do you live in?");
      }
      if (desc.includes('gender')) {
        fallbackSuggestions.push("What is your gender?");
      }
      if (desc.includes('email')) {
        fallbackSuggestions.push("What is your email address?");
      }
      if (desc.includes('phone')) {
        fallbackSuggestions.push("What is your phone number?");
      }
      if (desc.includes('address')) {
        fallbackSuggestions.push("What is your address?");
      }
      
      // If no specific fields found, use generic suggestions
      if (fallbackSuggestions.length === 0) {
        if (desc.includes('feedback') || desc.includes('review')) {
          fallbackSuggestions = [
            "What did you like most about your experience?",
            "What could we improve?",
            "How would you rate your overall satisfaction?",
            "Would you recommend us to others?",
            "Any additional comments or feedback?"
          ];
        } else {
          fallbackSuggestions = [
            "What is your main concern?",
            "How can we help you?",
            "What information do you need?",
            "What would you like to know?",
            "Any additional comments?"
          ];
        }
      }
      
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
