'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Send, Loader2, CheckCircle, Play, Volume2, ArrowLeft, ArrowRight } from 'lucide-react';
import { transcribeVoiceResponse } from '@/ai/flows/transcribe-voice-responses';
import { generateQuestionAudio } from '@/ai/flows/generate-question-audio';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { useCollection, useDoc, useSupabaseClient, useUser } from '@/supabase';
import { useMemoSupabase } from '@/supabase/provider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormPageDisplay } from '@/components/form-page-display';
import { DemographicsCapture } from '@/components/demographics-capture';

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

type FormDoc = { title: string };
type QuestionDoc = { text: string; question_order: number };
type FormPageDoc = { 
  id: string; 
  title: string; 
  content: string | null; 
  page_order: number; 
  is_intro_page: boolean; 
};

const animationFrameIds: Record<number, number> = {};

export default function RecordFormPage({ params }: { params: { formId: string } }) {
  const { formId } = params;
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const formDocRef = useMemoSupabase(() => formId ? formId : null, [formId]);
  const { data: form, isLoading: isLoadingForm } = useDoc<FormDoc>('forms', formDocRef);

  const questionsQuery = useMemoSupabase(() => formId ? formId : null, [formId]);
  const { data: questions, isLoading: isLoadingQuestions } = useCollection<QuestionDoc>('questions', '*', { form_id: formId });
  const { data: formPages, isLoading: isLoadingPages } = useCollection<FormPageDoc>('form_pages', '*', { form_id: formId });
  
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showPages, setShowPages] = useState(true);
  const [demographicsDone, setDemographicsDone] = useState(false);
  const [questionStates, setQuestionStates] = useState<Record<number, QuestionState>>({});
  const [activeRecordingIndex, setActiveRecordingIndex] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [debugText, setDebugText] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!questions) return;
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
    if (!questions || !state) return;
    
    const questionText = questions[questionIndex].text;
    
    if (state.isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setQuestionStates(prev => ({ ...prev, [questionIndex]: { ...prev[questionIndex], isPlayingAudio: false } }));
      return;
    }

    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
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
    if (Object.keys(questionStates).length > 0) {
      handlePlayQuestion(currentQuestionIndex);
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex]);

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
        setDebugText(`Started recording for question ${questionIndex + 1}`);
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
      setDebugText(`Stopped recording for question ${questionIndex + 1}. Processing audio...`);

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
    if (!supabase || !questions) return;


    setQuestionStates(prev => ({ ...prev, [questionIndex]: { ...prev[questionIndex], isTranscribing: true } }));
    setDebugText(`Transcribing audio for question ${questionIndex + 1}...`);
    
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      
      try {
        // 1) Insert placeholder row so a response always appears immediately
        const { data: inserted, error: insertError } = await supabase
          .from('submissions')
          .insert({
            form_id: formId,
            question_id: questions[questionIndex].id,
            question_text: questions[questionIndex].text,
            audio_url: '', // optional: upload to storage and set URL
            transcription: 'processing…',
            submitter_uid: user?.id ?? null,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        // 2) Transcribe and update in-place
        const result = await transcribeVoiceResponse({ audioPath: base64Audio });
        const transcriptionText = result.text || 'transcription unavailable';
        
        await supabase
          .from('submissions')
          .update({ transcription: transcriptionText })
          .eq('id', inserted.id);

        setDebugText(`Transcription complete: "${transcriptionText}"`);
        toast({
          title: 'Feedback Submitted!',
          description: `Transcription: "${transcriptionText}"`,
        });
        setQuestionStates(prev => ({
          ...prev,
          [questionIndex]: {
            ...prev[questionIndex],
            isSubmitted: true,
            transcription: transcriptionText,
            isTranscribing: false,
          }
        }));
      } catch (error) {
        console.error('Error transcribing audio:', error);
        setDebugText(`Transcription failed: ${error}`);
        toast({
          variant: 'destructive',
          title: 'Submission Failed',
          description: 'Could not transcribe your audio. Please try again.',
        });
        setQuestionStates(prev => ({ ...prev, [questionIndex]: { ...prev[questionIndex], isTranscribing: false } }));
      }
    };
  };

  const isLoading = isLoadingForm || isLoadingQuestions || isLoadingPages;
  const currentQuestionText = questions?.[currentQuestionIndex]?.text;
  const currentQuestionState = questionStates[currentQuestionIndex];
  const progressPercentage = questions ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  // Sort form pages by page_order
  const sortedPages = formPages?.sort((a, b) => a.page_order - b.page_order) || [];

  const handlePageComplete = () => {
    if (currentPageIndex < sortedPages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    } else {
      setShowPages(false);
    }
  };

  const handlePageBack = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };
  
  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-secondary">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  if (!form || !questions || !currentQuestionState) {
     return (
        <div className="flex items-center justify-center min-h-screen bg-secondary">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Form not found</h1>
              <p className="text-muted-foreground">This form may have been deleted or the link is incorrect.</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
        </div>
    );
  }

  // Show form pages if they exist and we haven't completed them yet
  if (showPages && sortedPages.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-secondary py-12 px-4">
        <FormPageDisplay
          pages={sortedPages}
          currentPageIndex={currentPageIndex}
          onPageComplete={handlePageComplete}
          onPageBack={handlePageBack}
        />
      </div>
    );
  }

  // Show demographics screen once pages are done but before questions
  if (!demographicsDone) {
    return (
      <DemographicsCapture formId={formId} onContinue={() => setDemographicsDone(true)} />
    );
  }

  const isRecordingThis = currentQuestionState.isRecording;
  const isRecordingAnother = activeRecordingIndex !== null && activeRecordingIndex !== currentQuestionIndex;
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary py-12 px-4">
        <Card className="w-full max-w-2xl mx-auto mb-4">
            <CardHeader>
                <CardTitle className="text-2xl">{form.title || 'Voice Feedback Form'}</CardTitle>
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
                                ref={el => { canvasRefs.current[currentQuestionIndex] = el; }}
                                width="200"
                                height="80"
                                className="rounded-md bg-secondary"
                            ></canvas>
                        </div>
                        <p className="text-sm text-muted-foreground h-5">
                            {isRecordingThis ? 'Recording...' : (currentQuestionState.audioChunks.length > 0 && !currentQuestionState.isSubmitted ? 'Recording complete.' : 'Click mic to record.')}
                        </p>
                        {debugText && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2">
                                <strong>Debug:</strong> {debugText}
                            </div>
                        )}
                    
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
                    <Button onClick={() => router.push('/dashboard')}>
                        Finish
                        <CheckCircle className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    </div>
  );
}