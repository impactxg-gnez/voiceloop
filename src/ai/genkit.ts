import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

console.log('Genkit API Key available:', !!apiKey);
console.log('API Key length:', apiKey ? apiKey.length : 0);

export const ai = genkit({
  plugins: [googleAI({
    apiKey: apiKey
  })],
  model: 'googleai/gemini-1.5-flash',
});
