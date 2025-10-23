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
    
    console.log('Sending audio to Whisper for transcription...');
    console.log('Audio file details:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });

    // Use Whisper for transcription - pass the File directly
    console.log('Calling Whisper API...');
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile, // Use the original File object, not a Blob
      model: "whisper-1",
    });

    console.log('Whisper transcription successful:', transcription.text);
    console.log('Transcription response:', {
      text: transcription.text,
      duration: transcription.duration,
      language: transcription.language
    });
    return NextResponse.json({
      transcription: transcription.text,
    });
  } catch (error: any) {
    console.error('Error transcribing audio with Whisper:', error);
    console.error('Error details:', {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      type: error?.type
    });
    
    // Check if it's an API key error
    if (error?.message?.includes('API key') || error?.message?.includes('authentication') || error?.status === 401) {
      return NextResponse.json({
        transcription: 'Mock transcription - Invalid OpenAI API key. Please check your OPENAI_API_KEY in Vercel.',
        error: 'Invalid OpenAI API key',
        details: error?.message
      });
    }
    
    // Check if it's a quota/billing error
    if (error?.message?.includes('quota') || error?.message?.includes('billing') || error?.status === 429) {
      return NextResponse.json({
        transcription: 'Mock transcription - OpenAI quota exceeded. Please check your billing.',
        error: 'OpenAI quota exceeded',
        details: error?.message
      });
    }
    
    // Check if it's a network error
    if (error?.message?.includes('fetch') || error?.message?.includes('network') || error?.code === 'ENOTFOUND') {
      return NextResponse.json({
        transcription: 'Mock transcription - Network error. Please check your internet connection.',
        error: 'Network error',
        details: error?.message
      });
    }
    
    // For other errors, return the actual error details for debugging
    return NextResponse.json({
      transcription: `Mock transcription - Error: ${error?.message || 'Unknown error'}`,
      error: 'Whisper transcription failed',
      details: error?.message,
      errorType: error?.constructor?.name,
      status: error?.status
    });
  }
}
