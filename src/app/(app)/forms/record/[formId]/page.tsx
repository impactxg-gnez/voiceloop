'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Send, Loader2, CheckCircle, Play, Volume2, ArrowLeft, ArrowRight } from 'lucide-react';
import { transcribeVoiceResponse } from '@/ai/flows/transcribe-voice-responses';
import { generateQuestionAudio } from '@/ai/flows/generate-question-audio';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

type QuestionState = {
  isRecording: boolean;
  isTranscribing: boolean;
  isSubmitted: boolean;
  audioChunks: Blob[];
  transcription?: string;
  analyser?: AnalyserNode;
  audioUrl?: string;
  isGeneratingAudio: boolean;
  isPlayingAudio: boolean;
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const initialStates: Record<number, QuestionState> = {};
    questions.forEach((_, index) => {
      initialStates[index] = {
        isRecording: false,
        isTranscribing: false,
        isSubmitted: false,
        audioChunks: [],
        isGeneratingAudio: false,
        isPlayingAudio: false,
      };
    });
    setQuestionStates(initialStates);

    if (typeof window !== 'undefined' && !audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, [questions]);

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

  const handlePlayQuestion = useCallback(async (questionIndex: number) => {
    const state = questionStates[questionIndex];
    const questionText = questions[questionIndex];
    
    // Do nothing if state isn't initialized yet
    if (!state) return;

    if (state.isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setQuestionStates(prev => ({ ...prev, [questionIndex]: { ...prev[questionIndex], isPlayingAudio: false } }));
      return;
    }

    // Stop any other audio that might be playing
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      // Reset all other playing states
      const newStates = { ...questionStates };
      Object.keys(newStates).forEach(key => {
        const index = parseInt(key);
        if (index !== questionIndex) {
            newStates[index] = { ...newStates[index], isPlayingAudio: false };
        }
      });
      setQuestionStates(newStates);
    }


    if (state.audioUrl && audioRef.current) {
        audioRef.current.src = state.audioUrl;
        audioRef.current.play();
        setQuestionStates(prev => ({ ...prev, [questionIndex]: { ...prev[questionIndex], isPlayingAudio: true } }));
        return;
    }

    setQuestionStates(prev => ({ ...prev, [questionIndex]: { ...prev[questionIndex], isGeneratingAudio: true } }));

    try {
        const result = await generateQuestionAudio({ question: questionText });
        if (audioRef.current) {
            audioRef.current.src = result.audioUrl;
            audioRef.current.play();
        }
        setQuestionStates(prev => ({
            ...prev,
            [questionIndex]: {
                ...prev[questionIndex],
                audioUrl: result.audioUrl,
                isGeneratingAudio: false,
                isPlayingAudio: true,
            }
        }));
    } catch (error) {
        console.error('Error generating audio:', error);
        toast({
            variant: 'destructive',
            title: 'Audio Generation Failed',
            description: 'Could not generate audio for the question.',
        });
        setQuestionStates(prev => ({ ...prev, [questionIndex]: { ...prev[questionIndex], isGeneratingAudio: false } }));
    }
  }, [questions, questionStates, toast]);

  useEffect(() => {
    setupMediaRecorder();
    audioRef.current = new Audio();
    
    const currentAudioRef = audioRef.current;
    const onEnded = () => {
      // Find which question is playing and update its state
      setQuestionStates(prevStates => {
        const newStates = {...prevStates};
        for (const index in newStates) {
          if (newStates[index].isPlayingAudio) {
            newStates[index] = { ...newStates[index], isPlayingAudio: false };
          }
        }
        return newStates;
      });
    }
    
    currentAudioRef.addEventListener('ended', onEnded);

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
      if (currentAudioRef) {
        currentAudioRef.removeEventListener('ended', onEnded);
      }
    };
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Auto-play the question audio when the question changes,
    // but not on the initial load of the component.
    if (Object.keys(questionStates).length > 0) {
      handlePlayQuestion(currentQuestionIndex);
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, questionStates]);

  const draw = (analyser: AnalyserNode, canvas: HTMLCanvasElement, questionIndex: number) => {
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const drawFrame = () => {
      animationFrameIds[questionIndex] = requestAnimationFrame(drawFrame);
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
      
      const canvas = canvasRefs.current[questionIndex];
      const canvasCtx = canvas?.getContext('2d');
      if (canvas && canvasCtx) {
        canvasCtx.fillStyle = 'hsl(var(--secondary))';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      setQuestionStates(prev => ({
        ...prev,
        [questionIndex]: { ...prev[questionIndex], isRecording: false, analyser: undefined }
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

  

  const currentQuestionText = questions[currentQuestionIndex];
  const currentQuestionState = questionStates[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;
  
  if (!currentQuestionState) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-secondary">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  const isRecordingThis = currentQuestionState.isRecording;
  const isRecordingAnother = activeRecordingIndex !== null && activeRecordingIndex !== currentQuestionIndex;
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary py-12 px-4">
        <Card className="w-full max-w-2xl mx-auto mb-4">
            <CardHeader>
                <CardTitle className="text-2xl">{title || 'Voice Feedback Form'}</CardTitle>
                <CardDescription>
                Please provide your voice feedback for the question below.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Progress value={progressPercentage} className="mb-8" />
                <div className="text-center">
                    <div className="flex items-center justify-center mb-4 min-h-[6rem]">
                        <p className="text-2xl font-semibold text-center">{currentQuestionText}</p>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => isRecordingThis ? stopRecording(currentQuestionIndex) : startRecording(currentQuestionIndex)}
                                disabled={isRecordingAnother || currentQuestionState.isSubmitted}
                                className={`flex items-center justify-center w-20 h-20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                isRecordingThis ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'
                                }`}
                            >
                                {isRecordingThis ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
                            </button>
                            <canvas 
                                ref={el => canvasRefs.current[currentQuestionIndex] = el}
                                width="200"
                                height="80"
                                className="rounded-md bg-secondary"
                            ></canvas>
                        </div>
                        <p className="text-sm text-muted-foreground h-5">
                            {isRecordingThis ? 'Recording...' : (currentQuestionState.audioChunks.length > 0 && !currentQuestionState.isSubmitted ? 'Recording complete.' : 'Click mic to record.')}
                        </p>
                    
                        {currentQuestionState.isSubmitted ? (
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span>Submitted</span>
                            </div>
                        ) : (
                            <Button 
                            size="sm"
                            onClick={() => handleSubmit(currentQuestionIndex)} 
                            disabled={currentQuestionState.isTranscribing || currentQuestionState.audioChunks.length === 0 || isRecordingThis || isRecordingAnother}
                            >
                            {currentQuestionState.isTranscribing ? (
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
                    {currentQuestionState.transcription && (
                        <div className="mt-4 p-3 bg-secondary rounded-md">
                            <p className="text-sm font-medium">Your transcribed answer:</p>
                            <p className="text-sm text-muted-foreground italic">"{currentQuestionState.transcription}"</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

        <div className="w-full max-w-2xl mx-auto flex justify-between items-center">
             <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePlayQuestion(currentQuestionIndex)}
                disabled={currentQuestionState.isGeneratingAudio}
                title="Play question audio"
              >
                {currentQuestionState.isGeneratingAudio ? <Loader2 className="h-5 w-5 animate-spin" /> : (currentQuestionState.isPlayingAudio ? <Volume2 className="h-5 w-5" /> : <Play className="h-5 w-5" />) }
              </Button>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentQuestionIndex(prev => prev - 1)} disabled={currentQuestionIndex === 0}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                </Button>
                {currentQuestionIndex < questions.length - 1 ? (
                    <Button onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button onClick={() => window.history.back()}>
                        Finish
                        <CheckCircle className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    </div>
  );
}
