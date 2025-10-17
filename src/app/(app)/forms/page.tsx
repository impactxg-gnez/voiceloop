'use client';

import { useCollection, useFirestore, useUser } from "@/firebase";
import { useMemoFirebase } from "@/firebase/provider";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { FileText, PlusCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { collection, query, where, orderBy } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";

type Form = {
  id: string;
  title: string;
  questionCount: number;
  createdAt: { toDate: () => Date };
};

export default function FormsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const formsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "forms"),
      where("ownerUid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [firestore, user]);

  const { data: forms, isLoading } = useCollection<Form>(formsQuery);

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
                    <span>{form.questionCount || 0} questions</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {formatDistanceToNow(form.createdAt.toDate(), { addSuffix: true })}
                  </p>
                </div>
                <div className="p-4 border-t flex justify-end">
                   <Button asChild variant="outline" size="sm">
                    <Link href={`/forms/record/${form.id}`}>
                      View Form <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
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
