'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Loader2, CheckCircle } from 'lucide-react';
import { transcribeVoiceResponse } from '@/ai/flows/transcribe-voice-responses';
import { useToast } from '@/hooks/use-toast';

export default function TestSpeechPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [hasRecorded, setHasRecorded] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    // Setup media recorder when component mounts
    const setupMediaRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            setAudioChunks(prev => [...prev, event.data]);
          }
        };

        recorder.onstop = () => {
          setHasRecorded(true);
        };

        setMediaRecorder(recorder);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast({
          variant: 'destructive',
          title: 'Microphone Access Denied',
          description: 'Please allow microphone access to test speech-to-text.',
        });
      }
    };

    setupMediaRecorder();
  }, [toast]);

  const startRecording = () => {
    if (!mediaRecorder) return;
    
    setAudioChunks([]);
    setTranscription('');
    setHasRecorded(false);
    setIsRecording(true);
    mediaRecorder.start();
  };

  const stopRecording = () => {
    if (!mediaRecorder || !isRecording) return;
    
    mediaRecorder.stop();
    setIsRecording(false);
  };

  const transcribeAudio = async () => {
    if (audioChunks.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Audio Recorded',
        description: 'Please record some audio first.',
      });
      return;
    }

    setIsTranscribing(true);
    
    try {
      // Convert audio chunks to blob
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      
      // Convert to base64 data URI
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        try {
          const result = await transcribeVoiceResponse({ audioPath: base64Audio });
          setTranscription(result.text);
          
          toast({
            title: 'Transcription Complete!',
            description: 'Your speech has been converted to text.',
          });
        } catch (error) {
          console.error('Transcription error:', error);
          toast({
            variant: 'destructive',
            title: 'Transcription Failed',
            description: 'Could not transcribe the audio. Please try again.',
          });
        } finally {
          setIsTranscribing(false);
        }
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        variant: 'destructive',
        title: 'Processing Error',
        description: 'Could not process the audio file.',
      });
      setIsTranscribing(false);
    }
  };

  const resetTest = () => {
    setAudioChunks([]);
    setTranscription('');
    setHasRecorded(false);
    setIsRecording(false);
    setIsTranscribing(false);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Speech-to-Text Test</CardTitle>
            <CardDescription className="text-center">
              Test the speech-to-text functionality by recording your voice and seeing the transcription.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Recording Controls */}
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isTranscribing}
                  size="lg"
                  className={`w-20 h-20 rounded-full ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </Button>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
                </p>
                {hasRecorded && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ Audio recorded successfully
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              <Button
                onClick={transcribeAudio}
                disabled={!hasRecorded || isTranscribing}
                size="lg"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transcribing...
                  </>
                ) : (
                  'Transcribe Audio'
                )}
              </Button>
              
              <Button
                onClick={resetTest}
                variant="outline"
                disabled={isRecording || isTranscribing}
              >
                Reset Test
              </Button>
            </div>

            {/* Transcription Results */}
            {transcription && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Transcription Result:</h3>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{transcription}</p>
                </div>
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Transcription completed successfully
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="text-sm text-muted-foreground space-y-2">
              <h4 className="font-medium">How to test:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the microphone button to start recording</li>
                <li>Speak clearly into your microphone</li>
                <li>Click the microphone again to stop recording</li>
                <li>Click "Transcribe Audio" to convert speech to text</li>
                <li>View the transcription result below</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
