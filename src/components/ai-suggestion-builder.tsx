'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Loader2, Sparkles, CheckCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AISuggestionBuilderProps {
  onSuggestionsGenerated: (suggestions: string[]) => void;
  onToggle: (enabled: boolean) => void;
  enabled: boolean;
}

export function AISuggestionBuilder({ onSuggestionsGenerated, onToggle, enabled }: AISuggestionBuilderProps) {
  const [description, setDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
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
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const { transcription } = await response.json();
      setDescription(transcription);
      setIsVoiceMode(false);
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        variant: 'destructive',
        title: 'Transcription Error',
        description: 'Could not transcribe audio. Please try again.',
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

      const { suggestions: generatedSuggestions } = await response.json();
      
      // Ensure we have a valid array
      if (Array.isArray(generatedSuggestions)) {
        setSuggestions(generatedSuggestions);
        onSuggestionsGenerated(generatedSuggestions);
      } else {
        console.error('Invalid suggestions format:', generatedSuggestions);
        toast({
          variant: 'destructive',
          title: 'Invalid Response',
          description: 'Received invalid suggestions format from server.',
        });
      }
      
      toast({
        title: 'Suggestions Generated!',
        description: `Generated ${generatedSuggestions.length} question suggestions.`,
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
        onSuggestionsGenerated([...(suggestions || []), suggestionText]);
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
                    : suggestion?.question || suggestion?.text || JSON.stringify(suggestion);
                  
                  return (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
                      <span className="flex-1 text-sm">{suggestionText}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addSuggestion(suggestionText)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSuggestion(index)}
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
