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
    console.log('Debug forms API called');
    
    const supabase = getSupabaseClient();
    console.log('Supabase client initialized');
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('forms')
      .select('count')
      .limit(1);
    
    console.log('Test query result:', { testData, testError });
    
    // Test the exact query that's failing
    const { data: forms, error: formsError } = await supabase
      .from('forms')
      .select('id, title, created_at, is_published')
      .limit(5);
    
    console.log('Forms query result:', { forms, formsError });
    
    // Test with different field selection
    const { data: formsSimple, error: formsSimpleError } = await supabase
      .from('forms')
      .select('id, title')
      .limit(5);
    
    console.log('Simple forms query result:', { formsSimple, formsSimpleError });
    
    return NextResponse.json({
      success: true,
      testQuery: { data: testData, error: testError },
      formsQuery: { data: forms, error: formsError },
      simpleQuery: { data: formsSimple, error: formsSimpleError },
      envVars: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    });
    
  } catch (error: any) {
    console.error('Debug forms error:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed',
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
