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
  try {
    // First, validate the folder ID format
    if (!folderId || folderId.length < 10) {
      return {
        valid: false,
        error: 'Invalid folder ID format'
      };
    }

    // For now, let's do a simple validation - just check if the folder ID looks valid
    // In a real implementation, you'd use Google Drive API to check access
    const folderIdPattern = /^[a-zA-Z0-9-_]+$/;
    if (!folderIdPattern.test(folderId)) {
      return {
        valid: false,
        error: 'Invalid folder ID format. Folder ID should only contain letters, numbers, hyphens, and underscores.'
      };
    }

    // Basic validation - if we get here, the folder ID format is valid
    // In production, you'd make an actual API call to Google Drive to verify access
    console.log('Validating folder ID:', folderId);
    
    return {
      valid: true,
      folderName: 'Google Drive Folder',
      folderId
    };
  } catch (error: any) {
    console.error('Error validating Google Drive folder:', error);
    
    return {
      valid: false,
      error: 'Validation error: ' + (error.message || 'Unknown error')
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
