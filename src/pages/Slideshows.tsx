import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Film, Loader2, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const Slideshows = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("slideshows").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("ss-rt").on("postgres_changes", { event: "*", schema: "public", table: "slideshows", filter: `user_id=eq.${user.id}` }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const remove = async (id: string) => {
    if (!confirm("Delete this slideshow?")) return;
    await supabase.from("slideshows").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success("Deleted");
  };

  return (
    <>
      <SEO title="Slideshows" description="Your generated TikTok ad slideshows." />
      <div className="container py-8">
        <header className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold">Slideshows</h1>
            <p className="text-muted-foreground">Every ad you've generated.</p>
          </div>
          <Button asChild className="shadow-glow"><Link to="/slideshows/new"><Plus className="h-4 w-4" /> New slideshow</Link></Button>
        </header>

        {loading ? (
          <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center">
            <Film className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-display text-xl font-bold mb-2">No slideshows yet</h3>
            <p className="text-muted-foreground mb-6">Pick some product images and let AI write your first ad.</p>
            <Button asChild><Link to="/slideshows/new"><Plus className="h-4 w-4" /> Create your first</Link></Button>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(s => (
              <Card key={s.id} className="p-5 shadow-card flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold truncate">{s.title}</h3>
                    <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-xs text-muted-foreground">{(s.slides as any[])?.length || 0} slides · {(s.image_ids || []).length} images</p>
                <div className="flex gap-2 mt-auto">
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <Link to={`/slideshows/${s.id}/edit`}><Pencil className="h-3 w-3" /> Open</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    generating: "bg-accent/20 text-accent-foreground",
    ready: "bg-success/20 text-success",
    failed: "bg-destructive/20 text-destructive",
  };
  return <Badge className={map[status] || ""}>{status}</Badge>;
}

export default Slideshows;
