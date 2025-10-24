'use client';

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Calendar, Users, ExternalLink } from "lucide-react";
import { useCollection } from "@/supabase";
import { useState } from "react";
import { ResponsesTab } from "@/components/responses-tab";

interface Form {
  id: string;
  title: string;
  created_at: string;
  is_published: boolean;
}

export default function ResponsesPage() {
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  
  // Fetch user's forms
  const { data: forms, loading: formsLoading } = useCollection<Form>(
    'forms',
    'id, title, created_at, is_published',
    {},
    'created_at',
    'desc'
  );

  if (formsLoading) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center p-6 border-b bg-card">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold">Responses</h1>
          </div>
        </header>
        <main className="p-6 flex-1 overflow-auto flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    );
  }

  if (selectedFormId) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center p-6 border-b bg-card">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <Button 
              variant="ghost" 
              onClick={() => setSelectedFormId(null)}
              className="mr-2"
            >
              ← Back to Forms
            </Button>
            <h1 className="text-2xl font-bold">Form Responses</h1>
          </div>
        </header>
        <main className="p-6 flex-1 overflow-auto">
          <ResponsesTab formId={selectedFormId} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center p-6 border-b bg-card">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">Responses</h1>
        </div>
      </header>
      <main className="p-6 flex-1 overflow-auto">
        {!forms || forms.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold">No forms yet</h2>
            <p className="text-muted-foreground mt-2">Create your first form to start collecting responses.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your Forms</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {forms.map((form) => (
                <Card key={form.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{form.title}</CardTitle>
                        <CardDescription className="mt-1">
                          Created {new Date(form.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant={form.is_published ? "default" : "secondary"}>
                        {form.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(form.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button 
                        onClick={() => setSelectedFormId(form.id)}
                        size="sm"
                        variant="outline"
                      >
                        View Responses
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
