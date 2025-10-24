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

  const handleLinkGoogleDrive = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'Please sign in to link your Google Drive.',
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
          folderName: customFolderName || `VoiceForm Responses - ${new Date().toLocaleDateString()}`,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFolderId(data.folderId);
        setFolderUrl(data.folderUrl);
        setIsLinked(true);
        
        toast({
          title: 'Google Drive Linked Successfully!',
          description: 'Your responses will now be saved to your Google Drive.',
        });

        onLinked?.(data.folderId, data.folderUrl);
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
          <Label htmlFor="folderName">Folder Name (Optional)</Label>
          <Input
            id="folderName"
            placeholder="VoiceForm Responses - December 2024"
            value={customFolderName}
            onChange={(e) => setCustomFolderName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to use default naming: "VoiceForm Responses - [Date]"
          </p>
        </div>

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
          disabled={isLinking}
          className="w-full"
        >
          {isLinking ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Linking to Google Drive...
            </>
          ) : (
            <>
              <FolderOpen className="h-4 w-4 mr-2" />
              Link My Google Drive
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

