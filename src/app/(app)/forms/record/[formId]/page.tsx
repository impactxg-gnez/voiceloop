'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Send, Loader2, CheckCircle, Play, Volume2, ArrowLeft, ArrowRight } from 'lucide-react';
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
  
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showPages, setShowPages] = useState(true);
  const [demographicsDone, setDemographicsDone] = useState(false);
  const [questionStates, setQuestionStates] = useState<Record<number, QuestionState>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [debugText, setDebugText] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
  }, [questions]);

  useEffect(() => {
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (currentAudioRef) {
        currentAudioRef.removeEventListener('ended', onEnded);
      }
    };
  }, []);

  useEffect(() => {
    if (Object.keys(questionStates).length > 0) {
      handlePlayQuestion(currentQuestionIndex);
    }
  }, [currentQuestionIndex]);

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

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const frequencyData = new Uint8Array(bufferLength);

    const draw = () => {
      // Get both time domain and frequency data for better visualization
      analyser.getByteTimeDomainData(dataArray);
      analyser.getByteFrequencyData(frequencyData);

      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(1, '#1e293b');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw frequency bars for music visualization
      const barWidth = canvas.width / bufferLength * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (frequencyData[i] / 255) * canvas.height;
        
        // Color based on frequency (bass = red, mid = green, treble = blue)
        const hue = (i / bufferLength) * 360;
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }

      // Draw waveform line on top
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      x = 0;

      for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
        const y = (v * canvas.height / 2) + (canvas.height / 2);

          if (i === 0) {
          ctx.moveTo(x, y);
          } else {
          ctx.lineTo(x, y);
          }
          x += sliceWidth;
      }

      ctx.stroke();

      // Draw center line
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Calculate and update audio level for feedback
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const level = Math.min(100, (average / 128) * 100);
      setAudioLevel(level);

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
          sampleSize: 16
        } 
      });
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          console.log('Audio chunk received:', e.data.size, 'bytes');
          setDebugText(`Recording... (${audioChunksRef.current.length} chunks, ${e.data.size} bytes)`);
        }
      };
      recorder.onstop = async () => {
        console.log('Recording stopped, processing audio chunks:', audioChunksRef.current.length);
        
        if (audioChunksRef.current.length === 0) {
          setDebugText('No audio data recorded - please try again');
          setQuestionStates(prev => ({ 
            ...prev, 
            [currentQuestionIndex]: { 
              ...prev[currentQuestionIndex], 
              isRecording: false 
            } 
          }));
          return;
        }
        
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Audio blob created:', {
          size: blob.size,
          type: blob.type
        });
        
        setQuestionStates(prev => ({
          ...prev,
          [currentQuestionIndex]: {
            ...prev[currentQuestionIndex],
            isRecording: false,
            audioChunks: [...audioChunksRef.current],
          }
        }));
        
        setProcessingProgress(5);
        setDebugText('Processing voice input...');
        
        // Use server-side transcription directly for reliability
        setDebugText('Using server-side transcription...');
        await transcribeWithServer(blob);
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        try { 
          audioContextRef.current?.close(); 
        } catch {}
        audioContextRef.current = null;
        analyserRef.current = null;
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setProcessingProgress(0);
      setDebugText('Recording started...');
      
        setQuestionStates(prev => ({
            ...prev,
        [currentQuestionIndex]: {
          ...prev[currentQuestionIndex],
                isRecording: true,
            }
        }));

      // waveform setup
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 44100
        });
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        
        // Better analyser settings for music and speech
        analyser.fftSize = 4096;
        analyser.smoothingTimeConstant = 0.3;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        
        source.connect(analyser);
        analyserRef.current = analyser;

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            const draw = () => {
              analyser.getByteTimeDomainData(dataArray);
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.lineWidth = 2;
              ctx.strokeStyle = '#6ea8fe';
              ctx.beginPath();
              const sliceWidth = canvas.width / bufferLength;
              let x = 0;
              for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                x += sliceWidth;
              }
              ctx.lineTo(canvas.width, canvas.height / 2);
              ctx.stroke();
              animationFrameRef.current = requestAnimationFrame(draw);
            };
            draw();
          }
        }
      } catch (e) {
        console.error('Waveform setup failed:', e);
      }
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setDebugText(`Recording error: ${error}`);
        toast({
        variant: 'destructive',
        title: 'Recording Failed',
        description: 'Could not access microphone. Please check permissions.',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  };

  // Server-side transcription function (from demographics)
  const transcribeWithServer = async (audioBlob: Blob) => {
    try {
      setProcessingProgress(10);
      setDebugText('Sending audio to server for transcription...');
      console.log('Audio blob details:', {
        size: audioBlob.size,
        type: audioBlob.type
      });
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      setProcessingProgress(30);
      setDebugText('Processing audio with Whisper...');
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Transcription response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Server transcription failed: ${response.status}`);
      }
      
      setProcessingProgress(70);
      setDebugText('Processing transcription results...');
      
      const result = await response.json();
      console.log('Transcription result:', result);
      
      const transcriptionText = result.transcription || '';
      
      setProcessingProgress(90);
      setDebugText('Finalizing transcription...');
      
      if (transcriptionText.trim()) {
        setDebugText(`Server transcription: "${transcriptionText}"`);
        
        // Update question state with transcription
      setQuestionStates(prev => ({
        ...prev,
          [currentQuestionIndex]: {
            ...prev[currentQuestionIndex],
            transcription: transcriptionText,
            isTranscribing: false,
          }
        }));
        
        toast({
          title: 'Transcription Complete!',
          description: `Transcription: "${transcriptionText}"`,
        });
      } else {
        setDebugText('Server transcription returned empty result');
      }
      
      setProcessingProgress(100);
      
      // Reset progress after a delay
      setTimeout(() => {
        setProcessingProgress(0);
      }, 2000);
      
    } catch (error) {
      console.error('Server transcription error:', error);
      setDebugText(`Server transcription error: ${error}`);
      setProcessingProgress(0);
      toast({
        variant: 'destructive',
        title: 'Transcription Failed',
        description: 'Could not transcribe your audio. Please try again.',
      });
    }
  };

  const handleSubmit = async () => {
    const { audioChunks } = questionStates[currentQuestionIndex];
    if (audioChunks.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No audio recorded',
        description: 'Please record your feedback before submitting.',
      });
      return;
    }
    if (!supabase || !questions) return;

    setQuestionStates(prev => ({ 
      ...prev, 
      [currentQuestionIndex]: { 
        ...prev[currentQuestionIndex], 
        isTranscribing: true 
      } 
    }));
    setProcessingProgress(0);
    setDebugText('Preparing audio for transcription...');
    
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    console.log('Audio blob details for transcription:', {
      size: audioBlob.size,
      type: audioBlob.type,
      chunks: audioChunks.length
    });
    
    try {
      // Step 1: Insert placeholder row (10%)
      setProcessingProgress(10);
      setDebugText('Saving audio to database...');
      
        const { data: inserted, error: insertError } = await supabase
          .from('form_responses')
          .insert({
            form_id: formId,
          question_id: questions[currentQuestionIndex].id,
          question_text: questions[currentQuestionIndex].text,
          audio_url: '',
            response_text: 'processing…',
            user_id: user?.id ?? null,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

      // Step 2: Send to transcription API (20-70%)
      setProcessingProgress(20);
      setDebugText('Sending audio to transcription service...');
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      // Simulate progress during transcription
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev < 60) {
            return prev + 5;
          }
          return prev;
        });
      }, 500);
      
      const transcriptionResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Transcription response status:', transcriptionResponse.status);
      
      clearInterval(progressInterval);
      
      if (!transcriptionResponse.ok) {
        throw new Error(`Transcription failed: ${transcriptionResponse.status}`);
      }
      
      setProcessingProgress(70);
      setDebugText('Processing transcription results...');
      
      const transcriptionResult = await transcriptionResponse.json();
      console.log('Transcription result:', transcriptionResult);
      
      const transcriptionText = transcriptionResult.transcription || 'transcription unavailable';
      
      // Step 3: Extract structured fields from response (85%)
      setProcessingProgress(85);
      setDebugText('Extracting structured data...');
      
      let parsedFields = {};
      try {
        const extractResponse = await fetch('/api/extract-fields', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionText: questions[currentQuestionIndex].text,
            responseText: transcriptionText,
          }),
        });
        
        if (extractResponse.ok) {
          const extractData = await extractResponse.json();
          parsedFields = extractData.fields || {};
          console.log('Extracted fields:', parsedFields);
        }
      } catch (extractError) {
        console.error('Error extracting fields:', extractError);
        // Continue anyway, just without parsed fields
      }
      
      // Step 4: Update database with transcription and parsed fields (95%)
      setProcessingProgress(95);
      setDebugText('Saving data to database...');
      
      const { error: updateError } = await supabase
        .from('form_responses')
        .update({ 
          response_text: transcriptionText,
          parsed_fields: parsedFields
        })
        .eq('id', inserted.id);

      if (updateError) {
        console.error('Error updating response:', updateError);
        throw new Error(`Failed to update response: ${updateError.message}`);
      }

      console.log('Successfully updated response with transcription:', {
        id: inserted.id,
        transcriptionText,
        parsedFields
      });

      // Step 5: Complete (100%)
      setProcessingProgress(100);
      setDebugText(`Response saved: "${transcriptionText}"`);

        toast({
          title: 'Feedback Submitted!',
        description: `Transcription: "${transcriptionText}"`,
        });
      
        setQuestionStates(prev => ({
          ...prev,
        [currentQuestionIndex]: {
          ...prev[currentQuestionIndex],
            isSubmitted: true,
          transcription: transcriptionText,
            isTranscribing: false,
          }
        }));
      
      // Automatically move to next question after a short delay
      setTimeout(() => {
        setProcessingProgress(0);
        // Move to next question if not the last one
        if (currentQuestionIndex < (questions?.length || 0) - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          // If it's the last question, show completion message
          toast({
            title: 'All Questions Completed!',
            description: 'Thank you for your feedback.',
          });
        }
      }, 1500);
      
      } catch (error) {
        console.error('Error transcribing audio:', error);
      setDebugText(`Transcription failed: ${error}`);
      setProcessingProgress(0);
        toast({
          variant: 'destructive',
          title: 'Submission Failed',
        description: 'Could not transcribe your audio. Please try again.',
      });
      setQuestionStates(prev => ({ 
        ...prev, 
        [currentQuestionIndex]: { 
          ...prev[currentQuestionIndex], 
          isTranscribing: false 
        } 
      }));
    }
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

  const isRecording = currentQuestionState.isRecording;
  
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

                    <div className="space-y-4">
                        {/* Demographics-style recording interface */}
                        <div className="flex justify-center gap-2">
                            {isRecording ? (
                                <Button onClick={stopRecording} variant="destructive">
                                    Stop Recording
                                </Button>
                            ) : (
                                <Button onClick={startRecording} disabled={currentQuestionState.isTranscribing}>
                                    {currentQuestionState.isTranscribing ? 'Processing...' : 'Start Recording'}
                                </Button>
                            )}
                        </div>
                        
                        {/* Waveform Canvas */}
                            <canvas 
                            ref={canvasRef}
                            width="320" 
                            height="60" 
                            className="w-full rounded bg-muted border"
                        />
                        
                        {/* Debug Text */}
                        {debugText && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                                <strong>Debug:</strong> {debugText}
                            </div>
                        )}

                        {/* Processing Progress Bar */}
                        {(processingProgress > 0 || debugText.includes('processing')) && (
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                    <span>{processingProgress < 10 ? 'Preparing audio...' : 'Processing audio...'}</span>
                                    <span>{processingProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${processingProgress}%` }}
                                    />
                                </div>
                                {processingProgress === 100 && (
                                    <div className="text-sm text-green-600 dark:text-green-400 font-medium text-center">
                                        ✅ Processing complete!
                                    </div>
                                )}
                        </div>
                        )}
                    
                        {/* Submit Button */}
                        {currentQuestionState.isSubmitted ? (
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span>Submitted</span>
                            </div>
                        ) : (
                            <Button 
                                onClick={handleSubmit}
                                disabled={currentQuestionState.audioChunks.length === 0 || currentQuestionState.isTranscribing}
                                className="flex items-center gap-2 w-full"
                            >
                                <Send className="h-4 w-4" />
                                Submit Answer
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