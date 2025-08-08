import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTheme } from "@/hooks/useTheme";

export default function Preferences() {
  const [open, setOpen] = useLocalStorage<boolean>("nk:sidebar-open", true);
  const { toggle } = useTheme();

  useEffect(()=>{ document.title = "Settings | Nathkrupa"; },[]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">User Preferences</h1>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={toggle}>Toggle Theme</Button>
        <Button onClick={()=>setOpen(!open)}>{open ? 'Collapse' : 'Expand'} Sidebar</Button>
      </div>
      <p className="text-sm text-muted-foreground">Preferences are saved in your browser.</p>
    </section>
  );
}
