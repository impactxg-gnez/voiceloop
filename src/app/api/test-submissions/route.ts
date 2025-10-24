import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

export async function GET(request: NextRequest) {
  try {
    console.log('Test submissions API called');
    
    const supabase = getSupabaseClient();
    console.log('Supabase client initialized');
    
    // Test basic connection to submissions table
    const { data: testData, error: testError } = await supabase
      .from('submissions')
      .select('count')
      .limit(1);
    
    console.log('Submissions test query result:', { testData, testError });
    
    // Test inserting a test submission
    const testSubmission = {
      form_id: 'test-form-id',
      question_id: 'test-question-id',
      question_text: 'Test question',
      audio_url: '',
      transcription: 'Test transcription',
      submitter_uid: null
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('submissions')
      .insert(testSubmission)
      .select('id')
      .single();
    
    console.log('Test submission insert result:', { insertData, insertError });
    
    // Clean up test data
    if (insertData?.id) {
      await supabase
        .from('submissions')
        .delete()
        .eq('id', insertData.id);
    }
    
    return NextResponse.json({
      success: true,
      testQuery: { data: testData, error: testError },
      insertTest: { data: insertData, error: insertError },
      envVars: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    });
    
  } catch (error: any) {
    console.error('Test submissions error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
