'use server';

/**
 * @fileOverview A flow that transcribes voice responses from audio files using Gemini.
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
    .describe(
      "A voice recording, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type TranscribeVoiceResponseInput = z.infer<
  typeof TranscribeVoiceResponseInputSchema
>;

const TranscribeVoiceResponseOutputSchema = z.object({
  text: z.string().describe('The transcribed text from the audio file.'),
});
export type TranscribeVoiceResponseOutput = z.infer<
  typeof TranscribeVoiceResponseOutputSchema
>;

export async function transcribeVoiceResponse(
  input: TranscribeVoiceResponseInput
): Promise<TranscribeVoiceResponseOutput> {
  return transcribeVoiceResponseFlow(input);
}

const transcribeVoiceResponseFlow = ai.defineFlow(
  {
    name: 'transcribeVoiceResponseFlow',
    inputSchema: TranscribeVoiceResponseInputSchema,
    outputSchema: TranscribeVoiceResponseOutputSchema,
  },
  async input => {
    const {text} = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: [
        {text: 'Transcribe the following audio:'},
        {media: {url: input.audioPath}}
      ],
    });
    return {text};
  }
);
