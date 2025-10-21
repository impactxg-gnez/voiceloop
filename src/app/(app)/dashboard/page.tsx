'use client';

import { useCollection, useSupabaseClient, useUser } from "@/supabase";
import { useMemoSupabase } from "@/supabase/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { FileText, MessageSquare, PlusCircle, Smile, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

type Form = {
  id: string;
  title: string;
  created_at: string;
};

function RecentForms() {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const recentFormsQuery = useMemoSupabase(() => {
    if (!user) return null;
    return 'forms';
  }, [user]);

  const { data: forms, isLoading } = useCollection<Form>(recentFormsQuery, '*', { owner_uid: user?.id });

  if (isLoading) {
    return (
       <div className="border rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Recent Forms</h2>
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    )
  }

  if (!forms || forms.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-semibold mb-4">Recent Forms</h2>
        <Card className="flex flex-col items-center justify-center text-center p-12">
          <CardHeader>
            <CardTitle>No Forms Created Yet</CardTitle>
            <CardDescription className="mt-2">
              Create your first form to start collecting voice feedback from your audience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link href="/forms/new">
                <PlusCircle className="mr-2 h-5 w-5" />
                Create Your First Form
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Recent Forms</h2>
      <div className="border rounded-lg">
        <ul className="divide-y">
          {forms.slice(0, 5).map((form) => (
            <li key={form.id} className="p-4 hover:bg-muted/50 transition-colors flex justify-between items-center">
              <div>
                <Link href={`/forms/record/${form.id}`} className="font-semibold hover:underline">{form.title}</Link>
                <p className="text-sm text-muted-foreground">
                  Created {formatDistanceToNow(new Date(form.created_at), { addSuffix: true })}
                </p>
              </div>
               <Button asChild variant="outline" size="sm">
                <Link href={`/forms/record/${form.id}`}>
                  View Form <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-6 border-b bg-card">
         <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <Button asChild>
          <Link href="/forms/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Form
          </Link>
        </Button>
      </header>
      <main className="p-6 flex-1 overflow-auto">
        <div className="grid gap-8">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">No responses yet</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Forms</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">No active forms</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Sentiment</CardTitle>
                <Smile className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Not enough data</p>
              </CardContent>
            </Card>
          </div>

          <RecentForms />

        </div>
      </main>
    </div>
  );
}
