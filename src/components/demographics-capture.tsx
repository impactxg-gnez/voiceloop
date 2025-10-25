'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const [recordMs, setRecordMs] = useState(0);
  const recordStartRef = useRef<number | null>(null);
  const [hasVoiceInput, setHasVoiceInput] = useState(false);
  const { data: configuredFields, loading: fieldsLoading } = useCollection<any>('form_demographic_fields', '*', { form_id: formId });
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [debugText, setDebugText] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Debug logging (only when values change)
  useEffect(() => {
    console.log('DemographicsCapture - formId:', formId);
    console.log('DemographicsCapture - configuredFields:', configuredFields);
    console.log('DemographicsCapture - fieldsLoading:', fieldsLoading);
  }, [formId, configuredFields, fieldsLoading]);

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

  // Auto-fill fields from transcribed text
  const autoFillFields = (transcribedText: string) => {
    if (!configuredFields || configuredFields.length === 0) return;
    
    const text = transcribedText.toLowerCase();
    const updates: Record<string, string> = {};
    
    configuredFields.forEach((field: any) => {
      const fieldKey = field.field_key.toLowerCase();
      const fieldLabel = field.label.toLowerCase();
      
      try {
        // Extract name
        if (fieldKey === 'name') {
          // Look for patterns like "my name is X", "I am X", "this is X", "name is X"
          const namePatterns = [
            /(?:my name is|i am|this is|i'm|name is|call me)\s+([a-zA-Z\s]+?)(?:\.|,|\s+and|\s+i\s|$)/i,
            /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/  // Capitalize name at start
          ];
          
          for (const pattern of namePatterns) {
            const match = transcribedText.match(pattern);
            if (match && match[1]) {
              const extractedName = match[1].trim();
              // Validate name (at least 2 characters, not common words)
              if (extractedName.length >= 2 && !['years', 'year', 'male', 'female'].includes(extractedName.toLowerCase())) {
                updates[field.field_key] = extractedName;
                break;
              }
            }
          }
        }
        
        // Extract age
        if (fieldKey === 'age') {
          const agePatterns = [
            /(\d{1,3})\s*(?:years old|year old|years|yrs|yr)/i,
            /age\s*(?:is|:)?\s*(\d{1,3})/i,
            /i'?m\s*(\d{1,3})/i
          ];
          
          for (const pattern of agePatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
              const age = parseInt(match[1]);
              if (age >= 1 && age <= 150) {  // Reasonable age range
                updates[field.field_key] = age.toString();
                break;
              }
            }
          }
        }
        
        // Extract gender
        if (fieldKey === 'gender') {
          if (text.includes('male') && !text.includes('female')) {
            updates[field.field_key] = 'Male';
          } else if (text.includes('female')) {
            updates[field.field_key] = 'Female';
          } else if (text.includes('man') || text.includes('boy')) {
            updates[field.field_key] = 'Male';
          } else if (text.includes('woman') || text.includes('girl')) {
            updates[field.field_key] = 'Female';
          } else if (text.includes('non-binary') || text.includes('nonbinary') || text.includes('other')) {
            updates[field.field_key] = 'Other';
          }
        }
        
        // Extract city
        if (fieldKey === 'city') {
          const cityPatterns = [
            /(?:from|in|at|live in|city is|city:)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|\s+and|\s+i\s|$)/,
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+city/i
          ];
          
          for (const pattern of cityPatterns) {
            const match = transcribedText.match(pattern);
            if (match && match[1]) {
              const city = match[1].trim();
              if (city.length >= 2) {
                updates[field.field_key] = city;
                break;
              }
            }
          }
        }
        
        // Extract education level
        if (fieldKey === 'education') {
          if (text.includes('phd') || text.includes('doctorate')) {
            updates[field.field_key] = 'PhD';
          } else if (text.includes('master') || text.includes('masters')) {
            updates[field.field_key] = "Master's Degree";
          } else if (text.includes('bachelor') || text.includes('bachelors') || text.includes('college degree')) {
            updates[field.field_key] = "Bachelor's Degree";
          } else if (text.includes('high school') || text.includes('secondary')) {
            updates[field.field_key] = 'High School';
          }
        }
        
        // Extract employment status
        if (fieldKey === 'employment') {
          if (text.includes('self-employed') || text.includes('freelance') || text.includes('own business')) {
            updates[field.field_key] = 'Self-Employed';
          } else if (text.includes('employed') || text.includes('working') || text.includes('job')) {
            updates[field.field_key] = 'Employed';
          } else if (text.includes('student') || text.includes('studying')) {
            updates[field.field_key] = 'Student';
          } else if (text.includes('retired')) {
            updates[field.field_key] = 'Retired';
          } else if (text.includes('unemployed') || text.includes('looking for work')) {
            updates[field.field_key] = 'Unemployed';
          }
        }
      } catch (error) {
        console.error(`Error extracting ${fieldKey}:`, error);
      }
    });
    
    // Apply the updates
    if (Object.keys(updates).length > 0) {
      console.log('Auto-filled fields:', updates);
      setFieldValues(prev => ({ ...prev, ...updates }));
      
      toast({
        title: 'Fields Auto-Filled!',
        description: `Automatically filled ${Object.keys(updates).length} field(s) from your voice input.`,
      });
    }
  };

  // Server-side transcription fallback
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
      
      const transcribedText = result.transcription || '';
      
      setProcessingProgress(90);
      setDebugText('Finalizing transcription...');
      
      if (transcribedText.trim()) {
        setText(transcribedText);
        setDebugText(`Server transcription: "${transcribedText}"`);
        
        // Auto-fill demographic fields from transcription
        autoFillFields(transcribedText);
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
    } finally {
      setIsProcessingVoice(false);
    }
  };

  // Generate dynamic content based on configured fields (memoized)
  const dynamicContent = useMemo(() => {
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
  }, [configuredFields]);

  // TTS disabled - no voice prompts
  // Users can read the instructions on screen

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
          setHasVoiceInput(true);
          audioChunksRef.current.push(e.data);
          console.log('Audio chunk received:', e.data.size, 'bytes');
          setDebugText(`Recording... (${audioChunksRef.current.length} chunks, ${e.data.size} bytes)`);
        }
      };
      recorder.onstop = async () => {
        console.log('Recording stopped, processing audio chunks:', audioChunksRef.current.length);
        
        if (audioChunksRef.current.length === 0) {
          setDebugText('No audio data recorded - please try again');
          setIsProcessingVoice(false);
          return;
        }
        
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Audio blob created:', {
          size: blob.size,
          type: blob.type
        });
        
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        recordStartRef.current = null;
        setRecordMs(0);
        setIsProcessingVoice(true);
        setProcessingProgress(5);
        setDebugText('Processing voice input...');
        
        // Use server-side transcription directly for reliability
        setDebugText('Using server-side transcription...');
        await transcribeWithServer(blob);
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        try { audioCtxRef.current?.close(); } catch {}
        audioCtxRef.current = null;
        analyserRef.current = null;
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setProcessingProgress(0);
      setDebugText('Recording started...');
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
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 44100
        });
        audioCtxRef.current = audioCtx;
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('Stopping recording, processing audio chunks:', audioChunksRef.current.length);
      
      mediaRecorderRef.current.stop();
      
      // Validate audio data
      if (audioChunksRef.current.length === 0) {
        setDebugText('No audio data recorded - please try again');
        setIsRecording(false);
        setIsProcessingVoice(false);
        return;
      }
      
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('Audio blob created:', {
        size: blob.size,
        type: blob.type
      });
      
      // Clean up recording state
      recordStartRef.current = null;
      setRecordMs(0);
      setIsProcessingVoice(true);
      setProcessingProgress(5);
      setDebugText('Processing voice input...');
      
      // Automatically start transcription after recording stops
      setTimeout(() => {
        transcribeWithServer(blob);
      }, 500);
      
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      try { 
        audioCtxRef.current?.close(); 
      } catch {}
      audioCtxRef.current = null;
      analyserRef.current = null;
    }
    
    mediaRecorderRef.current = null;
    setIsRecording(false);
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
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-center gap-2">
              {isRecording ? (
                <Button onClick={stopRecording}>Stop</Button>
              ) : (
                <Button onClick={startRecording} disabled={isProcessingVoice}>
                  {isProcessingVoice ? 'Processing...' : 'Start'}
                </Button>
              )}
              <Button variant="outline" onClick={() => { if (isRecording) stopRecording(); setMode(mode === 'voice' ? 'text' : 'voice'); }}>
                Switch to {mode === 'voice' ? 'text' : 'voice'}
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


