'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Send, Loader2 } from 'lucide-react';
import { transcribeVoiceResponse } from '@/ai/flows/transcribe-voice-responses';
import { useToast } from '@/hooks/use-toast';

export default function RecordFormPage({ params }: { params: { formId: string } }) {
  const searchParams = useSearchParams();
  const title = searchParams.get('title');
  const questions = searchParams.getAll('question');
  
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'MediaRecorder' in window) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (event) => {
            setAudioChunks(prev => [...prev, event.data]);
          };
          setMediaRecorder(recorder);
        })
        .catch(err => console.error('Error accessing microphone:', err));
    }
  }, []);

  const startRecording = () => {
    if (mediaRecorder) {
      setAudioChunks([]);
      mediaRecorder.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async () => {
    if (audioChunks.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No audio recorded',
        description: 'Please record your feedback before submitting.',
      });
      return;
    }

    setIsTranscribing(true);
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    
    // Convert Blob to data URI
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      
      try {
        // In a real app, you would upload to a storage service and pass the path
        // For now, we pass the data URI directly, which might not be supported by all flows
        const result = await transcribeVoiceResponse({ audioPath: base64Audio });
        console.log('Transcription:', result.text);
        toast({
          title: 'Feedback Submitted!',
          description: `Transcription: "${result.text}"`,
        });
      } catch (error) {
        console.error('Error transcribing audio:', error);
        toast({
          variant: 'destructive',
          title: 'Transcription Failed',
          description: 'Could not transcribe the audio. Please try again.',
        });
      } finally {
        setIsTranscribing(false);
        setAudioChunks([]);
      }
    };
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <CardTitle className="text-2xl">{title || 'Voice Feedback Form'}</CardTitle>
          <CardDescription>
            {questions.length > 0 ? (
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    {questions.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
            ) : 'Please provide your feedback.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex flex-col items-center gap-6">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center justify-center w-24 h-24 rounded-full transition-colors ${
                isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {isRecording ? <MicOff className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-white" />}
            </button>
            <p className="text-sm text-muted-foreground">
              {isRecording ? 'Recording... Click to stop.' : 'Click the button to start recording.'}
            </p>
            {audioChunks.length > 0 && !isRecording && (
                <p className="text-sm text-green-600">Recording complete. Ready to submit.</p>
            )}
            <Button onClick={handleSubmit} disabled={isTranscribing || audioChunks.length === 0}>
              {isTranscribing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}