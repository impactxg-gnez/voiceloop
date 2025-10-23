'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GoogleSheetsInfoProps {
  formId: string;
}

interface SheetInfo {
  sheetUrl: string;
  spreadsheetId: string;
  sheetName: string;
}

export function GoogleSheetsInfo({ formId }: GoogleSheetsInfoProps) {
  const [sheetInfo, setSheetInfo] = useState<SheetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSheetInfo();
  }, [formId]);

  const fetchSheetInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/google-sheets?formId=${formId}`);
      
      if (response.ok) {
        const data = await response.json();
        setSheetInfo(data);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch sheet information');
      }
    } catch (err) {
      setError('Network error while fetching sheet information');
    } finally {
      setLoading(false);
    }
  };

  const openSheet = () => {
    if (sheetInfo?.sheetUrl) {
      window.open(sheetInfo.sheetUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Google Sheets Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading sheet information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Google Sheets Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">
              A Google Sheet will be created automatically when you submit your first response.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Google Sheets Integration
        </CardTitle>
        <CardDescription>
          Your form responses are automatically exported to Google Sheets with structured data extraction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-200">
                  Sheet Ready
                </h4>
                <p className="text-sm text-green-600 dark:text-green-300">
                  Responses are automatically parsed and added to your Google Sheet
                </p>
              </div>
              <Button onClick={openSheet} variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Sheet
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Sheet ID:</strong> {sheetInfo?.spreadsheetId}</p>
            <p><strong>Sheet Name:</strong> {sheetInfo?.sheetName}</p>
          </div>

          <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <p className="font-medium mb-2">How it works:</p>
            <ul className="space-y-1">
              <li>• Responses like "My Name is Keval" automatically create a "Name" column</li>
              <li>• Age, email, phone, city, and other data are extracted automatically</li>
              <li>• Each form submission adds a new row to the sheet</li>
              <li>• Columns are created dynamically based on the content</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
