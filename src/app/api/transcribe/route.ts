import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export async function POST(request: NextRequest) {
  try {
    console.log('Transcribe API called');
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      console.log('No audio file provided');
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    console.log('Audio file received:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });

    // Convert audio file to base64 for Gemini
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const mimeType = audioFile.type || 'audio/webm';

    console.log('Audio converted to base64, length:', audioBase64.length);
    console.log('MIME type:', mimeType);

    // Try different models as fallback
    const models = [
      'googleai/gemini-1.5-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];

    let result;
    let lastError;

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        result = await ai.generateText({
          model: model,
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
        console.log(`Success with model: ${model}`);
        break;
      } catch (error) {
        console.log(`Failed with model ${model}:`, error);
        lastError = error;
        continue;
      }
    }

    if (!result) {
      console.error('All models failed, last error:', lastError);
      return NextResponse.json(
        { error: 'All transcription models failed', details: lastError?.message },
        { status: 500 }
      );
    }

    console.log('Transcription successful:', result.text);
    return NextResponse.json({
      transcription: result.text,
    });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio', details: error?.message },
      { status: 500 }
    );
  }
}
