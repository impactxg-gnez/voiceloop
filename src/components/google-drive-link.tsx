'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink, FolderOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/supabase';

interface GoogleDriveLinkProps {
  formId: string;
  onLinked?: (folderId: string, folderUrl: string) => void;
}

export function GoogleDriveLink({ formId, onLinked }: GoogleDriveLinkProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [isLinking, setIsLinking] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [folderId, setFolderId] = useState('');
  const [folderUrl, setFolderUrl] = useState('');
  const [customFolderName, setCustomFolderName] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Extract folder ID from Google Drive URL
  const extractFolderId = (url: string): string | null => {
    // Clean the URL first - remove any trailing quotes or whitespace
    const cleanUrl = url.trim().replace(/['"]+$/, '');
    
    // Handle different Google Drive URL formats
    const patterns = [
      /\/folders\/([a-zA-Z0-9-_]+)/,  // https://drive.google.com/drive/folders/1ABC...
      /id=([a-zA-Z0-9-_]+)/,          // https://drive.google.com/drive/folders/1ABC...?usp=sharing
      /\/folders\/([a-zA-Z0-9-_]+)\?/, // https://drive.google.com/drive/folders/1ABC...?usp=sharing
    ];
    
    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  const validateDriveFolder = async (url: string): Promise<{ valid: boolean; folderId?: string; folderName?: string; error?: string }> => {
    console.log('Validating URL:', url);
    
    const folderId = extractFolderId(url);
    console.log('Extracted folder ID:', folderId);
    
    if (!folderId) {
      return { 
        valid: false, 
        error: 'Invalid Google Drive URL format. Please make sure the URL contains a folder ID.' 
      };
    }

    try {
      console.log('Sending validation request for folder ID:', folderId);
      
      // Validate the folder exists and is accessible
      const response = await fetch('/api/google-drive/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId,
          userId: user?.id,
        }),
      });

      console.log('Validation response status:', response.status);
      
      const data = await response.json();
      console.log('Validation response data:', data);
      
      if (response.ok) {
        return {
          valid: true,
          folderId,
          folderName: data.folderName || 'Google Drive Folder'
        };
      } else {
        return {
          valid: false,
          error: data.error || 'Could not access the Google Drive folder. Please check permissions.'
        };
      }
    } catch (error) {
      console.error('Error validating folder:', error);
      return { 
        valid: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  };

  const handleValidateFolder = async () => {
    if (!driveFolderUrl.trim()) {
      toast({
        variant: 'destructive',
        title: 'Folder URL Required',
        description: 'Please enter a Google Drive folder URL.',
      });
      return;
    }

    setIsValidating(true);
    try {
      const validation = await validateDriveFolder(driveFolderUrl);
      
      if (validation.valid) {
        setFolderId(validation.folderId!);
        setFolderUrl(driveFolderUrl);
        setCustomFolderName(validation.folderName || 'Google Drive Folder');
        
        toast({
          title: 'Folder Validated!',
          description: 'Google Drive folder is ready to use.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid Folder',
          description: validation.error || 'Please check the Google Drive folder URL and try again.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Validation Failed',
        description: 'Could not validate the folder. Please try again.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleLinkGoogleDrive = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'Please sign in to link your Google Drive.',
      });
      return;
    }

    if (!folderId || !folderUrl) {
      toast({
        variant: 'destructive',
        title: 'Folder Required',
        description: 'Please validate a Google Drive folder first.',
      });
      return;
    }

    // If formId is 'temp', we can't link yet
    if (formId === 'temp') {
      toast({
        title: 'Form Not Created Yet',
        description: 'Please create the form first, then you can link your Google Drive folder.',
      });
      return;
    }

    setIsLinking(true);
    try {
      const response = await fetch('/api/google-drive/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId,
          userId: user.id,
          folderId,
          folderUrl,
          folderName: customFolderName || 'Google Drive Folder',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsLinked(true);
        
        toast({
          title: 'Google Drive Linked Successfully!',
          description: 'Your responses will now be saved to your Google Drive folder.',
        });

        onLinked?.(folderId, folderUrl);
      } else {
        throw new Error(data.error || 'Failed to link Google Drive');
      }
    } catch (error: any) {
      console.error('Error linking Google Drive:', error);
      toast({
        variant: 'destructive',
        title: 'Google Drive Linking Failed',
        description: error.message || 'Could not link to Google Drive. Please try again.',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkGoogleDrive = async () => {
    setIsLinking(true);
    try {
      const response = await fetch('/api/google-drive/unlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId,
          userId: user?.id,
        }),
      });

      if (response.ok) {
        setIsLinked(false);
        setFolderId('');
        setFolderUrl('');
        
        toast({
          title: 'Google Drive Unlinked',
          description: 'Your responses will no longer be saved to Google Drive.',
        });
      } else {
        throw new Error('Failed to unlink Google Drive');
      }
    } catch (error: any) {
      console.error('Error unlinking Google Drive:', error);
      toast({
        variant: 'destructive',
        title: 'Unlinking Failed',
        description: 'Could not unlink Google Drive. Please try again.',
      });
    } finally {
      setIsLinking(false);
    }
  };

  if (isLinked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Google Drive Linked
          </CardTitle>
          <CardDescription>
            Your responses are being saved to your Google Drive folder.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <FolderOpen className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-300">
              Folder ID: {folderId}
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={folderUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Folder
              </a>
            </Button>
            
            <Button 
              onClick={handleUnlinkGoogleDrive}
              variant="destructive" 
              size="sm"
              disabled={isLinking}
            >
              {isLinking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unlinking...
                </>
              ) : (
                'Unlink Drive'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Link Google Drive
        </CardTitle>
        <CardDescription>
          Connect your Google Drive to automatically save form responses. You'll have full control over your data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="driveFolderUrl">Google Drive Folder URL</Label>
          <div className="flex gap-2">
            <Input
              id="driveFolderUrl"
              placeholder="https://drive.google.com/drive/folders/1ABC..."
              value={driveFolderUrl}
              onChange={(e) => {
                // Clean the input by removing trailing quotes and whitespace
                const cleanedValue = e.target.value.trim().replace(/['"]+$/, '');
                setDriveFolderUrl(cleanedValue);
              }}
              className="flex-1"
            />
            <Button 
              onClick={handleValidateFolder}
              disabled={isValidating || !driveFolderUrl.trim()}
              variant="outline"
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                'Validate'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste the URL of your Google Drive folder where responses should be saved.
          </p>
        </div>

        {folderId && formId === 'temp' && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                Folder validated! Create the form first, then you can link this folder.
              </span>
            </div>
          </div>
        )}

        {folderId && formId !== 'temp' && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Folder validated: {customFolderName}
              </span>
            </div>
          </div>
        )}

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium">What happens when you link:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• A new folder will be created in your Google Drive</li>
                <li>• All form responses will be saved as spreadsheets</li>
                <li>• You can access your data anytime through Google Drive</li>
                <li>• You can share or export your data as needed</li>
              </ul>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleLinkGoogleDrive}
          disabled={isLinking || !folderId || formId === 'temp'}
          className="w-full"
        >
          {isLinking ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Linking to Google Drive...
            </>
          ) : formId === 'temp' ? (
            <>
              <FolderOpen className="h-4 w-4 mr-2" />
              Create Form First
            </>
          ) : (
            <>
              <FolderOpen className="h-4 w-4 mr-2" />
              Link This Folder
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

