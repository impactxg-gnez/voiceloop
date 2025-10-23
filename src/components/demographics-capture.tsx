'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mic, MicOff, Volume2, Play, ArrowLeft, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runExtractDemographics } from '@/ai/flows/extract-demographics';
import { useSupabaseClient, useUser, useCollection } from '@/supabase';

interface Props {
  formId: string;
  onContinue: () => void;
}

export function DemographicsCapture({ formId, onContinue }: Props) {
  const { toast } = useToast();
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const [recordMs, setRecordMs] = useState(0);
  const recordStartRef = useRef<number | null>(null);
  const [hasVoiceInput, setHasVoiceInput] = useState(false);
  const hasSpokenRef = useRef(false);
  const { data: configuredFields, loading: fieldsLoading } = useCollection<any>('form_demographic_fields', '*', { form_id: formId });
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [debugText, setDebugText] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  // Debug logging
  console.log('DemographicsCapture - formId:', formId);
  console.log('DemographicsCapture - configuredFields:', configuredFields);
  console.log('DemographicsCapture - fieldsLoading:', fieldsLoading);

  // Debug function to check database
  const debugDemographics = async () => {
    try {
      const response = await fetch(`/api/debug-demographics?formId=${formId}`);
      const data = await response.json();
      console.log('Debug demographics result:', data);
      toast({
        title: 'Debug Info',
        description: `Found ${data.fieldsCount} demographic fields for form ${formId}`,
      });
    } catch (error) {
      console.error('Debug error:', error);
      toast({
        variant: 'destructive',
        title: 'Debug Error',
        description: 'Could not fetch debug info',
      });
    }
  };

  // Server-side transcription fallback
  const transcribeWithServer = async (audioBlob: Blob) => {
    try {
      setDebugText('Sending audio to server for transcription...');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Server transcription failed: ${response.status}`);
      }
      
      const result = await response.json();
      const transcribedText = result.transcription || '';
      
      if (transcribedText.trim()) {
        setText(transcribedText);
        setDebugText(`Server transcription: "${transcribedText}"`);
      } else {
        setDebugText('Server transcription returned empty result');
      }
    } catch (error) {
      setDebugText(`Server transcription error: ${error}`);
    } finally {
      setIsProcessingVoice(false);
    }
  };

  // Generate dynamic content based on configured fields
  const generateDynamicContent = () => {
    if (!configuredFields || configuredFields.length === 0) {
      console.log('No configured fields found, using fallback content');
      return {
        title: 'Demographic Collection',
        description: 'Please provide your demographic information',
        prompt: 'Please tell us your demographic information. You can switch to text if you prefer.'
      };
    }

    const fieldLabels = configuredFields.map((f: any) => f.label.toLowerCase());
    const fieldNames = fieldLabels.join(', ');
    
    return {
      title: `${fieldLabels.map((l: string) => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')} Collection`,
      description: `Please provide your ${fieldNames} information`,
      prompt: `Please tell us your ${fieldNames}. You can switch to text if you prefer.`
    };
  };

  const dynamicContent = generateDynamicContent();

  // TTS welcome prompt (single play unless user presses Replay)
  const speak = (message: string) => {
    try {
      try { window.speechSynthesis.cancel(); } catch {}
      const utter = new SpeechSynthesisUtterance(message);
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utter);
    } catch {}
  };

  useEffect(() => {
    if (!hasSpokenRef.current) {
      hasSpokenRef.current = true;
      speak(dynamicContent.prompt);
    }
    return () => {
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, [dynamicContent.prompt]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) setHasVoiceInput(true);
        audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        recordStartRef.current = null;
        setRecordMs(0);
        setIsProcessingVoice(true);
        setDebugText('Processing voice input...');
        
        // Try client-side speech-to-text first, then fallback to server-side
        try {
          const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
          if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = true;
            recognition.continuous = false;
            let finalText = '';
            let hasResult = false;
            
            recognition.onresult = (event: any) => {
              hasResult = true;
              let combined = '';
              for (let i = event.resultIndex; i < event.results.length; i++) {
                combined += event.results[i][0].transcript + ' ';
                if (event.results[i].isFinal) finalText = combined;
              }
              const transcribedText = (finalText || combined).trim();
              setText(transcribedText);
              setDebugText(`Voice transcribed: "${transcribedText}"`);
            };
            
            recognition.onend = () => {
              if (!hasResult || !finalText) {
                setDebugText('Client-side recognition failed, trying server-side...');
                // Fallback to server-side transcription
                transcribeWithServer(blob);
              } else {
                setIsProcessingVoice(false);
              }
            };
            
            recognition.onerror = (event: any) => {
              setDebugText(`Client-side error: ${event.error}. Trying server-side...`);
              // Fallback to server-side transcription
              transcribeWithServer(blob);
            };
            
            recognition.start();
          } else {
            setDebugText('Client-side recognition not supported, using server-side...');
            // Fallback to server-side transcription
            transcribeWithServer(blob);
          }
        } catch (error) {
          setDebugText(`Client-side error: ${error}. Trying server-side...`);
          // Fallback to server-side transcription
          transcribeWithServer(blob);
        }
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        try { audioCtxRef.current?.close(); } catch {}
        audioCtxRef.current = null;
        analyserRef.current = null;
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      recordStartRef.current = performance.now();
      const tick = () => {
        if (recordStartRef.current != null) {
          setRecordMs(Math.floor(performance.now() - recordStartRef.current));
          frameRef.current = requestAnimationFrame(tick);
        }
      };
      frameRef.current = requestAnimationFrame(tick);
      // waveform setup
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
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
              frameRef.current = requestAnimationFrame(draw);
            };
            draw();
          }
        }
      } catch {}
    } catch (e) {
      toast({ variant: 'destructive', title: 'Microphone permission denied' });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  };

  const handleSubmit = async () => {
    // validate required fields
    const requiredMissing = (configuredFields || [])
      .filter((f: any) => f.required)
      .some((f: any) => !String(fieldValues[f.field_key] ?? '').trim());
    if (requiredMissing && mode === 'text' && !text.trim()) {
      toast({ variant: 'destructive', title: 'Please fill required fields or enter text.' });
      return;
    }

    let raw = text.trim() || Object.entries(fieldValues)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    if (!raw && mode === 'voice') {
      // Ensure non-empty raw_text for DB constraint when voice was used
      raw = 'Voice response submitted';
    }

    const parsed = await runExtractDemographics(raw);
    const mergedParsed = { ...parsed, fields: fieldValues } as any;
    const { error } = await supabase.from('demographics').insert({
      form_id: formId,
      submitter_uid: user?.id ?? null,
      raw_text: raw,
      parsed_json: mergedParsed,
      age: parsed.age ?? null,
      city: parsed.city ?? null,
      gender: parsed.gender ?? null,
      source: mode,
    });
    if (error) {
      console.error('Demographics insert error', error);
      toast({ variant: 'destructive', title: 'Failed to save demographics', description: error.message });
      return;
    }
    toast({ title: 'Saved', description: 'Thanks! Moving to questions.' });
    onContinue();
  };

  const hasAnyFieldValue = Object.values(fieldValues).some(v => String(v || '').trim().length > 0);
  const canSubmit = (mode === 'text' && (text.trim().length > 0 || hasAnyFieldValue)) || (mode === 'voice' && (text.trim().length > 0 || !!audioUrl || hasVoiceInput));

  // Show loading state while fields are being loaded
  if (fieldsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading demographic fields...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{dynamicContent.title}</CardTitle>
          <CardDescription>{dynamicContent.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div className="h-36 w-36 rounded-full bg-secondary flex items-center justify-center">
              {isRecording ? <Mic className="h-12 w-12" /> : <MicOff className="h-12 w-12" />}
            </div>
          </div>

          {mode === 'voice' && (
            <div className="text-center text-sm text-muted-foreground">
              {isRecording ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  Recording... {Math.floor(recordMs / 1000)}s
                </span>
              ) : isProcessingVoice ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing voice...
                </span>
              ) : (
                <span>Press Start to begin. Press Stop to finish.</span>
              )}
            </div>
          )}

          {mode === 'voice' && (
            <div className="space-y-2">
              <canvas ref={canvasRef} width={320} height={60} className="w-full rounded bg-muted border" />
              {debugText && (
                <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  <strong>Debug:</strong> {debugText}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-center gap-2">
              {isRecording ? (
                <Button onClick={stopRecording}>Stop</Button>
              ) : (
                <Button onClick={startRecording}>Start</Button>
              )}
              <Button variant="outline" onClick={() => { try { window.speechSynthesis.cancel(); } catch {}; if (isRecording) stopRecording(); setMode(mode === 'voice' ? 'text' : 'voice'); }}>
                Switch to {mode === 'voice' ? 'text' : 'voice'}
              </Button>
              <Button variant="ghost" onClick={() => speak(dynamicContent.prompt)} disabled={isSpeaking}>
                Replay prompt
              </Button>
            </div>
            <div className="flex justify-center">
              <Button variant="destructive" onClick={debugDemographics} size="sm">
                🔍 Debug Fields ({configuredFields?.length || 0})
              </Button>
            </div>
          </div>

          {mode === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="demo-text">Your demographics</Label>
              <Textarea 
                id="demo-text" 
                rows={3} 
                value={text} 
                onChange={(e) => setText(e.target.value)} 
                placeholder={`e.g., ${configuredFields?.map((f: any) => `my ${f.label.toLowerCase()} is...`).join(', ') || 'provide your demographic information'}`} 
              />
            </div>
          )}

          {/* Configured fields */}
          {(configuredFields || []).length > 0 && (
            <div className="space-y-3">
              {(configuredFields || [])
                .sort((a: any, b: any) => a.created_at.localeCompare(b.created_at))
                .map((f: any) => (
                <div key={f.id} className="space-y-1">
                  <Label htmlFor={`df-${f.field_key}`}>{f.label}{f.required ? ' *' : ''}</Label>
                  {f.input_type === 'select' ? (
                    <select
                      id={`df-${f.field_key}`}
                      className="w-full border rounded h-9 px-2"
                      value={fieldValues[f.field_key] || ''}
                      onChange={(e) => setFieldValues(prev => ({ ...prev, [f.field_key]: e.target.value }))}
                      disabled={mode === 'voice'}
                    >
                      <option value="">Select</option>
                      {(Array.isArray(f.options) ? f.options : []).map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={`df-${f.field_key}`}
                      type={f.input_type === 'number' ? 'number' : 'text'}
                      value={fieldValues[f.field_key] || ''}
                      onChange={(e) => setFieldValues(prev => ({ ...prev, [f.field_key]: e.target.value }))}
                      disabled={mode === 'voice'}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit}>Submit</Button>
          <div className="text-center text-xs text-muted-foreground">Powered by VoiseForm</div>
        </CardContent>
      </Card>
    </div>
  );
}


