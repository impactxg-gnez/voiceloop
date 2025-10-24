'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, Download, Calendar, User, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useCollection } from '@/supabase';

interface ResponseData {
  id: string;
  form_id: string;
  question_text: string;
  response_text: string;
  parsed_fields: Record<string, any>;
  created_at: string;
  user_id: string;
}

export function ResponsesTab({ formId }: { formId: string }) {
  const { toast } = useToast();
  const { user } = useUser();
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch responses from Supabase
  const { data: responsesData, loading: responsesLoading } = useCollection<ResponseData>(
    'form_responses',
    '*',
    { form_id: formId }
  );

  useEffect(() => {
    if (responsesData) {
      setResponses(responsesData);
    }
  }, [responsesData]);

  useEffect(() => {
    setIsLoading(responsesLoading);
  }, [responsesLoading]);

  const exportToCSV = () => {
    if (responses.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Export',
        description: 'There are no responses to export yet.',
      });
      return;
    }

    // Get all unique field names from parsed_fields
    const allFields = new Set<string>();
    responses.forEach(response => {
      if (response.parsed_fields) {
        Object.keys(response.parsed_fields).forEach(key => allFields.add(key));
      }
    });
    const fieldNames = Array.from(allFields).sort();
    
    // Build CSV with dynamic columns
    const headers = ['Question', 'Response', 'Date', 'Time', ...fieldNames];
    const csvContent = [
      headers.join(','),
      ...responses.map(response => {
        const baseFields = [
          `"${response.question_text}"`,
          `"${response.response_text}"`,
          `"${new Date(response.created_at).toLocaleDateString()}"`,
          `"${new Date(response.created_at).toLocaleTimeString()}"`
        ];
        
        // Add parsed field values in the correct order
        const parsedFieldValues = fieldNames.map(fieldName => {
          const value = response.parsed_fields?.[fieldName];
          return value ? `"${value}"` : '""';
        });
        
        return [...baseFields, ...parsedFieldValues].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voiceform-responses-${formId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Responses have been exported to CSV file.',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading responses...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Responses Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Responses ({responses.length})
            </span>
            {responses.length > 0 && (
              <Button 
                onClick={exportToCSV}
                disabled={isExporting}
                variant="outline"
                size="sm"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </>
                )}
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            All responses submitted for this form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {responses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No responses yet</p>
              <p className="text-sm">Start collecting responses to see them here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map((response) => {
                const { date, time } = formatDate(response.created_at);
                return (
                  <div key={response.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{response.question_text}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          "{response.response_text}"
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {date}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {time}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Display parsed fields if available */}
                    {response.parsed_fields && Object.keys(response.parsed_fields).length > 0 && (
                      <div className="border-t pt-2 mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Extracted Data:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(response.parsed_fields).map(([key, value]) => (
                            <Badge key={key} variant="default" className="text-xs">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

