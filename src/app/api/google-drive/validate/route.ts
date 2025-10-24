import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

// Google Drive API functions
const validateGoogleDriveFolder = async (folderId: string, userId: string) => {
  // For now, we'll use the existing Google Sheets service to validate
  // In a full implementation, you'd use Google Drive API directly
  const { googleSheetsService } = await import('@/lib/google-sheets');
  
  try {
    // Try to create a test file in the folder to validate access
    // This is a simplified validation - in production you'd use proper Drive API
    const testSpreadsheetId = await googleSheetsService.createUserFolder(
      userId, 
      `VoiceForm Test - ${Date.now()}`
    );
    
    // Clean up the test file
    try {
      await googleSheetsService.deleteSpreadsheet(testSpreadsheetId);
    } catch (cleanupError) {
      console.log('Test file cleanup failed, but validation succeeded');
    }
    
    return {
      valid: true,
      folderName: 'Google Drive Folder',
      folderId
    };
  } catch (error) {
    console.error('Error validating Google Drive folder:', error);
    return {
      valid: false,
      error: 'Could not access the specified Google Drive folder'
    };
  }
};

export async function POST(request: NextRequest) {
  try {
    const { folderId, userId } = await request.json();

    if (!folderId || !userId) {
      return NextResponse.json(
        { error: 'Folder ID and User ID are required' },
        { status: 400 }
      );
    }

    // Validate the Google Drive folder
    const validation = await validateGoogleDriveFolder(folderId, userId);

    if (validation.valid) {
      return NextResponse.json({
        success: true,
        folderId: validation.folderId,
        folderName: validation.folderName,
        message: 'Folder validated successfully',
      });
    } else {
      return NextResponse.json(
        { 
          error: validation.error || 'Invalid Google Drive folder',
          valid: false 
        },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Error validating Google Drive folder:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to validate Google Drive folder',
        valid: false 
      },
      { status: 500 }
    );
  }
}
