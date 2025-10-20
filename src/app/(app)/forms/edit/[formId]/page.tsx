'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseClient, useUser } from '@/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { DemographicsFieldsManager, type DemographicField } from '@/components/demographics-fields-manager';
import { FormPageManager } from '@/components/form-page-manager';
import { Label } from '@/components/ui/label';

export default function EditFormPage() {
  const params = useParams();
  const formId = params?.formId as string;
  const supabase = useSupabaseClient();
  const router = useRouter();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [pages, setPages] = useState<any[]>([]);
  const [fields, setFields] = useState<DemographicField[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: form }, { data: formPages }, { data: demoFields }] = await Promise.all([
        supabase.from('forms').select('title').eq('id', formId).single(),
        supabase.from('form_pages').select('*').eq('form_id', formId).order('page_order', { ascending: true }),
        supabase.from('form_demographic_fields').select('*').eq('form_id', formId)
      ] as any);

      setTitle(form?.title || '');
      setPages(formPages || []);
      setFields((demoFields || []).map((f: any) => ({
        id: f.id,
        field_key: f.field_key,
        label: f.label,
        input_type: (f.input_type as any) || 'text',
        required: !!f.required,
        options: Array.isArray(f.options) ? f.options : [],
      })));
      setLoading(false);
    };
    if (formId) load();
  }, [formId, supabase]);

  const save = async () => {
    const { error } = await supabase.from('forms').update({ title }).eq('id', formId);
    if (error) return;
    // Save demographic fields (simple approach: delete + insert)
    await supabase.from('form_demographic_fields').delete().eq('form_id', formId);
    if (fields.length) {
      await supabase.from('form_demographic_fields').insert(fields.map(f => ({
        form_id: formId,
        field_key: f.field_key,
        label: f.label,
        input_type: f.input_type,
        required: f.required,
        options: f.input_type === 'select' ? f.options : null,
      })));
    }
    // Pages are handled inside FormPageManager (live updates)
    router.push('/forms');
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Form</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Form Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <DemographicsFieldsManager fields={fields} onChange={setFields} />

      <FormPageManager formId={formId} pages={pages} onPagesChange={setPages} />

      <div className="flex justify-end">
        <Button onClick={save}>Save Changes</Button>
      </div>
    </div>
  );
}


