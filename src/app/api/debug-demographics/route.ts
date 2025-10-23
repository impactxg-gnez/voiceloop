import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json({ error: 'formId is required' }, { status: 400 });
    }

    // Initialize Supabase client inside function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Debug demographics - formId:', formId);
    console.log('Environment variables check:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
    console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');

    // Query the form_demographic_fields table
    const { data: fields, error: fieldsError } = await supabase
      .from('form_demographic_fields')
      .select('*')
      .eq('form_id', formId);

    if (fieldsError) {
      console.error('Error querying form_demographic_fields:', fieldsError);
      return NextResponse.json({ error: fieldsError.message }, { status: 500 });
    }

    // Also check if the form exists
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, title, created_at')
      .eq('id', formId)
      .single();

    if (formError) {
      console.error('Error querying forms:', formError);
    }

    console.log('Debug demographics - fields found:', fields?.length || 0);
    console.log('Debug demographics - fields data:', fields);
    console.log('Debug demographics - form data:', form);

    return NextResponse.json({
      formId,
      fieldsCount: fields?.length || 0,
      fields: fields || [],
      form: form || null,
      formExists: !!form,
      message: `Found ${fields?.length || 0} demographic fields for form ${formId}`
    });

  } catch (error) {
    console.error('Debug demographics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}