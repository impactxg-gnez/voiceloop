import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export default function NewFormPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-6 border-b bg-card">
         <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">Create New Form</h1>
        </div>
        <Button>Publish</Button>
      </header>
      <main className="p-6 flex-1 overflow-auto">
        <div className="border rounded-lg p-12 text-center">
          <h2 className="text-xl font-semibold">Form Builder Coming Soon</h2>
          <p className="text-muted-foreground mt-2">This is where you'll build your awesome voice-enabled forms.</p>
        </div>
      </main>
    </div>
  );
}
