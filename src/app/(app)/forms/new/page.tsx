'use client';

import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { PlusCircle, Trash2 } from 'lucide-react';

type Question = {
  id: number;
  value: string;
};

export default function NewFormPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([
    { id: Date.now(), value: '' }
  ]);

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
    const formData = new FormData(event.currentTarget);
    const title = formData.get('title') as string;
    const formQuestions = questions.map(q => q.value).filter(Boolean);

    // In a real app, you'd save this to a database.
    // For now, we'll simulate it and redirect.
    console.log({ title, questions: formQuestions });
    
    // Simulate saving and getting an ID
    const newFormId = '123'; 

    const searchParams = new URLSearchParams();
    searchParams.set('title', title);
    formQuestions.forEach(q => searchParams.append('question', q));

    router.push(`/forms/record/${newFormId}?${searchParams.toString()}`);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-6 border-b bg-card">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">Create New Form</h1>
        </div>
        <Button type="submit" form="new-form-builder">Publish</Button>
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
                <Input id="title" name="title" placeholder="e.g., Customer Feedback Survey" required />
              </div>
              
              <div className="space-y-4">
                <Label>Questions</Label>
                {questions.map((question, index) => (
                  <div key={question.id} className="flex items-center gap-2">
                    <Input
                      name={`question-${question.id}`}
                      placeholder={`e.g., What could we do to improve your experience?`}
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