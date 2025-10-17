'use server';

/**
 * @fileOverview A flow that transcribes voice responses from audio files using OpenAI's Whisper API.
 *
 * - transcribeVoiceResponse - A function that handles the transcription process.
 * - TranscribeVoiceResponseInput - The input type for the transcribeVoiceResponse function.
 * - TranscribeVoiceResponseOutput - The return type for the transcribeVoiceResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranscribeVoiceResponseInputSchema = z.object({
  audioPath: z
    .string()
    .describe('The path to the audio file in Cloud Storage.'),
});
export type TranscribeVoiceResponseInput = z.infer<
  typeof TranscribeVoiceResponseInputSchema
>;

const TranscribeVoiceResponseOutputSchema = z.object({
  text: z.string().describe('The transcribed text from the audio file.'),
  language: z.string().optional().describe('The detected language of the audio.'),
  confidence: z.number().optional().describe('The confidence level of the transcription.'),
});
export type TranscribeVoiceResponseOutput = z.infer<
  typeof TranscribeVoiceResponseOutputSchema
>;

export async function transcribeVoiceResponse(
  input: TranscribeVoiceResponseInput
): Promise<TranscribeVoiceResponseOutput> {
  return transcribeVoiceResponseFlow(input);
}

const transcribeVoiceResponsePrompt = ai.definePrompt({
  name: 'transcribeVoiceResponsePrompt',
  input: {schema: TranscribeVoiceResponseInputSchema},
  output: {schema: TranscribeVoiceResponseOutputSchema},
  prompt: `You are a transcription service that converts audio to text.

  Transcribe the audio file located at the following path: {{{audioPath}}}.

  Return the transcribed text, the language detected in the audio, and the confidence level of the transcription.
  `, // Changed file path to audio path
});

const transcribeVoiceResponseFlow = ai.defineFlow(
  {
    name: 'transcribeVoiceResponseFlow',
    inputSchema: TranscribeVoiceResponseInputSchema,
    outputSchema: TranscribeVoiceResponseOutputSchema,
  },
  async input => {
    const {output} = await transcribeVoiceResponsePrompt(input);
    return output!;
  }
);
