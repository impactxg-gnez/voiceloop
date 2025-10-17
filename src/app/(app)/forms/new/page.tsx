'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function NewFormPage() {
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = formData.get('title') as string;
    const question = formData.get('question') as string;

    // In a real app, you'd save this to a database.
    // For now, we'll simulate it and redirect.
    console.log({ title, question });
    
    // Simulate saving and getting an ID
    const newFormId = '123'; 

    router.push(`/forms/record/${newFormId}?title=${encodeURIComponent(title)}&question=${encodeURIComponent(question)}`);
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
          </CardHeader>
          <CardContent>
            <form id="new-form-builder" className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="title">Form Title</Label>
                <Input id="title" name="title" placeholder="e.g., Customer Feedback Survey" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="question">Your Question</Label>
                <Textarea
                  id="question"
                  name="question"
                  placeholder="e.g., What could we do to improve your experience?"
                  required
                />
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
