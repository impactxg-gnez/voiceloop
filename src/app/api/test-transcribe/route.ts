import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    console.log('Test transcribe endpoint called');
    
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not found in environment');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
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

    console.log('Transcribing with OpenAI Whisper...');
    
    // Whisper expects the file directly
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // Optional: specify language for better accuracy
    });

    console.log('Transcription successful:', transcription.text);

    return NextResponse.json({
      transcription: transcription.text,
      success: true,
      debug: {
        audioSize: audioFile.size,
        audioType: audioFile.type
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

