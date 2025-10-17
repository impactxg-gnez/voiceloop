import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export default function FormsPage() {
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
        <div className="border rounded-lg p-12 text-center">
            <h2 className="text-xl font-semibold">No forms yet</h2>
            <p className="text-muted-foreground mt-2">Click "New Form" to get started.</p>
        </div>
      </main>
    </div>
  );
}
