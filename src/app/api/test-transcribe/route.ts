import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export async function POST(request: NextRequest) {
  try {
    console.log('Test transcribe endpoint called');
    
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    console.log('Audio file received:', {
      name: audioFile?.name,
      size: audioFile?.size,
      type: audioFile?.type
    });

    if (!audioFile) {
      console.log('No audio file provided');
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Convert audio file to base64 for Gemini
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const mimeType = audioFile.type || 'audio/wav';

    console.log('Audio details:', {
      bufferSize: audioBuffer.byteLength,
      base64Length: audioBase64.length,
      mimeType: mimeType
    });

    console.log('Calling AI transcription...');
    const result = await ai.generateText({
      model: 'googleai/gemini-1.5-flash',
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

    console.log('Transcription result:', result);

    return NextResponse.json({
      transcription: result.text,
      success: true,
      debug: {
        audioSize: audioBuffer.byteLength,
        mimeType: mimeType
      }
    });
  } catch (error) {
    console.error('Error in test transcribe:', error);
    return NextResponse.json(
      { 
        error: 'Failed to transcribe audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

