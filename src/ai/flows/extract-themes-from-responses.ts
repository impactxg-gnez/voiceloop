'use server';

/**
 * @fileOverview Extracts and clusters common themes from text and voice responses.
 *
 * - extractThemesFromResponses - A function that handles the theme extraction process.
 * - ExtractThemesFromResponsesInput - The input type for the extractThemesFromResponses function.
 * - ExtractThemesFromResponsesOutput - The return type for the extractThemesFromResponses function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractThemesFromResponsesInputSchema = z.object({
  responses: z.array(
    z.object({
      text: z.string().describe('The text content of the response.'),
    })
  ).describe('An array of responses to extract themes from.'),
});
export type ExtractThemesFromResponsesInput = z.infer<typeof ExtractThemesFromResponsesInputSchema>;

const ThemeSchema = z.object({
  name: z.string().describe('The name of the theme.'),
  keywords: z.array(z.string()).describe('Keywords associated with the theme.'),
  clusterId: z.number().describe('The ID of the cluster the theme belongs to.'),
  count: z.number().describe('The number of responses associated with the theme.'),
  sampleAnswer: z.string().describe('A sample answer that exemplifies the theme.'),
});

const ExtractThemesFromResponsesOutputSchema = z.array(ThemeSchema).describe('An array of extracted themes.');
export type ExtractThemesFromResponsesOutput = z.infer<typeof ExtractThemesFromResponsesOutputSchema>;

export async function extractThemesFromResponses(input: ExtractThemesFromResponsesInput): Promise<ExtractThemesFromResponsesOutput> {
  return extractThemesFromResponsesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractThemesFromResponsesPrompt',
  input: {schema: ExtractThemesFromResponsesInputSchema},
  output: {schema: ExtractThemesFromResponsesOutputSchema},
  prompt: `You are an expert in identifying common themes from a set of text responses.

  Analyze the following responses and extract common themes. For each theme, provide a name, a list of keywords, the cluster ID, the number of responses associated with the theme, and a sample answer that exemplifies the theme.

  Responses:
  {{#each responses}}
  - {{{text}}}
  {{/each}}

  Format your output as a JSON array of themes.
  Each theme should have the following properties:
  - name: string
  - keywords: string[]
  - clusterId: number
  - count: number
  - sampleAnswer: string`,
});

const extractThemesFromResponsesFlow = ai.defineFlow(
  {
    name: 'extractThemesFromResponsesFlow',
    inputSchema: ExtractThemesFromResponsesInputSchema,
    outputSchema: ExtractThemesFromResponsesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
