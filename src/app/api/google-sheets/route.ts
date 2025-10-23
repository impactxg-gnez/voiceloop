import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy import of Google Sheets service to avoid build-time initialization
const getGoogleSheetsService = async () => {
  const { googleSheetsService } = await import('@/lib/google-sheets');
  return googleSheetsService;
};

// Initialize Supabase client inside functions to avoid build-time errors
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

export async function POST(request: NextRequest) {
  try {
    const { formId, transcription, questionText } = await request.json();

    if (!formId || !transcription) {
      return NextResponse.json(
        { error: 'Form ID and transcription are required' },
        { status: 400 }
      );
    }

    // Check if Google Sheets credentials are configured
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      console.log('Google Sheets credentials not configured, skipping sheet integration');
      return NextResponse.json({
        success: false,
        error: 'Google Sheets integration not configured',
        message: 'Please configure GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in Vercel environment variables'
      });
    }

    console.log('Processing transcription for Google Sheets:', {
      formId,
      transcription,
      questionText
    });

    // Get form details
    const supabase = getSupabaseClient();
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, title')
      .eq('id', formId)
      .single();

    if (formError || !form) {
      console.error('Error fetching form:', formError);
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Get Google Sheets service
    const googleSheetsService = await getGoogleSheetsService();

    // Parse the transcription to extract structured data
    const parsedData = googleSheetsService.parseTranscription(transcription);
    console.log('Parsed data:', parsedData);

    // Create or get Google Sheet for this form
    const sheetConfig = await googleSheetsService.createOrGetSheet(formId, form.title);
    console.log('Sheet config:', sheetConfig);

    // Add response to Google Sheet
    const result = await googleSheetsService.addResponse(sheetConfig, parsedData);
    
    // Store sheet mapping in database for future reference
    await supabase
      .from('form_sheet_mappings')
      .upsert({
        form_id: formId,
        spreadsheet_id: sheetConfig.spreadsheetId,
        sheet_name: sheetConfig.sheetName,
        sheet_url: googleSheetsService.getSheetUrl(sheetConfig.spreadsheetId),
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      parsedData,
      sheetUrl: googleSheetsService.getSheetUrl(sheetConfig.spreadsheetId),
      spreadsheetId: sheetConfig.spreadsheetId
    });

  } catch (error: any) {
    console.error('Error processing transcription for Google Sheets:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process transcription',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Get sheet information for a form
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      );
    }

    // Get sheet mapping from database
    const supabase = getSupabaseClient();
    const { data: mapping, error } = await supabase
      .from('form_sheet_mappings')
      .select('*')
      .eq('form_id', formId)
      .single();

    if (error || !mapping) {
      return NextResponse.json(
        { error: 'No Google Sheet found for this form' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sheetUrl: mapping.sheet_url,
      spreadsheetId: mapping.spreadsheet_id,
      sheetName: mapping.sheet_name
    });

  } catch (error: any) {
    console.error('Error fetching sheet info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sheet information' },
      { status: 500 }
    );
  }
}
