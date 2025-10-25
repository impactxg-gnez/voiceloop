'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, Download, Calendar, User, FileText, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useCollection, useSupabaseClient } from '@/supabase';

interface ResponseData {
  id: string;
  form_id: string;
  question_text: string;
  response_text: string;
  parsed_fields: Record<string, any>;
  created_at: string;
  user_id: string;
}

interface DemographicData {
  id: string;
  form_id: string;
  submitter_uid: string | null;
  raw_text: string;
  parsed_json: Record<string, any>;
  age: string | null;
  city: string | null;
  gender: string | null;
  source: string;
  created_at: string;
}

export function ResponsesTab({ formId }: { formId: string }) {
  const { toast } = useToast();
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [demographics, setDemographics] = useState<DemographicData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch responses from Supabase
  const { data: responsesData, loading: responsesLoading, refetch } = useCollection<ResponseData>(
    'form_responses',
    '*',
    { form_id: formId }
  );

  // Fetch demographics data
  const { data: demographicsData, loading: demographicsLoading } = useCollection<DemographicData>(
    'demographics',
    '*',
    { form_id: formId }
  );

  useEffect(() => {
    if (responsesData) {
      setResponses(responsesData);
    }
  }, [responsesData]);

  useEffect(() => {
    if (demographicsData) {
      setDemographics(demographicsData);
    }
  }, [demographicsData]);

  useEffect(() => {
    setIsLoading(responsesLoading || demographicsLoading);
  }, [responsesLoading, demographicsLoading]);

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Fetch responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('form_responses')
        .select('*')
        .eq('form_id', formId)
        .order('created_at', { ascending: false });
      
      if (responsesError) throw responsesError;
      
      // Fetch demographics
      const { data: demographicsData, error: demographicsError } = await supabase
        .from('demographics')
        .select('*')
        .eq('form_id', formId)
        .order('created_at', { ascending: false });
      
      if (demographicsError) console.error('Error fetching demographics:', demographicsError);
      
      if (responsesData) {
        setResponses(responsesData);
      }
      if (demographicsData) {
        setDemographics(demographicsData);
      }
      
      toast({
        title: 'Refreshed',
        description: 'Responses and demographics have been updated.',
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        variant: 'destructive',
        title: 'Refresh Failed',
        description: 'Could not refresh data.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportToCSV = () => {
    if (responses.length === 0 && demographics.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Export',
        description: 'There are no responses to export yet.',
      });
      return;
    }

    // Get all unique field names from parsed_fields in responses
    const allFields = new Set<string>();
    responses.forEach(response => {
      if (response.parsed_fields) {
        Object.keys(response.parsed_fields).forEach(key => allFields.add(key));
      }
    });
    const fieldNames = Array.from(allFields).sort();
    
    // Get demographic fields from parsed_json
    const demographicFields = new Set<string>();
    demographics.forEach(demo => {
      if (demo.parsed_json?.fields) {
        Object.keys(demo.parsed_json.fields).forEach(key => demographicFields.add(key));
      }
    });
    const demoFieldNames = Array.from(demographicFields).sort();
    
    // Get the first demographic entry (usually one per form submission)
    const demographicData = demographics.length > 0 ? demographics[0] : null;
    
    // Build CSV with dynamic columns including demographics
    const headers = ['Question', 'Response', 'Date', 'Time', ...demoFieldNames, ...fieldNames];
    const csvContent = [
      headers.join(','),
      ...responses.map(response => {
        const baseFields = [
          `"${response.question_text}"`,
          `"${response.response_text}"`,
          `"${new Date(response.created_at).toLocaleDateString()}"`,
          `"${new Date(response.created_at).toLocaleTimeString()}"`
        ];
        
        // Add demographic field values
        const demoValues = demoFieldNames.map(fieldName => {
          const value = demographicData?.parsed_json?.fields?.[fieldName];
          return value ? `"${value}"` : '""';
        });
        
        // Add parsed field values in the correct order
        const parsedFieldValues = fieldNames.map(fieldName => {
          const value = response.parsed_fields?.[fieldName];
          return value ? `"${value}"` : '""';
        });
        
        return [...baseFields, ...demoValues, ...parsedFieldValues].join(',');
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

    const totalColumns = fieldNames.length + demoFieldNames.length + 4; // +4 for base fields
    toast({
      title: 'Export Complete',
      description: `Exported ${responses.length} responses with ${demoFieldNames.length} demographic field(s) and ${fieldNames.length} extracted field(s).`,
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
      {/* Demographics Summary */}
      {demographics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Demographics ({demographics.length})
            </CardTitle>
            <CardDescription>
              Demographic information collected for this form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {demographics.map((demo) => (
                <div key={demo.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{demo.source}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(demo.created_at).toLocaleDateString()} {new Date(demo.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {demo.parsed_json?.fields && Object.keys(demo.parsed_json.fields).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(demo.parsed_json.fields).map(([key, value]) => (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key}: {String(value)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {demo.raw_text && (
                    <p className="text-sm text-muted-foreground mt-2">
                      "{demo.raw_text}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Responses Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Responses ({responses.length})
            </span>
            <div className="flex gap-2">
              <Button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="ghost"
                size="sm"
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
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
            </div>
          </CardTitle>
          <CardDescription>
            All responses submitted for this form. {demographics.length > 0 && `Includes demographic data from ${demographics.length} submission(s).`}
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

