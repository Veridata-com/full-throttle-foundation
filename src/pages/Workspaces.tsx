import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Layers, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";

const Workspaces = () => {
  const { user } = useAuth();
  const { workspaces, current, setCurrentId, refresh } = useWorkspace();
  const { plan } = usePlanLimits();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, { images: number; slideshows: number }>>({});
  const [loading, setLoading] = useState(true);

  const cap = plan === "pro" ? 5 : 1;
  const atCap = workspaces.length >= cap;

  useEffect(() => {
    (async () => {
      if (!user) return;
      const map: Record<string, { images: number; slideshows: number }> = {};
      await Promise.all(workspaces.map(async (w) => {
        const [imgs, ss] = await Promise.all([
          supabase.from("images").select("id", { count: "exact", head: true }).eq("workspace_id", w.id),
          supabase.from("slideshows").select("id", { count: "exact", head: true }).eq("workspace_id", w.id),
        ]);
        map[w.id] = { images: imgs.count || 0, slideshows: ss.count || 0 };
      }));
      setCounts(map);
      setLoading(false);
    })();
  }, [workspaces, user]);

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and ALL its images and slideshows? This cannot be undone.`)) return;
    const { error } = await supabase.from("workspaces").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Workspace deleted");
    await refresh();
  };

  return (
    <>
      <SEO title="Workspaces" description="Manage your AdRise workspaces." />
      <div className="container py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Workspaces</h1>
            <p className="text-muted-foreground text-sm">{workspaces.length} of {cap} on the {plan} plan</p>
          </div>
          <Button onClick={() => atCap ? navigate("/billing") : navigate("/workspaces/new")}>
            <Plus className="h-4 w-4" /> {atCap ? "Upgrade for more" : "New workspace"}
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-3">
            {workspaces.map((w) => (
              <Card key={w.id} className="p-5 shadow-card flex items-center gap-4 flex-wrap">
                <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground">
                  {w.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{w.name}</h3>
                    {current?.id === w.id && <Badge>Active</Badge>}
                  </div>
                  {w.tagline && <p className="text-xs text-muted-foreground truncate">{w.tagline}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {counts[w.id]?.images || 0} images · {counts[w.id]?.slideshows || 0} slideshows
                  </p>
                </div>
                <div className="flex gap-2">
                  {current?.id !== w.id && (
                    <Button size="sm" variant="outline" onClick={() => setCurrentId(w.id)}>
                      <Layers className="h-3.5 w-3.5" /> Switch
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { setCurrentId(w.id); navigate("/workspaces/settings"); }}>
                    <Settings className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(w.id, w.name)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Workspaces;
