'use client';

import { useCollection, useSupabaseClient, useUser } from "@/supabase";
import { useMemoSupabase } from "@/supabase/provider";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { FileText, PlusCircle, ArrowRight, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Form = {
  id: string;
  title: string;
  question_count: number;
  created_at: string;
};

export default function FormsPage() {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const { toast } = useToast();

  const formsQuery = useMemoSupabase(() => {
    if (!user) return null;
    return 'forms';
  }, [user]);

  const { data: forms, isLoading } = useCollection<Form>(formsQuery, '*', { owner_uid: user?.id });

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-6 border-b bg-card">
         <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">Forms</h1>
        </div>
        <Button asChild>
          <Link href="/forms/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Form
          </Link>
        </Button>
      </header>
      <main className="p-6 flex-1 overflow-auto">
        {isLoading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {!isLoading && forms && forms.length > 0 && (
           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map(form => (
              <Card key={form.id} className="flex flex-col">
                <div className="p-6 flex-grow">
                  <h3 className="text-lg font-semibold mb-2">{form.title}</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="h-4 w-4 mr-2"/>
                    <span>{form.question_count || 0} questions</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {formatDistanceToNow(new Date(form.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="p-4 border-t">
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/forms/record/${form.id}`}>
                        View <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/forms/edit/${form.id}`}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const url = `${window.location.origin}/forms/record/${form.id}`;
                        try {
                          await navigator.clipboard.writeText(url);
                          toast({ title: 'Link copied', description: 'Form link copied to clipboard.' });
                        } catch {
                          toast({ title: 'Link', description: url });
                        }
                      }}
                    >
                      Share
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (!confirm('Delete this form? This action cannot be undone.')) return;
                        const { error } = await supabase.from('forms').delete().eq('id', form.id);
                        if (!error) {
                          window.location.reload();
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
           </div>
        )}

        {!isLoading && (!forms || forms.length === 0) && (
          <div className="border rounded-lg p-12 text-center">
              <h2 className="text-xl font-semibold">No forms yet</h2>
              <p className="text-muted-foreground mt-2">Click "New Form" to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
}
