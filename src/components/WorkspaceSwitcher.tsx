import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, Plus, Settings } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";

export function WorkspaceSwitcher() {
  const { workspaces, current, setCurrentId } = useWorkspace();
  const { plan } = usePlanLimits();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const cap = plan === "pro" ? 5 : plan === "starter" ? 1 : 1;
  const atCap = workspaces.length >= cap;

  if (collapsed) {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="h-8 w-8 rounded-md bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
          {current?.name?.charAt(0).toUpperCase() || "A"}
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-2 h-auto py-2 text-sidebar-foreground hover:bg-sidebar-accent">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-md bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
              {current?.name?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-semibold truncate">{current?.name || "No workspace"}</p>
              <p className="text-[10px] uppercase tracking-wide text-sidebar-foreground/60">{plan} plan</p>
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((w) => (
          <DropdownMenuItem key={w.id} onClick={() => setCurrentId(w.id)} className="flex items-center justify-between">
            <span className="truncate">{w.name}</span>
            {current?.id === w.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {current && (
          <DropdownMenuItem onClick={() => navigate("/workspaces/settings")}>
            <Settings className="h-4 w-4 mr-2" /> Workspace settings
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          disabled={atCap}
          onClick={() => { if (!atCap) navigate("/workspaces/new"); }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {atCap ? `Cap reached (${cap}) — upgrade` : "New workspace"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
