'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Loader2, Sparkles, CheckCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AISuggestionBuilderProps {
  onSuggestionsGenerated: (suggestions: any[]) => void;
  onFormMetadataGenerated?: (title: string, description: string) => void;
  onToggle: (enabled: boolean) => void;
  enabled: boolean;
}

export function AISuggestionBuilder({ onSuggestionsGenerated, onFormMetadataGenerated, onToggle, enabled }: AISuggestionBuilderProps) {
  const [description, setDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const generateFormTitle = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.includes('demographic') && desc.includes('name')) {
      return 'Name Collection Form';
    } else if (desc.includes('demographic')) {
      return 'Demographic Information Form';
    } else if (desc.includes('feedback')) {
      return 'Customer Feedback Form';
    } else if (desc.includes('survey')) {
      return 'Survey Form';
    } else if (desc.includes('hotel')) {
      return 'Hotel Feedback Form';
    } else if (desc.includes('restaurant')) {
      return 'Restaurant Feedback Form';
    } else {
      return 'Voice Feedback Form';
    }
  };

  const generateFormDescription = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.includes('demographic') && desc.includes('name')) {
      return 'Please provide your name information';
    } else if (desc.includes('demographic')) {
      return 'Please provide your demographic information';
    } else if (desc.includes('feedback')) {
      return 'Please share your feedback and experience';
    } else if (desc.includes('survey')) {
      return 'Please answer the survey questions';
    } else if (desc.includes('hotel')) {
      return 'Please share your hotel experience';
    } else if (desc.includes('restaurant')) {
      return 'Please share your dining experience';
    } else {
      return 'Please provide your feedback';
    }
  };

  const startRecording = async () => {
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      console.log('Microphone access granted, setting up MediaRecorder...');
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        console.log('Audio data available, size:', event.data.size);
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Created audio blob:', {
          size: audioBlob.size,
          type: audioBlob.type
        });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        variant: 'destructive',
        title: 'Recording Error',
        description: 'Could not access microphone. Please check permissions.',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsGenerating(true);
      console.log('Starting transcription with audio blob:', {
        size: audioBlob.size,
        type: audioBlob.type
      });

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      console.log('Sending to transcription API...');
      const response = await fetch('/api/test-transcribe', {
        method: 'POST',
        body: formData,
      });

      console.log('Transcription response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Transcription failed:', errorData);
        throw new Error(`Transcription failed: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('Transcription result:', result);
      
      if (result.transcription) {
        setDescription(result.transcription);
        setIsVoiceMode(false);
        toast({
          title: 'Transcription Complete',
          description: 'Audio has been transcribed successfully.',
        });
      } else {
        throw new Error('No transcription received');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        variant: 'destructive',
        title: 'Transcription Error',
        description: `Could not transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSuggestions = async () => {
    if (!description.trim()) {
      toast({
        variant: 'destructive',
        title: 'Description Required',
        description: 'Please describe your form before generating suggestions.',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-form-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          description
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const result = await response.json();
      console.log('Received suggestions:', result);
      
      // Generate form metadata based on description
      if (onFormMetadataGenerated) {
        const formTitle = generateFormTitle(description);
        const formDescription = generateFormDescription(description);
        onFormMetadataGenerated(formTitle, formDescription);
      }
      
      // Ensure we have a valid array
      if (Array.isArray(result.suggestions)) {
        console.log('Suggestions length:', result.suggestions.length);
        console.log('First suggestion:', result.suggestions[0]);
        
        setSuggestions(result.suggestions);
        onSuggestionsGenerated(result.suggestions);
      } else {
        console.error('Invalid suggestions format:', result.suggestions);
        toast({
          variant: 'destructive',
          title: 'Invalid Response',
          description: 'Received invalid suggestions format from server.',
        });
      }
      
      toast({
        title: 'Suggestions Generated!',
        description: `Generated ${result.suggestions.length} question suggestions.`,
      });
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Error',
        description: 'Could not generate suggestions. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const addSuggestion = (suggestion: any) => {
    try {
      // Handle both string and object formats
      const suggestionText = typeof suggestion === 'string' 
        ? suggestion 
        : suggestion?.question || suggestion?.text || '';
      
      if (suggestionText && typeof suggestionText === 'string') {
        // Convert to object format for consistency
        const suggestionObj = typeof suggestion === 'string' 
          ? { question: suggestion, type: 'voice', options: [] }
          : suggestion;
        
        onSuggestionsGenerated([...(suggestions || []), suggestionObj]);
      }
    } catch (error) {
      console.error('Error adding suggestion:', error);
    }
  };

  const removeSuggestion = (index: number) => {
    const newSuggestions = (suggestions || []).filter((_, i) => i !== index);
    setSuggestions(newSuggestions);
    onSuggestionsGenerated(newSuggestions);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">AI Form Builder</CardTitle>
          </div>
          <Button
            variant={enabled ? "default" : "outline"}
            size="sm"
            onClick={() => onToggle(!enabled)}
          >
            {enabled ? 'Enabled' : 'Enable AI'}
          </Button>
        </div>
      </CardHeader>
      
      {enabled && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Describe your form:</label>
            <div className="space-y-2">
              <Textarea
                placeholder="For best results tell us:
• Use case
• Target audience  
• What questions do you want to answer through it"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] resize-none"
                disabled={isGenerating}
              />
              
              <div className="flex items-center gap-2">
                {!isVoiceMode ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsVoiceMode(true)}
                    disabled={isGenerating}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Switch to voice
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isRecording ? "destructive" : "default"}
                      size="sm"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isGenerating}
                    >
                      {isRecording ? (
                        <MicOff className="h-4 w-4 mr-2" />
                      ) : (
                        <Mic className="h-4 w-4 mr-2" />
                      )}
                      {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsVoiceMode(false)}
                      disabled={isRecording || isGenerating}
                    >
                      Switch to text
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={generateSuggestions}
            disabled={!description.trim() || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Suggestions...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Question Suggestions
              </>
            )}
          </Button>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Generated Suggestions:</label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => {
                  // Handle both string and object formats
                  const suggestionText = typeof suggestion === 'string' 
                    ? suggestion 
                    : suggestion?.question || suggestion?.text || '';
                  
                  console.log(`Suggestion ${index}:`, suggestion, 'Text:', suggestionText);
                  
                  // Don't render if no text
                  if (!suggestionText || suggestionText.trim() === '') {
                    return null;
                  }
                  
                  return (
                    <div key={index} className="flex items-center gap-2 p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {suggestionText}
                        </p>
                        {suggestion?.type && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {suggestion.type === 'voice' ? 'Voice' : 
                             suggestion.type === 'mc' ? 'Multiple Choice' : 
                             suggestion.type === 'ranking' ? 'Ranking' : suggestion.type}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addSuggestion(suggestion)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSuggestion(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
