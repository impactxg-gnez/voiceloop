import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json({ error: 'formId is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if form exists
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (formError) {
      return NextResponse.json({ 
        error: 'Form not found', 
        details: formError.message,
        formId 
      }, { status: 404 });
    }

    // Check demographic fields
    const { data: fields, error: fieldsError } = await supabase
      .from('form_demographic_fields')
      .select('*')
      .eq('form_id', formId);

    if (fieldsError) {
      return NextResponse.json({ 
        error: 'Error fetching fields', 
        details: fieldsError.message,
        formId 
      }, { status: 500 });
    }

    return NextResponse.json({
      formId,
      form: {
        id: form.id,
        title: form.title,
        owner_uid: form.owner_uid
      },
      demographicFields: fields || [],
      fieldsCount: fields?.length || 0
    });

  } catch (error) {
    console.error('Debug demographics error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
