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
const createGoogleDriveFolder = async (folderName: string, userId: string) => {
  // For now, we'll use the existing Google Sheets service
  // In a full implementation, you'd use Google Drive API directly
  const { googleSheetsService } = await import('@/lib/google-sheets');
  
  try {
    // Create a spreadsheet that acts as our "folder" for this user
    const spreadsheetId = await googleSheetsService.createUserFolder(userId, folderName);
    const folderUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    
    return {
      folderId: spreadsheetId,
      folderUrl,
    };
  } catch (error) {
    console.error('Error creating Google Drive folder:', error);
    throw new Error('Failed to create Google Drive folder');
  }
};

export async function POST(request: NextRequest) {
  try {
    const { formId, userId, folderName } = await request.json();

    if (!formId || !userId) {
      return NextResponse.json(
        { error: 'Form ID and User ID are required' },
        { status: 400 }
      );
    }

    // Create Google Drive folder
    const { folderId, folderUrl } = await createGoogleDriveFolder(
      folderName || `VoiceForm Responses - ${new Date().toLocaleDateString()}`,
      userId
    );

    // Save the link to database
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('user_google_drive_links')
      .upsert({
        user_id: userId,
        form_id: formId,
        folder_id: folderId,
        folder_url: folderUrl,
        folder_name: folderName || `VoiceForm Responses - ${new Date().toLocaleDateString()}`,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving Google Drive link:', error);
      return NextResponse.json(
        { error: 'Failed to save Google Drive link' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      folderId,
      folderUrl,
      message: 'Google Drive linked successfully',
    });

  } catch (error: any) {
    console.error('Error linking Google Drive:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to link Google Drive' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { formId, userId } = await request.json();

    if (!formId || !userId) {
      return NextResponse.json(
        { error: 'Form ID and User ID are required' },
        { status: 400 }
      );
    }

    // Remove the link from database
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('user_google_drive_links')
      .delete()
      .eq('user_id', userId)
      .eq('form_id', formId);

    if (error) {
      console.error('Error removing Google Drive link:', error);
      return NextResponse.json(
        { error: 'Failed to remove Google Drive link' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Google Drive unlinked successfully',
    });

  } catch (error: any) {
    console.error('Error unlinking Google Drive:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unlink Google Drive' },
      { status: 500 }
    );
  }
}

