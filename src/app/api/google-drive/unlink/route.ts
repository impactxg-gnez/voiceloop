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

export async function POST(request: NextRequest) {
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

