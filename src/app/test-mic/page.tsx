'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff } from 'lucide-react';

export default function TestMicPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const [audioStreamSource, setAudioStreamSource] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
    console.log(info);
  };

  const setupMicrophone = async () => {
    try {
      addDebugInfo('Starting microphone setup...');
      
      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }
      
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder not supported');
      }

      addDebugInfo('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      addDebugInfo(`Microphone access granted. Stream tracks: ${stream.getAudioTracks().length}`);
      
      // Setup MediaRecorder
      const recorder = new MediaRecorder(stream);
      addDebugInfo('MediaRecorder created successfully');
      
      recorder.ondataavailable = (event) => {
        addDebugInfo(`Audio data available: ${event.data.size} bytes`);
      };
      
      recorder.onstart = () => {
        addDebugInfo('MediaRecorder started');
      };
      
      recorder.onstop = () => {
        addDebugInfo('MediaRecorder stopped');
      };
      
      recorder.onerror = (event) => {
        addDebugInfo(`MediaRecorder error: ${event}`);
      };
      
      mediaRecorderRef.current = recorder;
      setMicrophoneReady(true);
      addDebugInfo('MediaRecorder setup complete');

      // Setup Audio Context for waveform
      try {
        addDebugInfo('Setting up audio context...');
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        addDebugInfo(`Audio context state: ${audioContext.state}`);
        
        if (audioContext.state === 'suspended') {
          addDebugInfo('Resuming audio context...');
          await audioContext.resume();
          addDebugInfo(`Audio context state after resume: ${audioContext.state}`);
        }
        
        const source = audioContext.createMediaStreamSource(stream);
        audioStreamSourceRef.current = source;
        setAudioStreamSource(true);
        addDebugInfo('Audio stream source created successfully');
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;
        addDebugInfo('Analyser connected successfully');
        
      } catch (audioError) {
        addDebugInfo(`Audio context setup failed: ${audioError}`);
      }

    } catch (error: any) {
      addDebugInfo(`Microphone setup failed: ${error.message}`);
    }
  };

  const startRecording = () => {
    if (!mediaRecorderRef.current || !microphoneReady) {
      addDebugInfo('MediaRecorder not ready, setting up...');
      setupMicrophone().then(() => {
        if (mediaRecorderRef.current) {
          startRecording();
        }
      });
      return;
    }

    if (isRecording) {
      addDebugInfo('Already recording');
      return;
    }

    try {
      addDebugInfo('Starting recording...');
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start waveform visualization
      if (analyserRef.current && canvasRef.current) {
        startWaveform();
      }
      
    } catch (error: any) {
      addDebugInfo(`Recording start failed: ${error.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      addDebugInfo('Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop waveform visualization
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      
      // Clear canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    }
  };

  const startWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (!isRecording) return;
      
      analyser.getByteTimeDomainData(dataArray);
      
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3b82f6';
      ctx.beginPath();
      
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      
      frameRef.current = requestAnimationFrame(draw);
    };
    
    draw();
  };

  useEffect(() => {
    // Auto-setup microphone on page load
    setupMicrophone();
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (audioStreamSourceRef.current) {
        audioStreamSourceRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Microphone & Waveform Test</CardTitle>
          <CardDescription>Test microphone access and waveform visualization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="mb-4">
              <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                {isRecording ? <Mic className="h-8 w-8 text-red-500" /> : <MicOff className="h-8 w-8" />}
              </div>
              <p className="text-sm text-muted-foreground">
                {isRecording ? 'Recording...' : 'Click to start recording'}
              </p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!microphoneReady}
                variant={isRecording ? "destructive" : "default"}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Button>
              
              <Button 
                onClick={setupMicrophone}
                variant="outline"
              >
                Reset Microphone
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Status:</h3>
              <div className="space-y-1 text-sm">
                <p>Microphone Ready: {microphoneReady ? '✅' : '❌'}</p>
                <p>Audio Stream Source: {audioStreamSource ? '✅' : '❌'}</p>
                <p>Audio Context: {audioContextRef.current ? `✅ (${audioContextRef.current.state})` : '❌'}</p>
                <p>Analyser: {analyserRef.current ? '✅' : '❌'}</p>
                <p>Currently Recording: {isRecording ? '✅' : '❌'}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Waveform:</h3>
              <canvas 
                ref={canvasRef}
                width={400}
                height={100}
                className="w-full border rounded bg-gray-50"
              />
            </div>

            <div>
              <h3 className="font-semibold mb-2">Debug Log:</h3>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded max-h-60 overflow-y-auto">
                {debugInfo.length === 0 ? (
                  <p className="text-muted-foreground">No debug info yet...</p>
                ) : (
                  debugInfo.map((info, index) => (
                    <p key={index} className="text-xs font-mono">{info}</p>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
