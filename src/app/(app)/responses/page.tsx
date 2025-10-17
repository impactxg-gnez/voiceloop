import { SidebarTrigger } from "@/components/ui/sidebar";

export default function ResponsesPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center p-6 border-b bg-card">
         <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">Responses</h1>
        </div>
      </header>
      <main className="p-6 flex-1 overflow-auto">
        <div className="border rounded-lg p-12 text-center">
          <h2 className="text-xl font-semibold">No responses yet</h2>
          <p className="text-muted-foreground mt-2">Share your forms to start collecting responses.</p>
        </div>
      </main>
    </div>
  );
}
