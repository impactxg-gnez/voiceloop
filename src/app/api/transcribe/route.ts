import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client only when needed
const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

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
    const openai = getOpenAI();
    if (!openai) {
      console.log('OpenAI API key not found, using mock transcription');
      return NextResponse.json({
        transcription: 'Mock transcription - OpenAI API key not configured. Please add OPENAI_API_KEY to Vercel environment variables.',
        error: 'OpenAI API key not configured, using mock response'
      });
    }

    console.log('OpenAI API key found, length:', process.env.OPENAI_API_KEY.length);

    // Convert audio file to buffer for Whisper
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: audioFile.type || 'audio/webm' });

    console.log('Sending audio to Whisper for transcription...');

    // Use Whisper for transcription
    console.log('Calling Whisper API...');
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
    
    // Check if it's an API key error
    if (error?.message?.includes('API key')) {
      return NextResponse.json({
        transcription: 'Mock transcription - Invalid OpenAI API key. Please check your OPENAI_API_KEY in Vercel.',
        error: 'Invalid OpenAI API key',
        details: error?.message
      });
    }
    
    // Check if it's a network error
    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      return NextResponse.json({
        transcription: 'Mock transcription - Network error. Please check your internet connection.',
        error: 'Network error',
        details: error?.message
      });
    }
    
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
