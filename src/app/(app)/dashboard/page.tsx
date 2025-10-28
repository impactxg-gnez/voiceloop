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
import { useState, useEffect } from "react";

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


function DashboardStats() {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [stats, setStats] = useState({
    totalResponses: 0,
    activeForms: 0,
    avgSentiment: '--',
    isLoading: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !supabase) return;

      try {
        // Fetch total responses count
        const { count: responsesCount } = await supabase
          .from('form_responses')
          .select('*', { count: 'exact', head: true })
          .not('response_text', 'eq', 'processing…');

        // Fetch active forms count (forms owned by user)
        const { count: formsCount } = await supabase
          .from('forms')
          .select('*', { count: 'exact', head: true })
          .eq('owner_uid', user.id);

        // Fetch responses with sentiment data (if available)
        const { data: responsesWithSentiment } = await supabase
          .from('form_responses')
          .select('parsed_fields')
          .not('response_text', 'eq', 'processing…')
          .not('parsed_fields', 'is', null);

        // Calculate average sentiment if available
        let avgSentiment = '--';
        if (responsesWithSentiment && responsesWithSentiment.length > 0) {
          const sentiments = responsesWithSentiment
            .map(r => r.parsed_fields?.sentiment)
            .filter(s => s !== null && s !== undefined);
          
          if (sentiments.length > 0) {
            const sentimentMap: Record<string, number> = {
              'positive': 1,
              'neutral': 0,
              'negative': -1
            };
            
            const sum = sentiments.reduce((acc, s) => {
              return acc + (sentimentMap[String(s).toLowerCase()] ?? 0);
            }, 0);
            
            const avg = sum / sentiments.length;
            if (avg > 0.3) avgSentiment = 'Positive';
            else if (avg < -0.3) avgSentiment = 'Negative';
            else avgSentiment = 'Neutral';
          }
        }

        setStats({
          totalResponses: responsesCount || 0,
          activeForms: formsCount || 0,
          avgSentiment,
          isLoading: false
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, [user, supabase]);

  if (stats.isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalResponses}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalResponses === 0 ? 'No responses yet' : 'Across all forms'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Forms</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeForms}</div>
          <p className="text-xs text-muted-foreground">
            {stats.activeForms === 0 ? 'No active forms' : 'Ready to collect feedback'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Sentiment</CardTitle>
          <Smile className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgSentiment}</div>
          <p className="text-xs text-muted-foreground">
            {stats.avgSentiment === '--' ? 'Not enough data' : 'Overall feedback sentiment'}
          </p>
        </CardContent>
      </Card>
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
          <DashboardStats />
          <RecentForms />
        </div>
      </main>
    </div>
  );
}
