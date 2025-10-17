'use client';

import { useState, useEffect, useRef } from 'react';
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
  analyser?: AnalyserNode;
};

// Add a ref for animation frame IDs to decouple from react state
const animationFrameIds: Record<number, number> = {};

export default function RecordFormPage({ params }: { params: { formId: string } }) {
  const searchParams = useSearchParams();
  const title = searchParams.get('title');
  const questions = searchParams.getAll('question');
  
  const { toast } = useToast();
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [questionStates, setQuestionStates] = useState<Record<number, QuestionState>>({});
  const [activeRecordingIndex, setActiveRecordingIndex] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});

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

    if (typeof window !== 'undefined' && !audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, [questions.length]);

  const setupMediaRecorder = async () => {
    if (typeof window !== 'undefined' && 'MediaRecorder' in window) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (event) => {
            if (activeRecordingIndex !== null) {
              setQuestionStates(prev => {
                const currentQuestionState = prev[activeRecordingIndex!];
                if (!currentQuestionState) return prev;
                return {
                  ...prev,
                  [activeRecordingIndex!]: {
                    ...currentQuestionState,
                    audioChunks: [...currentQuestionState.audioChunks, event.data],
                  },
                }
              });
            }
        };
        setMediaRecorder(recorder);

        if (audioContextRef.current && stream.getAudioTracks().length > 0) {
            if (audioStreamSourceRef.current) {
                audioStreamSourceRef.current.disconnect();
            }
            audioStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        }

      } catch (err) {
        console.error('Error accessing microphone:', err);
        toast({
          variant: 'destructive',
          title: 'Microphone Access Denied',
          description: 'Please allow microphone access in your browser settings to record audio.',
        });
      }
    }
  };

  useEffect(() => {
    setupMediaRecorder();
    
    return () => {
      Object.values(animationFrameIds).forEach(cancelAnimationFrame);
      if (audioStreamSourceRef.current) {
        audioStreamSourceRef.current.disconnect();
        audioStreamSourceRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const draw = (analyser: AnalyserNode, canvas: HTMLCanvasElement, questionIndex: number) => {
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const drawFrame = () => {
        analyser.getByteTimeDomainData(dataArray);

        canvasCtx.fillStyle = 'hsl(var(--secondary))';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'hsl(var(--primary))';
        canvasCtx.beginPath();

        const sliceWidth = canvas.width * 1.0 / analyser.frequencyBinCount;
        let x = 0;

        for (let i = 0; i < analyser.frequencyBinCount; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
        
        animationFrameIds[questionIndex] = requestAnimationFrame(drawFrame);
    };
    
    drawFrame();
  };


  const startRecording = (questionIndex: number) => {
    if (mediaRecorder && activeRecordingIndex === null && audioContextRef.current && audioStreamSourceRef.current) {
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 2048;
        audioStreamSourceRef.current.connect(analyser);

        const canvas = canvasRefs.current[questionIndex];

        setActiveRecordingIndex(questionIndex);
        setQuestionStates(prev => ({
            ...prev,
            [questionIndex]: {
                ...prev[questionIndex],
                isRecording: true,
                audioChunks: [],
                analyser,
            }
        }));

        if (canvas) {
          draw(analyser, canvas, questionIndex);
        }

        mediaRecorder.start();

    } else if (activeRecordingIndex !== null) {
        toast({
            variant: "destructive",
            title: "Recording in Progress",
            description: "Please stop the current recording before starting a new one.",
        });
    } else if (!mediaRecorder) {
        setupMediaRecorder().then(() => toast({ title: 'Preparing recorder, please try again.' }));
    }
  };

  const stopRecording = (questionIndex: number) => {
    if (mediaRecorder && activeRecordingIndex === questionIndex) {
      mediaRecorder.stop();

      const state = questionStates[questionIndex];
      if (state.analyser && audioStreamSourceRef.current) {
        audioStreamSourceRef.current.disconnect(state.analyser);
      }
      if (animationFrameIds[questionIndex]) {
        cancelAnimationFrame(animationFrameIds[questionIndex]);
        delete animationFrameIds[questionIndex];
      }

      setQuestionStates(prev => ({
        ...prev,
        [questionIndex]: { ...prev[questionIndex], isRecording: false, analyser: undefined }
      }));
      setActiveRecordingIndex(null);

      const canvas = canvasRefs.current[questionIndex];
      const canvasCtx = canvas?.getContext('2d');
      if (canvas && canvasCtx) {
        canvasCtx.fillStyle = 'hsl(var(--secondary))';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      }
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
                   <div className="flex items-center gap-4">
                    <button
                      onClick={() => isRecordingThis ? stopRecording(index) : startRecording(index)}
                      disabled={isRecordingAnother || state.isSubmitted}
                      className={`flex items-center justify-center w-20 h-20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isRecordingThis ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'
                      }`}
                    >
                      {isRecordingThis ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
                    </button>
                    <canvas 
                        ref={el => canvasRefs.current[index] = el}
                        width="200"
                        height="80"
                        className="rounded-md bg-secondary"
                    ></canvas>
                   </div>
                   <p className="text-sm text-muted-foreground h-5">
                    {isRecordingThis ? 'Recording...' : (state.audioChunks.length > 0 && !state.isSubmitted ? 'Recording complete.' : 'Click mic to record.')}
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
