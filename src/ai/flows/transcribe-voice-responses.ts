'use server';

/**
 * @fileOverview A flow that transcribes voice responses from audio files using Whisper.
 *
 * - transcribeVoiceResponse - A function that handles the transcription process.
 * - TranscribeVoiceResponseInput - The input type for the transcribeVoiceResponse function.
 * - TranscribeVoiceResponseOutput - The return type for the transcribeVoiceResponse function.
 */

import OpenAI from 'openai';
import {z} from 'zod';

// Initialize OpenAI client only when needed
const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

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
  try {
    // Check if OpenAI API key is available
    const openai = getOpenAI();
    if (!openai) {
      console.log('OpenAI API key not found, using mock transcription');
      return { text: 'Mock transcription - OpenAI API key not configured' };
    }

    // Convert data URI to buffer and create a proper File object
    const base64Data = input.audioPath.split(',')[1];
    const audioBuffer = Buffer.from(base64Data, 'base64');
    
    // Create a File object from the buffer
    const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    console.log('Sending audio to Whisper for transcription...');
    console.log('Audio file details:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });

    // Use Whisper for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    console.log('Whisper transcription successful:', transcription.text);
    return { text: transcription.text };
  } catch (error) {
    console.error('Error transcribing audio with Whisper:', error);
    return { text: 'Mock transcription - Whisper service unavailable' };
  }
}
