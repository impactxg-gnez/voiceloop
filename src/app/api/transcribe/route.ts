import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('Transcribe API called with Whisper');
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

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.log('OpenAI API key not found, using mock transcription');
      return NextResponse.json({
        transcription: 'Mock transcription - OpenAI API key not configured',
        error: 'OpenAI API key not configured, using mock response'
      });
    }

    // Convert audio file to buffer for Whisper
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: audioFile.type || 'audio/webm' });

    console.log('Sending audio to Whisper for transcription...');

    // Use Whisper for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: audioBlob as any,
      model: "whisper-1",
    });

    console.log('Whisper transcription successful:', transcription.text);
    return NextResponse.json({
      transcription: transcription.text,
    });
  } catch (error) {
    console.error('Error transcribing audio with Whisper:', error);
    
    // Return mock transcription as fallback
    const mockTranscription = 'Mock transcription - Whisper service unavailable';
    console.log('Returning mock transcription for testing');
    
    return NextResponse.json({
      transcription: mockTranscription,
      error: 'Whisper service unavailable, using mock response',
      details: error?.message
    });
  }
}
