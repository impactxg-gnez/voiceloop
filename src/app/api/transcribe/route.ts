import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Convert audio file to base64 for Gemini
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const mimeType = audioFile.type || 'audio/wav';

    const result = await generateText({
      model: google('gemini-2.0-flash-exp'),
      prompt: [
        {
          text: 'Transcribe the following audio to text. Return only the transcribed text without any additional formatting or commentary.',
        },
        {
          media: {
            mimeType: mimeType,
            data: audioBase64,
          },
        },
      ],
    });

    return NextResponse.json({
      transcription: result.text,
    });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
