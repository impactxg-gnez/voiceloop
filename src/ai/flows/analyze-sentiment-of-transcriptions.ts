'use server';
/**
 * @fileOverview A sentiment analysis AI agent for transcriptions.
 *
 * - analyzeSentiment - A function that handles the sentiment analysis process.
 * - AnalyzeSentimentInput - The input type for the analyzeSentiment function.
 * - AnalyzeSentimentOutput - The return type for the analyzeSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeSentimentInputSchema = z.object({
  text: z.string().describe('The text to analyze for sentiment.'),
});
export type AnalyzeSentimentInput = z.infer<typeof AnalyzeSentimentInputSchema>;

const AnalyzeSentimentOutputSchema = z.object({
  sentimentLabel: z.enum(['neg', 'neu', 'pos']).describe('The sentiment label of the text.'),
  sentimentScore: z.number().describe('The sentiment score of the text in the range [-1, 1].'),
});
export type AnalyzeSentimentOutput = z.infer<typeof AnalyzeSentimentOutputSchema>;

export async function analyzeSentiment(input: AnalyzeSentimentInput): Promise<AnalyzeSentimentOutput> {
  return analyzeSentimentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSentimentPrompt',
  input: {schema: AnalyzeSentimentInputSchema},
  output: {schema: AnalyzeSentimentOutputSchema},
  prompt: `Analyze the sentiment of the following text and return a JSON object with the sentiment label and score.\n\nText: {{{text}}}\n\nOutput format: { \"label\": \"neg\" | \"neu\" | \"pos\", \"score\": number in range [-1,1] }`,
  model: 'googleai/gemini-2.5-flash',
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const analyzeSentimentFlow = ai.defineFlow(
  {
    name: 'analyzeSentimentFlow',
    inputSchema: AnalyzeSentimentInputSchema,
    outputSchema: AnalyzeSentimentOutputSchema,
  },
  async input => {
    try {
      const {text} = await prompt(input);
      const parsedOutput = JSON.parse(text!);

      const result: AnalyzeSentimentOutput = {
        sentimentLabel: parsedOutput.label,
        sentimentScore: parsedOutput.score,
      };
      return result;
    } catch (error) {
      console.error('Error parsing sentiment analysis output:', error);
      throw new Error('Failed to analyze sentiment. Please check the input text and try again.');
    }
  }
);
