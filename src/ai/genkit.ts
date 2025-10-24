import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google AI with API key
const getGoogleAI = () => {
  const apiKey = process.env.GOOGLE_AI_API_KEY || 
                 process.env.GEMINI_API_KEY || 
                 process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    console.warn('No Google AI API key found. AI features will use fallback responses.');
    return null;
  }
  
  return new GoogleGenerativeAI(apiKey);
};

// AI service wrapper for text generation
export const ai = {
  generateText: async (options: { model: string; prompt: string }) => {
    const googleAI = getGoogleAI();
    
    if (!googleAI) {
      throw new Error('Google AI not configured');
    }
    
    try {
      // Extract model name (remove 'googleai/' prefix if present)
      const modelName = options.model.replace('googleai/', '');
      
      console.log(`Generating text with model: ${modelName}`);
      
      const model = googleAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(options.prompt);
      const response = await result.response;
      const text = response.text();
      
      return { text };
    } catch (error) {
      console.error('Google AI generation error:', error);
      throw error;
    }
  }
};
