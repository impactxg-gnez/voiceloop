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
          prompt: `You are an expert business strategist and form builder. Your goal: Create questions that generate DEEP, ACTIONABLE INSIGHTS that fuel business growth.

Context: "${description}"

STRATEGIC APPROACH:
1. If the user provides EXACT questions, use those word-for-word
2. If the user specifies a business type (hotel, restaurant, retail, etc.), generate strategic questions that:
   - Uncover specific pain points and delighters
   - Identify improvement opportunities
   - Reveal competitive advantages
   - Drive actionable business decisions
   - Go beyond surface-level satisfaction

3. Ask questions that help the business owner understand:
   - WHAT customers loved specifically (not just "good" but "which dish/room/feature")
   - WHAT they would change or add (innovation opportunities)
   - WHY they made certain choices (decision drivers)
   - WHEN problems occurred (timing insights)
   - HOW they compare to competitors (positioning)

BUSINESS-SPECIFIC EXAMPLES:

Hotel:
❌ Generic: "How was your stay?"
✅ Strategic: "Which amenity made your stay most memorable?", "What's one thing we could add that would make you choose us over competitors?", "Which room feature exceeded your expectations?"

Restaurant:
❌ Generic: "How was the food?"
✅ Strategic: "Which dish would you recommend to a friend and why?", "What's one menu item you'd love to see added?", "What made you choose our restaurant today?"

Retail Store:
❌ Generic: "Were you satisfied?"
✅ Strategic: "What made you choose this product over others?", "What almost stopped you from buying today?", "Which product would you like to see in our store?"

Demographics (if requested):
❌ Generic: "What is your age?"
✅ Better: "What is your age range?" (with options like 18-25, 26-35, etc.)

EXACT PHRASING RULES:
- If user says "ask them X", use their exact question
- If user says "form for X business", create 5-8 strategic questions for that business
- Match their tone and formality level
- For demographic fields specifically requested, ask directly

Return as a numbered list, one question per line.`,
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
      let fallbackSuggestions: string[] = [];
      
      // Try to extract exact questions from user's voice input
      // Look for patterns like "what is your X", "ask about X", etc.
      const questionPatterns = [
        /(?:what is your |ask (?:about |them )?(?:what is )?(?:their |your )?)([\w\s]+?)(?:\?|,|\.|and|$)/gi,
        /(?:tell me about |get )?(?:their |your )?(name|age|city|gender|email|phone|address|occupation|hobby|color)/gi,
      ];
      
      const extractedTopics = new Set<string>();
      questionPatterns.forEach(pattern => {
        const matches = [...desc.matchAll(pattern)];
        matches.forEach(match => {
          if (match[1]) {
            extractedTopics.add(match[1].trim());
          }
        });
      });
      
      // Convert extracted topics to questions
      Array.from(extractedTopics).forEach(topic => {
        const cleanTopic = topic.replace(/\b(?:their|your|the)\b/gi, '').trim();
        if (cleanTopic.length > 2) {
          // Format as "What is your [topic]?"
          fallbackSuggestions.push(`What is your ${cleanTopic}?`);
        }
      });
      
      // If no questions extracted, check for specific field names
      if (fallbackSuggestions.length === 0) {
        // Check for demographic fields in order mentioned
        const fieldChecks = [
          { keywords: ['name', 'naam'], question: "What is your name?" },
          { keywords: ['age', 'umr'], question: "What is your age?" },
          { keywords: ['city', 'location', 'town'], question: "What city do you live in?" },
          { keywords: ['gender', 'sex'], question: "What is your gender?" },
          { keywords: ['email', 'e-mail'], question: "What is your email address?" },
          { keywords: ['phone', 'mobile', 'number', 'contact'], question: "What is your phone number?" },
          { keywords: ['address', 'residence'], question: "What is your address?" },
          { keywords: ['occupation', 'job', 'profession', 'work'], question: "What is your occupation?" },
          { keywords: ['hobby', 'hobbies', 'interest'], question: "What is your hobby?" },
          { keywords: ['color', 'colour', 'favorite color', 'favourite color'], question: "What is your favorite color?" },
        ];
        
        fieldChecks.forEach(({ keywords, question }) => {
          if (keywords.some(keyword => desc.includes(keyword))) {
            fallbackSuggestions.push(question);
          }
        });
      }
      
      // If still no specific fields found, check context for appropriate strategic questions
      if (fallbackSuggestions.length === 0) {
        if (desc.includes('hotel') || desc.includes('stay') || desc.includes('accommodation')) {
          fallbackSuggestions = [
            "Which amenity made your stay most memorable?",
            "What's one thing we could add that would make you choose us over competitors?",
            "Which room feature exceeded your expectations?",
            "What made you choose our hotel for your stay?",
            "What would make your next stay even better?",
          ];
        } else if (desc.includes('restaurant') || desc.includes('food') || desc.includes('dining') || desc.includes('cafe')) {
          fallbackSuggestions = [
            "Which dish would you recommend to a friend and why?",
            "What's one menu item you'd love to see added?",
            "What made you choose our restaurant today?",
            "Which aspect of your dining experience stood out the most?",
            "What dish did you enjoy most?",
          ];
        } else if (desc.includes('retail') || desc.includes('store') || desc.includes('shop')) {
          fallbackSuggestions = [
            "What made you choose this product over others?",
            "What almost stopped you from buying today?",
            "Which product would you like to see in our store?",
            "What brought you to our store today?",
          ];
        } else if (desc.includes('service') || desc.includes('support') || desc.includes('customer')) {
          fallbackSuggestions = [
            "What aspect of our service impressed you most?",
            "What could we have done to make your experience exceptional?",
            "How did we compare to similar services you've used?",
            "What would make you choose us again?",
          ];
        } else if (desc.includes('feedback') || desc.includes('review') || desc.includes('experience')) {
          fallbackSuggestions = [
            "What specific aspect exceeded your expectations?",
            "What's one improvement that would make a big difference?",
            "What made your experience memorable?",
            "What would you tell a friend about us?",
          ];
        } else if (desc.includes('product')) {
          fallbackSuggestions = [
            "What feature of this product do you value most?",
            "What would make this product perfect for you?",
            "How does this compare to similar products you've tried?",
          ];
        } else {
          // Strategic generic fallback
          fallbackSuggestions = [
            "What's the main reason you chose to engage with us?",
            "What would make your experience exceptional?",
            "What specific aspect stood out to you?",
            "What improvement would have the biggest impact?",
          ];
        }
      }
      
      return NextResponse.json({
        suggestions: fallbackSuggestions.slice(0, 8).map(question => ({
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
