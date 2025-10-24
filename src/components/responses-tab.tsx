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
  transcription: string;
  created_at: string;
  submitter_uid: string;
}

interface GoogleDriveLink {
  id: string;
  form_id: string;
  folder_id: string;
  folder_url: string;
  folder_name: string;
  created_at: string;
}

export function ResponsesTab({ formId }: { formId: string }) {
  const { toast } = useToast();
  const { user } = useUser();
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [googleDriveLink, setGoogleDriveLink] = useState<GoogleDriveLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch responses from Supabase
  const { data: responsesData, loading: responsesLoading } = useCollection<ResponseData>(
    'submissions',
    '*',
    { form_id: formId }
  );

  // Fetch Google Drive link
  const { data: driveLinkData, loading: driveLinkLoading } = useCollection<GoogleDriveLink>(
    'user_google_drive_links',
    '*',
    { form_id: formId, user_id: user?.id }
  );

  useEffect(() => {
    if (responsesData) {
      setResponses(responsesData);
    }
  }, [responsesData]);

  useEffect(() => {
    if (driveLinkData && driveLinkData.length > 0) {
      setGoogleDriveLink(driveLinkData[0]);
    }
  }, [driveLinkData]);

  useEffect(() => {
    setIsLoading(responsesLoading || driveLinkLoading);
  }, [responsesLoading, driveLinkLoading]);

  const exportToCSV = () => {
    if (responses.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Export',
        description: 'There are no responses to export yet.',
      });
      return;
    }

    const csvContent = [
      ['Question', 'Response', 'Date', 'Time'].join(','),
      ...responses.map(response => [
        `"${response.question_text}"`,
        `"${response.transcription}"`,
        `"${new Date(response.created_at).toLocaleDateString()}"`,
        `"${new Date(response.created_at).toLocaleTimeString()}"`
      ].join(','))
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
      {/* Google Drive Status */}
      {googleDriveLink ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Google Drive Connected
            </CardTitle>
            <CardDescription>
              Your responses are automatically saved to your Google Drive.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{googleDriveLink.folder_name}</p>
                <p className="text-sm text-muted-foreground">
                  Connected on {new Date(googleDriveLink.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={googleDriveLink.folder_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Folder
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-400" />
              Google Drive Not Connected
            </CardTitle>
            <CardDescription>
              Connect your Google Drive to automatically save responses.
            </CardDescription>
          </CardHeader>
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
                  <div key={response.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{response.question_text}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          "{response.transcription}"
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

