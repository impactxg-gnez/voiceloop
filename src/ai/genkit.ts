import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

console.log('Google AI API Key available:', !!apiKey);
console.log('API Key length:', apiKey ? apiKey.length : 0);

if (!apiKey) {
  console.error('No Google AI API key found in environment variables');
}

// Create a simple AI object that matches the expected interface using direct Google AI
export const ai = {
  generateText: async (options: any) => {
    try {
      const genAI = new GoogleGenerativeAI(apiKey, {
        apiVersion: 'v1'
      });
      const model = genAI.getGenerativeModel({ 
        model: "gemini-pro",
        generationConfig: {
          temperature: 0.7,
        }
      });
      
      const result = await model.generateContent(options.prompt);
      const response = await result.response;
      const text = response.text();
      
      return { text };
    } catch (error) {
      console.error('AI generateText error:', error);
      throw error;
    }
  }
};
