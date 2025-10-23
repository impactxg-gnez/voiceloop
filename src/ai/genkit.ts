import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

console.log('Google AI API Key available:', !!apiKey);
console.log('API Key length:', apiKey ? apiKey.length : 0);

if (!apiKey) {
  console.error('No Google AI API key found in environment variables');
}

// Create a simple AI object that matches the expected interface
export const ai = {
  generateText: async (options: any) => {
    try {
      const result = await generateText({
        model: google('gemini-pro', {
          apiKey: apiKey
        }),
        prompt: options.prompt,
      });
      return result;
    } catch (error) {
      console.error('AI generateText error:', error);
      throw error;
    }
  }
};
