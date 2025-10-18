'use client';

import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

type Question = {
  id: number;
  value: string;
};

export default function NewFormPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [questions, setQuestions] = useState<Question[]>([
    { id: Date.now(), value: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formTitle, setFormTitle] = useState('');


  const addQuestion = () => {
    setQuestions(prev => [...prev, { id: Date.now(), value: '' }]);
  };

  const removeQuestion = (id: number) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleQuestionChange = (id: number, value: string) => {
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, value } : q)));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !firestore) {
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
      const batch = writeBatch(firestore);
      
      // Create a reference for the new form document with a unique ID
      const formRef = doc(collection(firestore, 'forms'));

      // Set the main form document data
      batch.set(formRef, {
        title: formTitle,
        ownerUid: user.uid, // <-- This is crucial for security rules
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        questionCount: formQuestions.length,
      });
      
      // Set the questions in the subcollection for that form
      formQuestions.forEach((questionText, index) => {
        const questionRef = doc(collection(firestore, 'forms', formRef.id, 'questions'));
        batch.set(questionRef, {
          text: questionText,
          order: index,
        });
      });

      // Commit the batch
      await batch.commit();

      toast({ title: 'Form published!', description: 'Your new form is live.' });
      router.push(`/forms/record/${formRef.id}`);

    } catch (error) {
      console.error('Error creating form:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not create the form. Please check permissions and try again.',
      });
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
        <Button type="submit" form="new-form-builder" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : 'Publish'}
        </Button>
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
              
              <div className="space-y-4">
                <Label>Questions</Label>
                {questions.map((question, index) => (
                  <div key={question.id} className="flex items-center gap-2">
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
