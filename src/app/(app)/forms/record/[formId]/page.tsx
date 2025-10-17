'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Send, Loader2, CheckCircle } from 'lucide-react';
import { transcribeVoiceResponse } from '@/ai/flows/transcribe-voice-responses';
import { useToast } from '@/hooks/use-toast';

type QuestionState = {
  isRecording: boolean;
  isTranscribing: boolean;
  isSubmitted: boolean;
  audioChunks: Blob[];
  transcription?: string;
};

export default function RecordFormPage({ params }: { params: { formId: string } }) {
  const searchParams = useSearchParams();
  const title = searchParams.get('title');
  const questions = searchParams.getAll('question');
  
  const { toast } = useToast();
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [questionStates, setQuestionStates] = useState<Record<number, QuestionState>>({});
  const [activeRecordingIndex, setActiveRecordingIndex] = useState<number | null>(null);

  useEffect(() => {
    const initialStates: Record<number, QuestionState> = {};
    questions.forEach((_, index) => {
      initialStates[index] = {
        isRecording: false,
        isTranscribing: false,
        isSubmitted: false,
        audioChunks: [],
      };
    });
    setQuestionStates(initialStates);
  }, [questions.length]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'MediaRecorder' in window) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (event) => {
            if (activeRecordingIndex !== null) {
              setQuestionStates(prev => ({
                ...prev,
                [activeRecordingIndex]: {
                  ...prev[activeRecordingIndex],
                  audioChunks: [...prev[activeRecordingIndex].audioChunks, event.data],
                },
              }));
            }
          };
          setMediaRecorder(recorder);
        })
        .catch(err => {
          console.error('Error accessing microphone:', err);
          toast({
            variant: 'destructive',
            title: 'Microphone Access Denied',
            description: 'Please allow microphone access in your browser settings to record audio.',
          });
        });
    }
  }, [activeRecordingIndex, toast]);

  const startRecording = (questionIndex: number) => {
    if (mediaRecorder && activeRecordingIndex === null) {
      setActiveRecordingIndex(questionIndex);
      setQuestionStates(prev => ({
        ...prev,
        [questionIndex]: {
          ...prev[questionIndex],
          isRecording: true,
          audioChunks: [],
        }
      }));
      mediaRecorder.start();
    } else if (activeRecordingIndex !== null) {
        toast({
            variant: "destructive",
            title: "Recording in Progress",
            description: "Please stop the current recording before starting a new one.",
        });
    }
  };

  const stopRecording = (questionIndex: number) => {
    if (mediaRecorder && activeRecordingIndex === questionIndex) {
      mediaRecorder.stop();
      setQuestionStates(prev => ({
        ...prev,
        [questionIndex]: { ...prev[questionIndex], isRecording: false }
      }));
      setActiveRecordingIndex(null);
    }
  };

  const handleSubmit = async (questionIndex: number) => {
    const { audioChunks } = questionStates[questionIndex];
    if (audioChunks.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No audio recorded',
        description: 'Please record your feedback before submitting.',
      });
      return;
    }

    setQuestionStates(prev => ({ ...prev, [questionIndex]: { ...prev[questionIndex], isTranscribing: true } }));
    
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      
      try {
        const result = await transcribeVoiceResponse({ audioPath: base64Audio });
        console.log(`Transcription for question ${questionIndex}:`, result.text);
        toast({
          title: 'Feedback Submitted!',
          description: `Transcription: "${result.text}"`,
        });
        setQuestionStates(prev => ({
          ...prev,
          [questionIndex]: {
            ...prev[questionIndex],
            isSubmitted: true,
            transcription: result.text,
            isTranscribing: false,
          }
        }));
      } catch (error) {
        console.error('Error transcribing audio:', error);
        toast({
          variant: 'destructive',
          title: 'Transcription Failed',
          description: 'Could not transcribe the audio. Please try again.',
        });
        setQuestionStates(prev => ({ ...prev, [questionIndex]: { ...prev[questionIndex], isTranscribing: false } }));
      }
    };
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary py-12">
      <Card className="w-full max-w-2xl mx-4">
        <CardHeader>
          <CardTitle className="text-2xl">{title || 'Voice Feedback Form'}</CardTitle>
          <CardDescription>
            Record a voice response for each question below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {questions.map((q, index) => {
            const state = questionStates[index];
            if (!state) return null;

            const isRecordingThis = state.isRecording;
            const isRecordingAnother = activeRecordingIndex !== null && activeRecordingIndex !== index;
            
            return (
              <div key={index} className="p-4 border rounded-lg">
                <p className="font-semibold mb-4">{index + 1}. {q}</p>
                <div className="flex flex-col items-center gap-4">
                   <button
                    onClick={() => isRecordingThis ? stopRecording(index) : startRecording(index)}
                    disabled={isRecordingAnother || state.isSubmitted}
                    className={`flex items-center justify-center w-20 h-20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isRecordingThis ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'
                    }`}
                  >
                    {isRecordingThis ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
                  </button>
                   <p className="text-sm text-muted-foreground">
                    {isRecordingThis ? 'Recording...' : (state.audioChunks.length > 0 ? 'Recording complete.' : 'Click to record.')}
                  </p>
                  
                  {state.isSubmitted ? (
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Submitted</span>
                    </div>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => handleSubmit(index)} 
                      disabled={state.isTranscribing || state.audioChunks.length === 0 || isRecordingThis || isRecordingAnother}
                    >
                      {state.isTranscribing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Submit Answer
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {state.transcription && (
                    <div className="mt-4 p-3 bg-secondary rounded-md">
                        <p className="text-sm font-medium">Your transcribed answer:</p>
                        <p className="text-sm text-muted-foreground italic">"{state.transcription}"</p>
                    </div>
                )}
              </div>
            )
          })}
           <div className="text-center pt-4">
                <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
