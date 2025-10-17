'use server';
/**
 * @fileOverview A flow that generates audio for a given text question.
 *
 * - generateQuestionAudio - A function that handles the audio generation.
 * - GenerateQuestionAudioInput - The input type for the function.
 * - GenerateQuestionAudioOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';
import wav from 'wav';

const GenerateQuestionAudioInputSchema = z.object({
  question: z.string().describe('The text of the question to be converted to speech.'),
});
export type GenerateQuestionAudioInput = z.infer<typeof GenerateQuestionAudioInputSchema>;

const GenerateQuestionAudioOutputSchema = z.object({
  audioUrl: z.string().describe("A data URI of the generated audio in WAV format. Expected format: 'data:audio/wav;base64,<encoded_data>'."),
});
export type GenerateQuestionAudioOutput = z.infer<typeof GenerateQuestionAudioOutputSchema>;

export async function generateQuestionAudio(input: GenerateQuestionAudioInput): Promise<GenerateQuestionAudioOutput> {
  return generateQuestionAudioFlow(input);
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const generateQuestionAudioFlow = ai.defineFlow(
  {
    name: 'generateQuestionAudioFlow',
    inputSchema: GenerateQuestionAudioInputSchema,
    outputSchema: GenerateQuestionAudioOutputSchema,
  },
  async ({ question }) => {
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: question,
    });
    if (!media) {
      throw new Error('no media returned');
    }
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    const audioUrl = 'data:audio/wav;base64,' + (await toWav(audioBuffer));
    return { audioUrl };
  }
);
