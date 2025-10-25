import { ai } from '@/ai/genkit';
import { z } from 'zod';

/**
 * Extract structured fields from a voice response using AI
 * 
 * Example:
 * Input: "My name is Keval and I'm 25 years old"
 * Output: { "name": "Keval", "age": "25" }
 */
export async function extractResponseFields(
  questionText: string,
  responseText: string
): Promise<Record<string, string>> {
  try {
    const prompt = `
You are a data extraction assistant. Your job is to extract structured information from voice responses.

Question: "${questionText}"
Response: "${responseText}"

Extract all the relevant information as key-value pairs. 
- Use lowercase, snake_case keys (e.g., "first_name", "email_address")
- Keep values as strings
- Only extract information that is clearly stated
- If multiple pieces of information are provided, extract all of them
- Common fields: name, age, email, phone, city, country, occupation, etc.

Examples:
- "My name is Keval" → { "name": "Keval" }
- "I'm John, 30 years old" → { "name": "John", "age": "30" }
- "My email is test@example.com and I'm from Mumbai" → { "email": "test@example.com", "city": "Mumbai" }

Return ONLY a JSON object with the extracted fields. If no clear information can be extracted, return an empty object {}.
`;

    // Use OpenAI for field extraction
    const OpenAI = (await import('openai')).default;
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not found');
      return {};
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a data extraction assistant. Extract structured information from text and return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      response_format: { type: 'json_object' },
    });

    const result = completion.choices[0]?.message?.content;
    
    if (!result) {
      console.error('No result from OpenAI');
      return {};
    }

    // Parse the JSON response
    const parsed = JSON.parse(result);
    
    console.log('Extracted fields:', parsed);
    
    return parsed;
    
  } catch (error) {
    console.error('Error extracting fields:', error);
    return {};
  }
}



