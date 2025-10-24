'use client';

import { useState, useRef, useEffect } from 'react';
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
import { AISuggestionBuilder } from '@/components/ai-suggestion-builder';
import { GoogleSheetsInfo } from '@/components/google-sheets-info';
import { GoogleDriveLink } from '@/components/google-drive-link';

type Question = {
  id: number;
  value: string;
  qtype: 'voice' | 'mc' | 'ranking';
  options?: string[]; // individual options for mc/ranking
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
    { id: Date.now(), value: '', qtype: 'voice', options: [] }
  ]);
  const [formPages, setFormPages] = useState<FormPage[]>([]);
  const [demoFields, setDemoFields] = useState<DemographicField[]>([]);
  const demoFieldsRef = useRef<DemographicField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [aiBuilderEnabled, setAiBuilderEnabled] = useState(false);
  const [createdFormId, setCreatedFormId] = useState<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    demoFieldsRef.current = demoFields;
  }, [demoFields]);


  const addQuestion = () => {
    setQuestions(prev => [...prev, { id: Date.now(), value: '', qtype: 'voice', options: [] }]);
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
  const handleQuestionOptionsChange = (id: number, options: string[]) => {
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, options } : q)));
  };

  const addOption = (questionId: number) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, options: [...(q.options || []), ''] }
        : q
    ));
  };

  const removeOption = (questionId: number, optionIndex: number) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, options: (q.options || []).filter((_, index) => index !== optionIndex) }
        : q
    ));
  };

  const updateOption = (questionId: number, optionIndex: number, value: string) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            options: (q.options || []).map((opt, index) => 
              index === optionIndex ? value : opt
            )
          }
        : q
    ));
  };

  const handleFormMetadataGenerated = (title: string, description: string) => {
    setFormTitle(title);
    // You could also set a form description if needed
    console.log('Generated form metadata:', { title, description });
  };

  const handleAISuggestions = (suggestions: any[]) => {
    try {
      // Ensure suggestions is an array
      if (!Array.isArray(suggestions)) {
        console.error('AI suggestions is not an array:', suggestions);
        return;
      }

      const newQuestions = suggestions.map((suggestion, index) => {
        // Handle both old and new formats safely
        const questionText = suggestion?.question || suggestion || '';
        const questionType = suggestion?.type || 'voice';
        const questionOptions = Array.isArray(suggestion?.options) ? suggestion.options : [];
        
        return {
          id: Date.now() + index,
          value: questionText,
          qtype: questionType,
          options: questionOptions
        };
      }).filter(q => q.value.trim() !== ''); // Filter out empty questions

      setQuestions(prev => [...prev, ...newQuestions]);
    } catch (error) {
      console.error('Error processing AI suggestions:', error);
      toast({
        variant: 'destructive',
        title: 'Error Processing Suggestions',
        description: 'Could not process AI suggestions. Please try again.',
      });
    }
  };

  const handleAISuggestionsWithDemographics = (suggestions: any[], description: string) => {
    try {
      // Process questions first
      handleAISuggestions(suggestions);

      // Extract demographic fields from description
      const desc = description.toLowerCase();
      const demographicFields: DemographicField[] = [];

      // Map common demographic terms to field configurations
      const fieldMappings = {
        'name': { field_key: 'name', label: 'Name', input_type: 'text' as const },
        'age': { field_key: 'age', label: 'Age', input_type: 'number' as const },
        'city': { field_key: 'city', label: 'City', input_type: 'text' as const },
        'gender': { field_key: 'gender', label: 'Gender', input_type: 'select' as const, options: ['Male', 'Female', 'Other'] },
        'email': { field_key: 'email', label: 'Email', input_type: 'text' as const },
        'phone': { field_key: 'phone', label: 'Phone', input_type: 'text' as const },
        'address': { field_key: 'address', label: 'Address', input_type: 'text' as const }
      };

      // Check which fields are mentioned in the description
      Object.entries(fieldMappings).forEach(([key, config]) => {
        if (desc.includes(key)) {
          const field: DemographicField = {
            field_key: config.field_key,
            label: config.label,
            input_type: config.input_type,
            required: true
          };
          
          if (config.input_type === 'select' && config.options) {
            field.options = config.options;
          }
          
          demographicFields.push(field);
        }
      });

      // Set demographic fields if any were found
      if (demographicFields.length > 0) {
        setDemoFields(demographicFields);
        console.log('Generated demographic fields:', demographicFields);
      }
    } catch (error) {
      console.error('Error processing AI suggestions with demographics:', error);
    }
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
      console.log('Form submission - demoFields (from ref):', demoFieldsRef.current);
      console.log('Form submission - demoFields.length (from ref):', demoFieldsRef.current.length);
      if (demoFieldsRef.current.length > 0) {
        const fieldsData = demoFieldsRef.current.map(f => ({
          form_id: formData.id,
          field_key: f.field_key,
          label: f.label,
          input_type: f.input_type,
          required: f.required,
          options: f.input_type === 'select' ? (f.options || []) : null,
        }));
        console.log('Inserting demographic fields:', fieldsData);
        const { error: fieldsError } = await supabase.from('form_demographic_fields').insert(fieldsData);
        if (fieldsError) {
          console.error('Error inserting demographic fields:', fieldsError);
          throw fieldsError;
        }
        console.log('Successfully inserted demographic fields');
      } else {
        console.log('No demographic fields to insert');
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
      // Set the created form ID to show Google Sheets info
      setCreatedFormId(formData.id);
      
      // Show success message
      toast({
        title: 'Form Created Successfully!',
        description: 'Your form is ready. Google Sheets integration is set up automatically.',
      });

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

              {/* AI Suggestion Builder */}
              <AISuggestionBuilder
                onSuggestionsGenerated={handleAISuggestions}
                onFormMetadataGenerated={handleFormMetadataGenerated}
                onToggle={setAiBuilderEnabled}
                enabled={aiBuilderEnabled}
              />

              {/* Demographics Fields Manager */}
              <DemographicsFieldsManager fields={demoFields} onChange={setDemoFields} />

              {/* Form Pages Manager */}
              <FormPageManager 
                formId="" // Will be set after form creation
                pages={formPages}
                onPagesChange={setFormPages}
              />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Questions</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newQuestions = questions.map(q => ({ ...q, qtype: 'voice' as const }));
                        setQuestions(newQuestions);
                      }}
                    >
                      Set All Voice
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newQuestions = questions.map(q => ({ ...q, qtype: 'mc' as const }));
                        setQuestions(newQuestions);
                      }}
                    >
                      Set All MCQ
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newQuestions = questions.map(q => ({ ...q, qtype: 'ranking' as const }));
                        setQuestions(newQuestions);
                      }}
                    >
                      Set All Ranking
                    </Button>
                  </div>
                </div>
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
                        <Label>Question Type</Label>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant={question.qtype === 'voice' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleQuestionTypeChange(question.id, 'voice')}
                            className={`flex-1 ${
                              question.qtype === 'voice' 
                                ? 'bg-teal-600 text-white hover:bg-teal-700' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            Voice
                          </Button>
                          <Button
                            type="button"
                            variant={question.qtype === 'mc' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleQuestionTypeChange(question.id, 'mc')}
                            className={`flex-1 ${
                              question.qtype === 'mc' 
                                ? 'bg-teal-600 text-white hover:bg-teal-700' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            MCQ
                          </Button>
                          <Button
                            type="button"
                            variant={question.qtype === 'ranking' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleQuestionTypeChange(question.id, 'ranking')}
                            className={`flex-1 ${
                              question.qtype === 'ranking' 
                                ? 'bg-teal-600 text-white hover:bg-teal-700' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            Ranking
                          </Button>
                        </div>
                      </div>
                      {(question.qtype === 'mc' || question.qtype === 'ranking') && (
                        <div className="md:col-span-2">
                          <div className="flex items-center justify-between mb-2">
                            <Label>Options ({question.qtype === 'mc' ? 'multiple choice' : 'ranking order'})</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addOption(question.id)}
                            >
                              <PlusCircle className="h-4 w-4 mr-1" />
                              Add Option
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {(question.options || []).map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 w-6">
                                  {String.fromCharCode(65 + optionIndex)}.
                                </span>
                                <Input
                                  placeholder={`Option ${optionIndex + 1}`}
                                  value={option}
                                  onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOption(question.id, optionIndex)}
                                  disabled={(question.options || []).length <= 2}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            {(!question.options || question.options.length === 0) && (
                              <div className="text-sm text-gray-500 italic">
                                Click "Add Option" to add choices
                              </div>
                            )}
                          </div>
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

        {/* Google Sheets Integration Info */}
        {createdFormId && (
          <div className="max-w-2xl mx-auto mt-6 space-y-4">
            <GoogleSheetsInfo formId={createdFormId} />
            <GoogleDriveLink formId={createdFormId} />
          </div>
        )}
      </main>
    </div>
  );
}
