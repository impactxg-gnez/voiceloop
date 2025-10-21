'use client';

import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { useSupabaseClient, useUser } from '@/supabase';
import { useToast } from '@/hooks/use-toast';
import { FormPageManager } from '@/components/form-page-manager';
import { DemographicsFieldsManager, type DemographicField } from '@/components/demographics-fields-manager';

type Question = {
  id: number;
  value: string;
  qtype: 'voice' | 'mc' | 'ranking';
  optionsText?: string; // comma or newline separated for mc/ranking
};

type FormPage = {
  id?: string;
  title: string;
  content: string;
  desktop_image_url?: string;
  mobile_image_url?: string;
  desktop_image_file?: File | null;
  mobile_image_file?: File | null;
  page_order: number;
  is_intro_page: boolean;
};

export default function NewFormPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [questions, setQuestions] = useState<Question[]>([
    { id: Date.now(), value: '', qtype: 'voice', optionsText: '' }
  ]);
  const [formPages, setFormPages] = useState<FormPage[]>([]);
  const [demoFields, setDemoFields] = useState<DemographicField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formTitle, setFormTitle] = useState('');


  const addQuestion = () => {
    setQuestions(prev => [...prev, { id: Date.now(), value: '', qtype: 'voice', optionsText: '' }]);
  };

  const removeQuestion = (id: number) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleQuestionChange = (id: number, value: string) => {
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, value } : q)));
  };
  const handleQuestionTypeChange = (id: number, qtype: 'voice' | 'mc' | 'ranking') => {
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, qtype } : q)));
  };
  const handleQuestionOptionsChange = (id: number, optionsText: string) => {
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, optionsText } : q)));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !supabase) {
        toast({ variant: 'destructive', title: 'You must be logged in to create a form.' });
        return;
    }

    setIsSubmitting(true);

    const formQuestions = questions.map(q => q.value).filter(q => q.trim() !== '');
    
    if (!formTitle.trim()) {
      toast({ variant: 'destructive', title: 'Form title is required.' });
      setIsSubmitting(false);
      return;
    }
    if (formQuestions.length === 0) {
      toast({ variant: 'destructive', title: 'At least one question is required.' });
      setIsSubmitting(false);
      return;
    }

    try {
      // Create the form
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .insert({
          title: formTitle,
          owner_uid: user.id,
          question_count: formQuestions.length,
        })
        .select()
        .single();

      if (formError) {
        throw formError;
      }

      // Insert demographic fields if any
      if (demoFields.length > 0) {
        const fieldsData = demoFields.map(f => ({
          form_id: formData.id,
          field_key: f.field_key,
          label: f.label,
          input_type: f.input_type,
          required: f.required,
          options: f.input_type === 'select' ? (f.options || []) : null,
        }));
        const { error: fieldsError } = await supabase.from('form_demographic_fields').insert(fieldsData);
        if (fieldsError) throw fieldsError;
      }

      // Create form pages if any exist
      if (formPages.length > 0) {
        const pagesData = formPages.map(page => ({
          form_id: formData.id,
          title: page.title,
          content: page.content,
          page_order: page.page_order,
          is_intro_page: page.is_intro_page
        }));

        const { error: pagesError } = await supabase
          .from('form_pages')
          .insert(pagesData);

        if (pagesError) {
          throw pagesError;
        }
      }

      // Create the questions
      const questionsData = questions
        .filter(q => q.value.trim() !== '')
        .map((q, index) => ({
          form_id: formData.id,
          text: q.value,
          question_order: index,
          // Note: type and options columns need to be added to database schema
          // ...(q.qtype ? { type: q.qtype } : {} as any),
          // ...(q.qtype !== 'voice' && q.optionsText
          //   ? { options: (q.optionsText || '')
          //       .split(/\n|,/)
          //       .map(s => s.trim())
          //       .filter(Boolean) }
          //   : {} as any),
        }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsData);

      if (questionsError) {
        throw questionsError;
      }

      toast({ title: 'Form published!', description: 'Your new form is live.' });
      // Show share link
      navigator.clipboard?.writeText(`${window.location.origin}/forms/record/${formData.id}`).catch(() => {});
      router.push(`/forms/record/${formData.id}`);

    } catch (error: any) {
      console.error('Error creating form:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || 'Could not create the form. Please check permissions and try again.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user || !supabase) {
      toast({ variant: 'destructive', title: 'You must be logged in to create a form.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const formQuestions = questions.map(q => q.value).filter(q => q.trim() !== '');
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .insert({
          title: formTitle || 'Untitled Form',
          owner_uid: user.id,
          question_count: formQuestions.length,
          // optional status column ignored if absent
        })
        .select()
        .single();
      if (formError) throw formError;

      if (demoFields.length > 0) {
        const fieldsData = demoFields.map(f => ({
          form_id: formData.id,
          field_key: f.field_key,
          label: f.label,
          input_type: f.input_type,
          required: f.required,
          options: f.input_type === 'select' ? (f.options || []) : null,
        }));
        const { error: fieldsError } = await supabase.from('form_demographic_fields').insert(fieldsData);
        if (fieldsError) throw fieldsError;
      }

      if (formPages.length > 0) {
        const pagesData = formPages.map(page => ({
          form_id: formData.id,
          title: page.title,
          content: page.content,
          page_order: page.page_order,
          is_intro_page: page.is_intro_page,
        }));
        const { error: pagesError } = await supabase.from('form_pages').insert(pagesData);
        if (pagesError) throw pagesError;
      }

      if (formQuestions.length > 0) {
        const questionsData = formQuestions.map((questionText, index) => ({
          form_id: formData.id,
          text: questionText,
          question_order: index,
        }));
        const { error: qErr } = await supabase.from('questions').insert(questionsData);
        if (qErr) throw qErr;
      }

      toast({ title: 'Draft saved', description: 'Continue editing your form.' });
      router.push(`/forms/edit/${formData.id}`);
    } catch (error: any) {
      console.error('Error saving draft:', error);
      toast({ variant: 'destructive', title: 'Error', description: error?.message || 'Could not save draft.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  // Redirect if user is not logged in after checking.
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-6 border-b bg-card">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">Create New Form</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>
            Save Draft
          </Button>
          <Button type="submit" form="new-form-builder" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : 'Publish'}
          </Button>
        </div>
      </header>
      <main className="p-6 flex-1 overflow-auto">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Form Builder</CardTitle>
            <CardDescription>Add a title and one or more questions for your voice feedback form.</CardDescription>
          </CardHeader>
          <CardContent>
            <form id="new-form-builder" className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="title">Form Title</Label>
                <Input 
                  id="title" 
                  name="title" 
                  placeholder="e.g., Customer Feedback Survey" 
                  required 
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              {/* Demographics Fields Manager */}
              <DemographicsFieldsManager fields={demoFields} onChange={setDemoFields} />

              {/* Form Pages Manager */}
              <FormPageManager 
                formId="" // Will be set after form creation
                pages={formPages}
                onPagesChange={setFormPages}
              />
              
              <div className="space-y-4">
                <Label>Questions</Label>
                {questions.map((question, index) => (
                  <div key={question.id} className="space-y-2 border rounded-md p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        name={`question-${question.id}`}
                        placeholder={`Question ${index + 1}: What could we do to improve?`}
                        value={question.value}
                        onChange={(e) => handleQuestionChange(question.id, e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(question.id)}
                        disabled={questions.length <= 1}
                        aria-label="Remove question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <Label>Type</Label>
                        <select
                          className="w-full border rounded h-9 px-2"
                          value={question.qtype}
                          onChange={(e) => handleQuestionTypeChange(question.id, e.target.value as any)}
                        >
                          <option value="voice">Voice (default)</option>
                          <option value="mc">Multiple Choice</option>
                          <option value="ranking">Ranking</option>
                        </select>
                      </div>
                      {(question.qtype === 'mc' || question.qtype === 'ranking') && (
                        <div className="md:col-span-2">
                          <Label>Options ({question.qtype === 'mc' ? 'comma or newline separated' : 'drag order will be captured'})</Label>
                          <Input
                            placeholder={question.qtype === 'mc' ? 'A, B, C, D' : 'A, B, C, D'}
                            value={question.optionsText || ''}
                            onChange={(e) => handleQuestionOptionsChange(question.id, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" onClick={addQuestion}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
